from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
from typing import Dict, Any, Literal, List, Optional
import uuid
import os
from datetime import datetime, timezone
from contextlib import contextmanager

import httpx

# Stripe
try:
    import stripe
except ModuleNotFoundError:
    stripe = None

# SQLAlchemy
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    Text,
    JSON,
    select,
)
from sqlalchemy.orm import declarative_base, sessionmaker


# =======================
# ENV
# =======================
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./local.db"

# Render a volte dà "postgres://". SQLAlchemy vuole "postgresql://"
DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://")

# ✅ Forza driver psycopg (v3) invece di psycopg2
if DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# (opzionale) se per sbaglio hai salvato psycopg2 da qualche parte:
DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql+psycopg://")

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# (OPZIONALE ma consigliato) mapping robusto per Price ID Stripe
STRIPE_PRICE_EMERGING_MONTHLY = os.getenv("STRIPE_PRICE_EMERGING_MONTHLY", "")
STRIPE_PRICE_EMERGING_YEARLY = os.getenv("STRIPE_PRICE_EMERGING_YEARLY", "")
STRIPE_PRICE_PRO_MONTHLY = os.getenv("STRIPE_PRICE_PRO_MONTHLY", "")
STRIPE_PRICE_PRO_YEARLY = os.getenv("STRIPE_PRICE_PRO_YEARLY", "")
STRIPE_PRICE_AGENCY_2 = os.getenv("STRIPE_PRICE_AGENCY_2", "")
STRIPE_PRICE_AGENCY_3 = os.getenv("STRIPE_PRICE_AGENCY_3", "")
STRIPE_PRICE_AGENCY_4 = os.getenv("STRIPE_PRICE_AGENCY_4", "")
STRIPE_PRICE_AGENCY_5PLUS = os.getenv("STRIPE_PRICE_AGENCY_5PLUS", "")

PRICE_ID_TO_PLAN: Dict[str, str] = {
    STRIPE_PRICE_EMERGING_MONTHLY: "emerging",
    STRIPE_PRICE_EMERGING_YEARLY: "emerging",
    STRIPE_PRICE_PRO_MONTHLY: "pro",
    STRIPE_PRICE_PRO_YEARLY: "pro",
    STRIPE_PRICE_AGENCY_2: "agency",
    STRIPE_PRICE_AGENCY_3: "agency",
    STRIPE_PRICE_AGENCY_4: "agency",
    STRIPE_PRICE_AGENCY_5PLUS: "agency",
}
# ripulisci chiavi vuote
PRICE_ID_TO_PLAN = {k: v for k, v in PRICE_ID_TO_PLAN.items() if k}


# =======================
# APP
# =======================
app = FastAPI(title="ForCreators App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # poi limita al tuo dominio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static (safe)
if os.path.isdir("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

# Stripe init
if stripe and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


# =======================
# DB
# =======================
Base = declarative_base()

class UserRow(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)  # (nota: meglio hashare, ma non cambio ora)
    main_platform = Column(String, nullable=False)
    username = Column(String, nullable=False)
    followers = Column(Integer, nullable=False, default=0)
    profiles_count = Column(Integer, nullable=False, default=1)

    segment = Column(String, nullable=False)
    plan = Column(JSON, nullable=False)

    is_premium = Column(Boolean, nullable=False, default=False)
    paid_plan = Column(String, nullable=False, default="free")

    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

class ContactRow(Base):
    __tablename__ = "contacts"

    contact_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


# Engine/session
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, echo=False, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

Base.metadata.create_all(bind=engine)

@contextmanager
def db():
    s = SessionLocal()
    try:
        yield s
        s.commit()
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()


# =======================
# TIPI SEGMENTO / PIANO
# =======================
SegmentType = Literal["casual", "emerging", "pro", "agency"]
PlanType = Literal["free", "emerging", "pro", "agency"]

SEGMENT_TO_PLAN: Dict[SegmentType, PlanType] = {
    "casual": "free",
    "emerging": "emerging",
    "pro": "pro",
    "agency": "agency",
}

PLAN_ORDER: Dict[PlanType, int] = {
    "free": 0,
    "emerging": 1,
    "pro": 2,
    "agency": 3,
}


# =======================
# MODELLI API
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

class CheckoutRequest(BaseModel):
    user_id: str
    billing_period: Literal["monthly", "yearly"] = "monthly"


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


def compute_media_kit(user: UserRow) -> Dict[str, Any]:
    followers = max(0, int(user.followers or 0))
    segment = (user.segment or "casual")
    platform = (user.main_platform or "instagram").lower()

    if segment == "casual":
        base_post_rate = 0.25
        base_story_rate = 0.08
    elif segment == "emerging":
        base_post_rate = 0.20
        base_story_rate = 0.05
    elif segment == "pro":
        base_post_rate = 0.12
        base_story_rate = 0.03
    else:
        base_post_rate = 0.10
        base_story_rate = 0.02

    view_multipliers = {"instagram": 1.0, "tiktok": 1.4, "youtube": 2.5, "twitch": 1.0}
    view_mult = view_multipliers.get(platform, 1.0)

    post_views = int(followers * base_post_rate * view_mult)
    story_views = int(followers * base_story_rate * view_mult)

    base_rate_per_1k = {"instagram": 10.0, "tiktok": 9.0, "youtube": 20.0, "twitch": 10.0}
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
        "estimated": {"post_avg_views": post_views, "story_avg_views": story_views},
        "suggested_rates_eur": {
            "single_post": post_price_eur,
            "single_story": story_price_eur,
            "bundle_post_3stories": bundle_price_eur,
        },
    }


def compute_profile_tips(user: UserRow) -> Dict[str, Any]:
    segment = user.segment
    followers = int(user.followers or 0)

    if segment == "casual":
        level = "Casual – base"
        summary = (
            "Stai usando i social in modo leggero. Con pochi aggiustamenti puoi diventare un profilo Emergente."
        )
        tips = [
            "Sistema la bio in 2–3 righe: chi sei, cosa pubblichi e call-to-action.",
            "Scegli 1–2 temi principali invece di parlare di tutto.",
            "Pubblica con costanza: 2–3 contenuti a settimana ma regolari.",
            "Attiva stories in evidenza con 3 categorie chiare.",
            "Rispondi ai commenti: aumenta l’engagement.",
        ]
    elif segment == "emerging":
        level = "Emergente – in crescita"
        summary = "Hai abbastanza follower per iniziare a lavorare con brand. Conta la stabilità e un profilo pulito."
        tips = [
            "Frequenza regolare (es. 3 post/sett + stories quasi giornaliere).",
            "Tieni traccia risultati (reach, click, vendite).",
            "Crea mini media kit con screenshot insight aggiornati.",
            "Fissa prezzi base e extra per lavori complessi.",
            "Replica i format che performano meglio.",
        ]
    elif segment == "pro":
        level = "Creator Pro – strutturato"
        summary = "Qui conta affidabilità, offerta chiara e posizionamento."
        tips = [
            "Pacchetti chiari (post + stories + UGC) con prezzi diversi per brand piccoli/grandi.",
            "Highlight puliti con lavori recenti e coerenti.",
            "Storico campagne con risultati principali per negoziare.",
            "Pagina/link dedicato ai brand (portfolio, media kit, contatti).",
            "Minimo sotto cui non scendi.",
        ]
    else:
        level = "Top / Agenzia – multi profilo"
        summary = "Vince chi dimostra organizzazione, reportistica e scalabilità."
        tips = [
            "Fasce profili e listini diversi per segmento.",
            "Centralizza comunicazione (una mail unica).",
            "Report dopo campagna: reach, click, salvataggi, vendite se ci sono.",
            "Minimo spesa per campagna per evitare micro-task.",
            "Casi studio prima/dopo per i brand migliori.",
        ]

    return {"level": level, "summary": summary, "tips": tips, "followers": followers, "segment": segment}


# =======================
# RESEND (EMAIL CONTATTI)
# =======================
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM = os.getenv("RESEND_FROM", "ForCreators <no-reply@forcreators.vip>")
CONTACT_RECIPIENT = os.getenv("CONTACT_RECIPIENT", "we20trust25@gmail.com")

async def send_contact_email(record: Dict[str, Any]) -> None:
    if not RESEND_API_KEY:
        print("⚠️ RESEND_API_KEY mancante: nessuna mail inviata.")
        return

    user_email = (record.get("email") or "").strip()
    text_body = "\n".join([
        "Hai ricevuto un nuovo messaggio dal form Contatti di ForCreators:",
        "",
        f"Nome: {record.get('name', '')}",
        f"Email: {user_email}",
        f"Oggetto: {record.get('subject', '')}",
        "",
        "Messaggio:",
        record.get("message", ""),
    ])

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
# API USER
# =======================
@app.post("/api/signup")
async def api_signup(payload: SignupRequest):
    with db() as s:
        existing = s.execute(select(UserRow).where(UserRow.email == payload.email)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Email già registrata.")

        segment = compute_segment(payload.followers, payload.profiles_count)
        plan = compute_plan(segment, payload.profiles_count)

        user_id = str(uuid.uuid4())
        user = UserRow(
            user_id=user_id,
            email=payload.email,
            password=payload.password,
            main_platform=payload.main_platform,
            username=payload.username,
            followers=int(payload.followers),
            profiles_count=int(payload.profiles_count),
            segment=segment,
            plan=plan,
            is_premium=False,
            paid_plan="free",
            updated_at=datetime.now(timezone.utc),
        )
        s.add(user)

    return {"user_id": user_id}

@app.post("/api/login")
async def api_login(payload: LoginRequest):
    with db() as s:
        user = s.execute(select(UserRow).where(UserRow.email == payload.email)).scalar_one_or_none()
        if not user or user.password != payload.password:
            raise HTTPException(status_code=400, detail="Credenziali non valide.")
        return {"user_id": user.user_id}

@app.get("/api/user")
async def api_get_user(user_id: str):
    with db() as s:
        user = s.get(UserRow, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utente non trovato.")
        return {
            "user_id": user.user_id,
            "email": user.email,
            "main_platform": user.main_platform,
            "username": user.username,
            "followers": user.followers,
            "profiles_count": user.profiles_count,
            "segment": user.segment,
            "plan": user.plan,
            "is_premium": user.is_premium,
            "paid_plan": user.paid_plan,
        }

# (extra utile) aggiornare follower/profili per “simulare evoluzione”
class UpdateProfileRequest(BaseModel):
    user_id: str
    followers: int
    profiles_count: int = 1

@app.post("/api/update-profile")
async def api_update_profile(payload: UpdateProfileRequest):
    with db() as s:
        user = s.get(UserRow, payload.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utente non trovato.")
        user.followers = int(payload.followers)
        user.profiles_count = int(payload.profiles_count)
        user.segment = compute_segment(user.followers, user.profiles_count)
        user.plan = compute_plan(user.segment, user.profiles_count)
        user.updated_at = datetime.now(timezone.utc)
        s.add(user)
        return {"status": "ok", "segment": user.segment, "plan": user.plan}

@app.get("/api/media-kit")
async def api_media_kit(user_id: str):
    with db() as s:
        user = s.get(UserRow, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utente non trovato.")

        kit = compute_media_kit(user)

        required_plan = SEGMENT_TO_PLAN[user.segment]  # type: ignore
        current_plan = user.paid_plan  # type: ignore

        if PLAN_ORDER.get(current_plan, 0) < PLAN_ORDER[required_plan]:
            kit["locked"] = True
            kit["locked_reason"] = (
                "Per vedere i prezzi precisi per questo segmento attiva il piano "
                f"{required_plan} dalla pagina Pricing."
            )
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
    with db() as s:
        user = s.get(UserRow, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utente non trovato.")

        if user.segment != "casual" and not user.is_premium:
            raise HTTPException(
                status_code=402,
                detail="I consigli avanzati sul profilo sono disponibili solo dopo l’attivazione del piano a pagamento.",
            )
        return compute_profile_tips(user)

@app.post("/api/contact")
async def api_contact(payload: ContactRequest):
    contact_id = str(uuid.uuid4())
    record = payload.model_dump()
    record["contact_id"] = contact_id

    with db() as s:
        row = ContactRow(
            contact_id=contact_id,
            name=record["name"],
            email=record["email"],
            subject=record["subject"],
            message=record["message"],
        )
        s.add(row)

    try:
        await send_contact_email(record)
    except Exception as e:
        print("❌ Errore invio email contatto:", repr(e))

    return {"contact_id": contact_id, "status": "received"}


# =======================
# STRIPE (Webhook)
# =======================
def infer_paid_plan_from_amount(amount_cents: int, segment: str) -> PlanType:
    if amount_cents <= 0:
        return "free"
    if amount_cents in (490, 4900):
        return "emerging"
    if amount_cents in (990, 9900):
        return "agency" if segment == "agency" else "pro"
    if amount_cents in (19900, 29900, 39900):
        return "agency"
    return SEGMENT_TO_PLAN.get(segment, "free")  # type: ignore

def infer_plan_from_price_id(price_id: Optional[str], fallback_amount: int, segment: str) -> PlanType:
    if price_id and price_id in PRICE_ID_TO_PLAN:
        return PRICE_ID_TO_PLAN[price_id]  # type: ignore
    return infer_paid_plan_from_amount(fallback_amount, segment)

@app.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    if stripe is None:
        raise HTTPException(status_code=500, detail="Stripe non è installato sul server.")
    if not STRIPE_WEBHOOK_SECRET or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Webhook Stripe non configurato.")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Payload non valido.")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Firma webhook non valida.")

    etype = event.get("type")

    # 1) Checkout completato (Payment Link o Checkout Session)
    if etype == "checkout.session.completed":
        session = event["data"]["object"]

        details = session.get("customer_details") or {}
        customer_email = (details.get("email") or session.get("customer_email") or "").strip()
        customer_id = session.get("customer")  # es. cus_...
        subscription_id = session.get("subscription")  # se era subscription

        amount_total = int(session.get("amount_total") or 0)

        # prova a recuperare il price_id (più robusto del solo amount)
        price_id = None
        try:
            line_items = stripe.checkout.Session.list_line_items(session["id"], limit=1)
            if line_items and line_items.get("data"):
                li0 = line_items["data"][0]
                price = li0.get("price") or {}
                if isinstance(price, dict):
                    price_id = price.get("id")
                elif isinstance(price, str):
                    price_id = price
        except Exception as e:
            print("⚠️ Non riesco a leggere line_items:", repr(e))

        if not customer_email:
            print("⚠️ checkout.session.completed senza email: impossibile associare utente.")
            return {"status": "ok"}

        with db() as s:
            user = s.execute(select(UserRow).where(UserRow.email == customer_email)).scalar_one_or_none()
            if not user:
                print("⚠️ Pagamento fatto con email non registrata:", customer_email)
                return {"status": "ok"}

            new_plan = infer_plan_from_price_id(price_id, amount_total, user.segment)

            user.is_premium = new_plan != "free"
            user.paid_plan = new_plan
            if customer_id:
                user.stripe_customer_id = str(customer_id)
            if subscription_id:
                user.stripe_subscription_id = str(subscription_id)
            user.updated_at = datetime.now(timezone.utc)
            s.add(user)

            print(f"✅ PREMIUM aggiornato: {user.email} -> {user.paid_plan} (price={price_id}, amount={amount_total})")

    # 2) Subscription cancellata (solo se usi subscription)
    if etype == "customer.subscription.deleted":
        sub = event["data"]["object"]
        customer_id = sub.get("customer")

        if customer_id:
            with db() as s:
                user = s.execute(select(UserRow).where(UserRow.stripe_customer_id == str(customer_id))).scalar_one_or_none()
                if user:
                    user.is_premium = False
                    user.paid_plan = "free"
                    user.stripe_subscription_id = None
                    user.updated_at = datetime.now(timezone.utc)
                    s.add(user)
                    print(f"✅ Subscription cancellata: {user.email} -> FREE")

    return {"status": "ok"}


@app.post("/api/update-plan")
async def api_update_plan(payload: PlanUpdateRequest):
    with db() as s:
        user = s.get(UserRow, payload.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utente non trovato.")

        user.paid_plan = payload.new_plan
        user.is_premium = payload.new_plan != "free"
        user.updated_at = datetime.now(timezone.utc)
        s.add(user)
        return {"user_id": user.user_id, "paid_plan": user.paid_plan}
