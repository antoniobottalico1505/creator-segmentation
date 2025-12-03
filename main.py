from typing import Dict, Any
from pathlib import Path
import uuid
import hashlib

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr

# =====================
# Config base
# =====================

BASE_DIR = Path(__file__).parent
TEMPLATES_DIR = BASE_DIR / "templates"
INDEX_PATH = TEMPLATES_DIR / "index.html"

app = FastAPI(title="Creator Segmentation & Pricing")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================
# "Database" in memoria
# =====================

USERS: Dict[str, Dict[str, Any]] = {}  # user_id -> data


def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()


def classify_segment(followers: int) -> str:
    """
    Segmenti:
    - casual: followers < 2.000
    - emerging: 2.000 <= followers < 10.000
    - pro: 10.000 <= followers < 200.000
    - agency: followers >= 200.000
    """
    if followers < 2000:
        return "casual"
    elif followers < 10000:
        return "emerging"
    elif followers < 200000:
        return "pro"
    else:
        return "agency"


def get_plan(segment: str, profiles_count: int) -> Dict[str, Any]:
    """
    Piani:
    - Casual < 2.000: FREE
    - Emergente 2.000–10.000: 4,90/mese o 49/anno
    - Creator Pro 10.000–200.000: 9,90/mese o 99/anno
    - Top Agenzia > 200.000:
        - 1–2 profili: 99€/mese
        - 3 profili: 199€/mese
        - 4+ profili: 399€/mese
    """
    if segment == "casual":
        return {
            "segment": "casual",
            "label": "Casual",
            "description": "Utente social per sport, niente collaborazioni strutturate.",
            "monthly_price": 0.0,
            "yearly_price": 0.0,
            "currency": "EUR",
            "billing_note": "Piano gratuito.",
        }
    elif segment == "emerging":
        return {
            "segment": "emerging",
            "label": "Emergente",
            "description": "Primi brand, prime collaborazioni, inizi a monetizzare.",
            "monthly_price": 4.90,
            "yearly_price": 49.0,
            "currency": "EUR",
            "billing_note": "Da 2.000 a 10.000 follower complessivi.",
        }
    elif segment == "pro":
        return {
            "segment": "pro",
            "label": "Creator Pro",
            "description": "Collaborazioni regolari, media kit completo, pricing strutturato.",
            "monthly_price": 9.90,
            "yearly_price": 99.0,
            "currency": "EUR",
            "billing_note": "Da 10.000 a 200.000 follower complessivi.",
        }
    else:  # agency
        # 1–2 profili: 99€/mese
        # 3 profili: 199€/mese
        # 4+ profili: 399€/mese
        if profiles_count <= 2:
            monthly = 99.0
        elif profiles_count == 3:
            monthly = 199.0
        else:
            monthly = 399.0

        return {
            "segment": "agency",
            "label": "Top / Agenzia",
            "description": "Gestione di profili grandi o multipli per brand / talent agency.",
            "monthly_price": monthly,
            "yearly_price": None,
            "currency": "EUR",
            "billing_note": (
                "Schema aziende: 1–2 profili 99€/mese, "
                "3 profili 199€/mese, 4+ profili 399€/mese. "
                f"Configurazione attuale: {profiles_count} profili → {int(monthly)}€/mese."
            ),
        }

def build_media_kit(user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Genera una struttura base di "media kit" con prezzi suggeriti
    in base a follower e segmento.
    """
    followers = user["followers"]
    segment = classify_segment(followers)
    profiles_count = user["profiles_count"]
    username = user["username"]
    main_platform = user["main_platform"]

    # Stime molto semplici per demo
    # views post ~ 20% follower, views story ~ 10% follower
    est_views_post = int(followers * 0.20)
    est_views_story = int(followers * 0.10)

    # CPM di base per segmento
    if segment == "casual":
        base_cpm = 5  # €
    elif segment == "emerging":
        base_cpm = 10
    elif segment == "pro":
        base_cpm = 20
    else:  # agency
        base_cpm = 35

    def price_from_views(views: int, multiplier: float = 1.0) -> float:
        return (views / 1000.0) * base_cpm * multiplier

    # Post singolo
    base_post = price_from_views(est_views_post, 1.0)
    # Story singola
    base_story = price_from_views(est_views_story, 0.7)
    # Pacchetto (post + 3 stories)
    base_bundle = base_post + base_story * 3

    def price_range(base: float) -> Dict[str, float]:
        low = max(base * 0.8, 5.0)
        high = max(base * 1.2, low + 5.0)
        return {"min": round(low, 2), "max": round(high, 2)}

    suggested_rates = {
        "single_post": price_range(base_post),
        "single_story": price_range(base_story),
        "bundle_post_3stories": price_range(base_bundle),
    }

    plan = get_plan(segment, profiles_count)

    return {
        "username": username,
        "main_platform": main_platform,
        "followers": followers,
        "segment": segment,
        "segment_label": plan["label"],
        "description": plan["description"],
        "estimated": {
            "post_avg_views": est_views_post,
            "story_avg_views": est_views_story,
        },
        "suggested_rates_eur": suggested_rates,
        "plan": plan,
    }


# =====================
# Schemi API
# =====================

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    main_platform: str
    username: str
    followers: int
    profiles_count: int = 1


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# =====================
# Routes
# =====================

@app.get("/", response_class=HTMLResponse)
def index() -> str:
    if not INDEX_PATH.exists():
        return "<h1>Creator App</h1><p>index.html non trovato.</p>"
    return INDEX_PATH.read_text(encoding="utf-8")

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

# ... qui il resto del tuo codice esistente ...

templates = Jinja2Templates(directory="templates")

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

@app.post("/api/signup")
def signup(req: SignupRequest) -> Dict[str, Any]:
    # Controllo email già usata
    for u in USERS.values():
        if u["email"].lower() == req.email.lower():
            raise HTTPException(status_code=400, detail="Email già registrata.")

    if req.followers < 0:
        raise HTTPException(status_code=400, detail="Follower non validi.")

    if req.profiles_count < 1:
        raise HTTPException(status_code=400, detail="Numero profili minimo 1.")

    user_id = uuid.uuid4().hex
    segment = classify_segment(req.followers)

    user_data = {
        "user_id": user_id,
        "email": req.email,
        "password_hash": hash_password(req.password),
        "main_platform": req.main_platform,
        "username": req.username,
        "followers": int(req.followers),
        "profiles_count": int(req.profiles_count),
    }
    USERS[user_id] = user_data

    plan = get_plan(segment, user_data["profiles_count"])

    return {
        "user_id": user_id,
        "segment": segment,
        "plan": plan,
    }


@app.post("/api/login")
def login(req: LoginRequest) -> Dict[str, Any]:
    for user_id, u in USERS.items():
        if u["email"].lower() == req.email.lower():
            if u["password_hash"] != hash_password(req.password):
                raise HTTPException(status_code=401, detail="Password errata.")
            segment = classify_segment(u["followers"])
            plan = get_plan(segment, u["profiles_count"])
            return {
                "user_id": user_id,
                "segment": segment,
                "plan": plan,
            }
    raise HTTPException(status_code=404, detail="Utente non trovato.")


@app.get("/api/user")
def get_user(user_id: str) -> Dict[str, Any]:
    user = USERS.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato.")
    segment = classify_segment(user["followers"])
    plan = get_plan(segment, user["profiles_count"])
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "main_platform": user["main_platform"],
        "username": user["username"],
        "followers": user["followers"],
        "profiles_count": user["profiles_count"],
        "segment": segment,
        "plan": plan,
    }


@app.get("/api/media-kit")
def get_media_kit(user_id: str) -> Dict[str, Any]:
    user = USERS.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato.")
    kit = build_media_kit(user)
    return kit
