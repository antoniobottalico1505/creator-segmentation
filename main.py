from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, field_validator
from typing import Dict, Any, Literal, List
import uuid
import os
import smtplib
import stripe
from email.message import EmailMessage

# =======================
# CONFIG SMTP DA ENV VARS
# =======================
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

# mittente tecnico: account con cui fai LOGIN su Gmail
SMTP_SENDER = os.getenv("SMTP_SENDER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
CONTACT_RECIPIENT = os.getenv("CONTACT_RECIPIENT")
# =======================

# =======================
# CONFIG STRIPE (PAGAMENTI)
# =======================

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

if stripe and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
# =======================

app = FastAPI(title="ForCreators App")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # per iniziare: accetta da ovunque. Poi potrai limitarlo.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")

# =======================
# TIPI SEGMENTO / PIANO
# =======================

SegmentType = Literal["casual", "emerging", "pro", "agency"]
# Piano pagato dall'utente (non per forza uguale al segmento attuale)
PlanType = Literal["free", "emerging", "pro", "agency"]

# Quale piano minimo serve per ogni segmento
SEGMENT_TO_PLAN: Dict[SegmentType, PlanType] = {
    "casual": "free",
    "emerging": "emerging",
    "pro": "pro",
    "agency": "agency",
}

# Ordine "a salire" dei piani
PLAN_ORDER: Dict[PlanType, int] = {
    "free": 0,
    "emerging": 1,
    "pro": 2,
    "agency": 3,
}


# =======================
# MODELLI
# =======================

class SignupRequest(BaseModel):
    email: str
    password: str
    main_platform: str
    username: str
    followers: int
    profiles_count: int = 1

    @field_validator("followers")
    @classmethod
    def validate_followers(cls, v: int) -> int:
        if v < 0:
            raise ValueError("followers must be >= 0")
        return v

    @field_validator("profiles_count")
    @classmethod
    def validate_profiles_count(cls, v: int) -> int:
        if v < 1:
            raise ValueError("profiles_count must be >= 1")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class ContactRequest(BaseModel):
    name: str
    email: str
    subject: str
    message: str

    @field_validator("name", "email", "subject", "message")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("campo obbligatorio")
        return v.strip()


class PlanUpdateRequest(BaseModel):
    user_id: str
    new_plan: PlanType


class User(BaseModel):
    user_id: str
    email: str
    password: str
    main_platform: str
    username: str
    followers: int
    profiles_count: int
    segment: SegmentType
    plan: Dict[str, Any]
    # flag premium dopo pagamento (qualsiasi piano ≠ free)
    is_premium: bool = False
    # piano pagato attuale (serve per la “regola d’oro” sui prezzi)
    paid_plan: PlanType = "free"


# richiesta per creare la sessione di pagamento (se usi l’endpoint API, non i Payment Link)
class CheckoutRequest(BaseModel):
    user_id: str
    # es. "monthly" / "yearly" per gestire poi i prezzi
    billing_period: Literal["monthly", "yearly"] = "monthly"


# =======================
# DB IN RAM
# =======================

users_db: Dict[str, User] = {}
email_index: Dict[str, str] = {}
contacts_db: List[Dict[str, Any]] = []


# =======================
# LOGICA SEGMENTO / PIANO
# =======================

def compute_segment(followers: int, profiles_count: int) -> SegmentType:
    if profiles_count > 1 or followers >= 200_000:
        return "agency"
    if followers < 2_000:
        return "casual"
    if followers < 10_000:
        return "emerging"
    if followers < 200_000:
        return "pro"
    return "agency"


def compute_plan(segment: SegmentType, profiles_count: int) -> Dict[str, Any]:
    if segment == "casual":
        return {
            "label": "Casual – profilo per sport",
            "description": "Per chi usa i social “per sport” e vuole una base di prezzo minima per le prime collaborazioni.",
            "monthly_price": 0.0,
            "yearly_price": 0.0,
            "billing_note": "Piano gratuito per profili sotto i 2.000 follower.",
        }

    if segment == "emerging":
        return {
            "label": "Emergente – primi brand",
            "description": "Per chi inizia a ricevere proposte da brand e vuole una struttura prezzi sensata.",
            "monthly_price": 4.90,
            "yearly_price": 49.00,
            "billing_note": "Puoi scegliere mensile (4,90€) o annuale (49€, 2 mesi gratis).",
        }

    if segment == "pro":
        return {
            "label": "Creator Pro – collaborazioni strutturate",
            "description": "Per creator che lavorano con più brand e vogliono media kit e prezzi chiari.",
            "monthly_price": 9.90,
            "yearly_price": 99.00,
            "billing_note": "Pensato per chi vive (o quasi) di contenuti.",
        }

    # AGENZIA
    if profiles_count <= 2:
        monthly = 99.0
        note = "Fino a 2 profili gestiti."
    elif profiles_count == 3:
        monthly = 199.0
        note = "Fino a 3 profili gestiti."
    elif profiles_count == 4:
        monthly = 299.0
        note = "Fino a 4 profili gestiti."
    else:
        monthly = 399.0
        note = "Da 5 profili in su."

    return {
        "label": "Top Agenzia – multi profilo",
        "description": "Per agenzie, network e team che gestiscono più profili importanti.",
        "monthly_price": monthly,
        "yearly_price": None,
        "billing_note": f"Piano agenzia: {note}",
    }


def compute_media_kit(user: User) -> Dict[str, Any]:
    followers = max(0, user.followers)
    segment = user.segment or "casual"
    platform = (user.main_platform or "instagram").lower()

    # VIEW-RATE base per segmento (Instagram)
    if segment == "casual":
        base_post_rate = 0.25
        base_story_rate = 0.08
    elif segment == "emerging":
        base_post_rate = 0.20
        base_story_rate = 0.05
    elif segment == "pro":
        base_post_rate = 0.12
        base_story_rate = 0.03
    else:  # agency
        base_post_rate = 0.10
        base_story_rate = 0.02

    # Moltiplicatori piattaforma
    view_multipliers = {
        "instagram": 1.0,
        "tiktok": 1.4,
        "youtube": 2.5,
        "twitch": 1.0,
    }
    view_mult = view_multipliers.get(platform, 1.0)

    post_views = int(followers * base_post_rate * view_mult)
    story_views = int(followers * base_story_rate * view_mult)

    # Prezzi esatti per post / story / bundle
    base_rate_per_1k = {
        "instagram": 10.0,
        "tiktok": 9.0,
        "youtube": 20.0,
        "twitch": 10.0,
    }
    rate_per_1k = base_rate_per_1k.get(platform, 10.0)

    post_price_eur = (followers / 1000.0) * rate_per_1k
    if post_price_eur < 5.0:
        post_price_eur = 5.0
    post_price_eur = round(post_price_eur, 2)

    story_price_eur = post_price_eur * 0.5
    if story_price_eur < 3.0:
        story_price_eur = 3.0
    story_price_eur = round(story_price_eur, 2)

    full_bundle = post_price_eur + 3 * story_price_eur
    bundle_price_eur = round(full_bundle * 0.8, 2)

    segment_label_map = {
        "casual": 'Casual – profilo "sport"',
        "emerging": "Emergente – primi brand",
        "pro": "Creator Pro – collaborazioni strutturate",
        "agency": "Top Agenzia – multi profilo",
    }

    return {
        "username": user.username,
        "main_platform": user.main_platform,
        "segment": segment,
        "segment_label": segment_label_map.get(segment, segment),
        "followers": followers,
        "estimated": {
            "post_avg_views": post_views,
            "story_avg_views": story_views,
        },
        "suggested_rates_eur": {
            "single_post": post_price_eur,
            "single_story": story_price_eur,
            "bundle_post_3stories": bundle_price_eur,
        },
    }


def compute_profile_tips(user: User) -> Dict[str, Any]:
    segment = user.segment
    followers = user.followers

    if segment == "casual":
        level = "Casual – base"
        summary = (
            "Stai usando i social in modo leggero. Con pochi aggiustamenti puoi diventare un profilo Emergente "
            "e rendere più interessanti eventuali collaborazioni."
        )
        tips = [
            "Sistema la bio in 2–3 righe: chi sei, cosa pubblichi e una call-to-action (es. link o contatto).",
            "Scegli 1–2 temi principali (es. fitness, moda low cost) invece di parlare di tutto.",
            "Pubblica con costanza: anche solo 2–3 contenuti a settimana ma regolari.",
            "Attiva le stories in evidenza con 3 categorie chiare (es. “Chi sono”, “Best post”, “Collab”).",
            "Rispondi ai commenti: aumenta l’engagement, anche con pochi follower.",
        ]
    elif segment == "emerging":
        level = "Emergente – in crescita"
        summary = (
            "Hai abbastanza follower per iniziare a lavorare con brand. Ora conta dimostrare numeri stabili e un profilo pulito."
        )
        tips = [
            "Mantieni una frequenza di pubblicazione regolare (es. 3 post a settimana + stories quasi giornaliere).",
            "In ogni collaborazione, chiedi feedback al brand e tieni traccia di risultati (reach, click, vendite).",
            "Crea un mini media kit PDF oltre a quello generato qui, con 3 screenshot di insight aggiornati.",
            "Fissa 1–2 prezzi base (post + stories) e aggiungi extra per contenuti complessi.",
            "Sfrutta i contenuti che performano meglio replicando format, hook e stile visivo.",
        ]
    elif segment == "pro":
        level = "Creator Pro – strutturato"
        summary = (
            "Sei nella fascia professionale: qui conta la percezione di affidabilità e la chiarezza delle tue offerte."
        )
        tips = [
            "Definisci pacchetti chiari (es. 1 post + 3 stories + UGC raw) con prezzi diversi per brand piccoli e grandi.",
            "Mantieni aggiornati gli highlight per mostrare solo lavori recenti e coerenti con la tua nicchia.",
            "Tieni uno storico delle campagne con risultati principali per negoziare meglio le prossime fee.",
            "Prepara una pagina o link dedicato ai brand (portfolio, media kit, contatti).",
            "Stabilisci un minimo sotto il quale non scendi per preservare il posizionamento.",
        ]
    else:
        level = "Top / Agenzia – multi profilo"
        summary = (
            "Gestisci più profili o numeri importanti. Qui vince chi dimostra organizzazione, reportistica e scalabilità."
        )
        tips = [
            "Organizza i profili in fasce (Casual, Emerging, Pro) e prepara listini diversi per ogni segmento.",
            "Centralizza la comunicazione con i brand (un’unica mail tipo collab@forcreators.app o simile).",
            "Invia report semplici ma chiari dopo ogni campagna: reach, click, salvataggi, vendite se disponibili.",
            "Definisci un minimo di spesa per campagna per evitare micro-task poco profittevoli.",
            "Prepara casi studio con prima/dopo per i brand migliori che hai gestito.",
        ]

    return {
        "level": level,
        "summary": summary,
        "tips": tips,
        "followers": followers,
        "segment": segment,
    }


# =======================
# RESEND (EMAIL CONTATTI)
# =======================

import httpx

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM = os.getenv(
    "RESEND_FROM",
    "ForCreators <no-reply@forcreators.vip>",
)
CONTACT_RECIPIENT = os.getenv(
    "CONTACT_RECIPIENT",
    "we20trust25@gmail.com",
)


async def send_contact_email(record: Dict[str, Any]) -> None:
    """
    Invia una mail tramite Resend con i dati del form contatti.
    """
    if not RESEND_API_KEY:
        print("⚠️ RESEND_API_KEY mancante: nessuna mail inviata.")
        return

    user_email = (record.get("email") or "").strip()

    body_lines = [
        "Hai ricevuto un nuovo messaggio dal form Contatti di ForCreators:",
        "",
        f"Nome: {record.get('name', '')}",
        f"Email: {user_email}",
        f"Oggetto: {record.get('subject', '')}",
        "",
        "Messaggio:",
        record.get("message", ""),
    ]
    text_body = "\n".join(body_lines)

    payload = {
        "from": RESEND_FROM,
        "to": [CONTACT_RECIPIENT],
        "subject": f"[ForCreators] Nuovo contatto: {record.get('subject', '')}",
        "text": text_body,
    }

    if user_email:
        payload["reply_to"] = user_email

    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.resend.com/emails",
            json=payload,
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            timeout=10.0,
        )
        print("RESEND STATUS:", r.status_code, r.text)
        r.raise_for_status()


# =======================
# PAGINE HTML
# =======================

@app.get("/", response_class=HTMLResponse)
async def index_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/pricing", response_class=HTMLResponse)
async def pricing_page(request: Request):
    return templates.TemplateResponse("pricing.html", {"request": request})


@app.get("/come-funziona", response_class=HTMLResponse)
async def how_it_works_page(request: Request):
    return templates.TemplateResponse("how_it_works.html", {"request": request})


@app.get("/per-brand", response_class=HTMLResponse)
async def for_brands_page(request: Request):
    return templates.TemplateResponse("for_brands.html", {"request": request})


@app.get("/faq", response_class=HTMLResponse)
async def faq_page(request: Request):
    return templates.TemplateResponse("faq.html", {"request": request})


@app.get("/contatti", response_class=HTMLResponse)
async def contact_page(request: Request):
    return templates.TemplateResponse("contact.html", {"request": request})


# =======================
# API USER / MEDIA KIT
# =======================

@app.post("/api/signup")
async def api_signup(payload: SignupRequest):
    if payload.email in email_index:
        raise HTTPException(status_code=400, detail="Email già registrata.")

    segment = compute_segment(payload.followers, payload.profiles_count)
    plan = compute_plan(segment, payload.profiles_count)

    user_id = str(uuid.uuid4())
    user = User(
        user_id=user_id,
        email=payload.email,
        password=payload.password,
        main_platform=payload.main_platform,
        username=payload.username,
        followers=payload.followers,
        profiles_count=payload.profiles_count,
        segment=segment,
        plan=plan,
        is_premium=False,  # diventa True dopo pagamento
        paid_plan="free",
    )

    users_db[user_id] = user
    email_index[payload.email] = user_id

    return {"user_id": user_id}


@app.post("/api/login")
async def api_login(payload: LoginRequest):
    if payload.email not in email_index:
        raise HTTPException(status_code=400, detail="Credenziali non valide.")

    user_id = email_index[payload.email]
    user = users_db.get(user_id)
    if not user or user.password != payload.password:
        raise HTTPException(status_code=400, detail="Credenziali non valide.")

    return {"user_id": user_id}


@app.get("/api/user")
async def api_get_user(user_id: str):
    user = users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato.")

    data = user.model_dump()
    data.pop("password", None)
    return data


@app.get("/api/media-kit")
async def api_media_kit(user_id: str):
    user = users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato.")

    kit = compute_media_kit(user)

    # -------------------------
    # REGOLA D'ORO:
    # - Casual => sempre tutto sbloccato (piano FREE basta)
    # - Emerging => servono almeno 4,90€ (piano "emerging")
    # - Pro      => servono almeno 9,90€ (piano "pro")
    # - Agency   => servono piani agenzia
    # -------------------------
    required_plan = SEGMENT_TO_PLAN[user.segment]
    current_plan = user.paid_plan

    if PLAN_ORDER.get(current_plan, 0) < PLAN_ORDER[required_plan]:
        # piano pagato TROPPO BASSO => niente prezzi precisi
        kit["locked"] = True
        kit["locked_reason"] = (
            "Per vedere i prezzi precisi per questo segmento attiva il piano "
            f"{required_plan} dalla pagina Pricing."
        )

        # Lasciamo le views, ma oscuriamo i prezzi
        sr = kit.get("suggested_rates_eur") or {}
        sr["single_post"] = "LOCKED"
        sr["single_story"] = "LOCKED"
        sr["bundle_post_3stories"] = "LOCKED"
        kit["suggested_rates_eur"] = sr
    else:
        kit["locked"] = False

    return kit


@app.get("/api/profile-tips")
async def api_profile_tips(user_id: str):
    """
    Consigli profilo:
    - GRATIS per segment 'casual'
    - Per 'emerging', 'pro', 'agency' serve is_premium = True
    """
    user = users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato.")

    if user.segment != "casual" and not user.is_premium:
        raise HTTPException(
            status_code=402,
            detail="I consigli avanzati sul profilo sono disponibili solo dopo l’attivazione del piano a pagamento.",
        )

    tips = compute_profile_tips(user)
    return tips


@app.post("/api/contact")
async def api_contact(payload: ContactRequest):
    contact_id = str(uuid.uuid4())
    record = payload.model_dump()
    record["contact_id"] = contact_id
    contacts_db.append(record)

    try:
        await send_contact_email(record)
    except Exception as e:
        print("❌ Errore invio email contatto:", repr(e))

    return {"contact_id": contact_id, "status": "received"}


# =======================
# PAGAMENTI STRIPE
# =======================

@app.post("/api/create-checkout-session")
async def create_checkout_session(payload: CheckoutRequest):
    """
    Crea una sessione di pagamento Stripe per sbloccare il piano premium dell'utente.
    (Opzionale se usi i Payment Link, ma la lasciamo pronta.)
    """
    if stripe is None:
        raise HTTPException(status_code=500, detail="Stripe non è installato sul server.")
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Pagamenti non configurati lato server.")

    user = users_db.get(payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato.")

    # PREZZO da usare lato Stripe (puoi cambiare le cifre)
    plan = user.plan
    if payload.billing_period == "monthly":
        amount_eur = plan.get("monthly_price", 0.0)
        description = f"ForCreators {user.segment} – piano mensile"
    else:
        amount_eur = plan.get("yearly_price", 0.0) or plan.get("monthly_price", 0.0) * 10
        description = f"ForCreators {user.segment} – piano annuale"

    # Stripe lavora in centesimi
    amount_cents = int(round(amount_eur * 100))

    if amount_cents <= 0:
        raise HTTPException(status_code=400, detail="Nessun importo valido per il tuo piano.")

    # Cambia con il tuo dominio reale
    success_url = "https://forcreators.vip/checkout-success"
    cancel_url = "https://forcreators.vip/checkout-cancel"

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",  # pagamento singolo (non abbonamento ricorrente)
            line_items=[
                {
                    "price_data": {
                        "currency": "eur",
                        "product_data": {"name": description},
                        "unit_amount": amount_cents,
                    },
                    "quantity": 1,
                }
            ],
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
            metadata={
                "user_id": user.user_id,
                "segment": user.segment,
                "billing_period": payload.billing_period,
            },
        )
    except Exception as e:
        print("❌ Errore creazione checkout Stripe:", repr(e))
        raise HTTPException(
            status_code=500,
            detail="Errore nella creazione della sessione di pagamento.",
        )

    return {"checkout_url": session.url}


def infer_paid_plan_from_amount(amount_cents: int, user: User) -> PlanType:
    """
    Regola molto semplice per capire che piano ha pagato l'utente in base all'importo.
    Funziona sia per Payment Link che per checkout creati via API,
    e ci basta distinguere free / emerging / pro / agency.
    """
    if amount_cents <= 0:
        return "free"

    # Emerging: 4,90€/mese o 49€/anno
    if amount_cents in (490, 4900):
        return "emerging"

    # Pro: 9,90€/mese o 99€/anno (quando l'utente è segmento <= pro)
    if amount_cents in (990, 9900):
        # Se il segmento attuale è agency e sta pagando 99,
        # lo consideriamo piano agenzia base (fino a 2 profili).
        if user.segment == "agency":
            return "agency"
        return "pro"

    # Agenzia: 199 / 299 / 399
    if amount_cents in (19900, 29900, 39900):
        return "agency"

    # Fallback: piano richiesto dal segmento
    return SEGMENT_TO_PLAN.get(user.segment, "free")


@app.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """
    Webhook Stripe:
    - ascolta gli eventi
    - quando riceve checkout.session.completed → setta user.is_premium = True
      e aggiorna user.paid_plan in base all'importo pagato.
    Funziona sia con Payment Link (buy.stripe.com) sia con checkout creati via API.
    """
    if stripe is None:
        raise HTTPException(status_code=500, detail="Stripe non è installato sul server.")
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook Stripe non configurato.")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Payload non valido.")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Firma webhook non valida.")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        # 1) Identifichiamo l'utente dalla mail usata su Stripe
        customer_email = None
        details = session.get("customer_details") or {}
        if details:
            customer_email = (details.get("email") or "").strip()

        if not customer_email:
            customer_email = (session.get("customer_email") or "").strip()

        if customer_email and customer_email in email_index:
            user_id = email_index[customer_email]
            user = users_db.get(user_id)
            if user:
                # 2) Capire quanto ha pagato
                amount_total = session.get("amount_total") or 0
                try:
                    amount_total = int(amount_total)
                except (TypeError, ValueError):
                    amount_total = 0

                # 3) Inferire che piano ha pagato
                new_plan = infer_paid_plan_from_amount(amount_total, user)

                user.is_premium = new_plan != "free"
                user.paid_plan = new_plan
                users_db[user_id] = user
                print(f"✅ Utente {user.email} marcato come PREMIUM, piano {user.paid_plan}")
        else:
            print("⚠️ checkout.session.completed senza email nota, nessun utente aggiornato.")

    return {"status": "ok"}


@app.post("/api/update-plan")
async def api_update_plan(payload: PlanUpdateRequest):
    """
    Aggiorna il piano pagato dell'utente.
    Questo lo userai se vuoi cambiare manualmente il piano da una dashboard/admin.
    """
    user = users_db.get(payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato.")

    user.paid_plan = payload.new_plan
    user.is_premium = payload.new_plan != "free"
    users_db[user.user_id] = user
    return {"user_id": user.user_id, "paid_plan": user.paid_plan}
