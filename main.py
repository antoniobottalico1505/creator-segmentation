from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, field_validator
from typing import Dict, Any, Literal
import uuid

app = FastAPI(title="ForCreators App")

templates = Jinja2Templates(directory="templates")

# ------------------------------
# MODELLI Pydantic
# ------------------------------


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


SegmentType = Literal["casual", "emerging", "pro", "agency"]


class User(BaseModel):
    user_id: str
    email: str
    password: str  # in chiaro, per demo; in produzione andrebbe hashata
    main_platform: str
    username: str
    followers: int
    profiles_count: int
    segment: SegmentType
    plan: Dict[str, Any]


# ------------------------------
# "Database" in memoria
# ------------------------------

users_db: Dict[str, User] = {}
email_index: Dict[str, str] = {}  # email -> user_id


# ------------------------------
# LOGICA DI SEGMENTAZIONE & PIANI
# ------------------------------


def compute_segment(followers: int, profiles_count: int) -> SegmentType:
    """
    Segmenti decisi secondo le regole concordate:
    - Casual:        < 2.000 follower (e profili_count == 1)
    - Emergente:     2.000 – 9.999
    - Creator Pro:   10.000 – 199.999
    - Top Agenzia:   >= 200.000 oppure profiles_count > 1
    """
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
    """
    Prezzi secondo quanto stabilito:

    CREATOR:
    - Casual          < 2.000 follower       FREE
    - Emergente       2.000 – 9.999          4,90/mese o 49/anno
    - Creator Pro     10.000 – 199.999       9,90/mese o 99/anno
    - Top Agenzia     200.000+ o multi       99–399/mese a seconda dei profili

    AZIENDE / AGENZIE:
    - 2 profili       99/mese
    - 3 profili       199/mese
    - 4 profili       299/mese
    - 5+ profili      399/mese
    """

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

    # segment == "agency"
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
    """
    Genera le stime e i range prezzi suggeriti per:
    - post singolo
    - story singola
    - pacchetto post + 3 stories
    """
    followers = user.followers

    # Stime views base a seconda del segmento
    if user.segment == "casual":
        post_views = int(followers * 0.10)
        story_views = int(followers * 0.05)
        cpm_post = (3.0, 6.0)    # €/1000 views
        cpm_story = (2.0, 4.0)
    elif user.segment == "emerging":
        post_views = int(followers * 0.15)
        story_views = int(followers * 0.08)
        cpm_post = (5.0, 10.0)
        cpm_story = (3.0, 6.0)
    elif user.segment == "pro":
        post_views = int(followers * 0.20)
        story_views = int(followers * 0.10)
        cpm_post = (7.0, 15.0)
        cpm_story = (4.0, 8.0)
    else:  # agency / grandi numeri
        post_views = int(followers * 0.25)
        story_views = int(followers * 0.12)
        cpm_post = (10.0, 25.0)
        cpm_story = (6.0, 12.0)

    # Calcolo prezzi min/max
    def price_range(views: int, cpm_low: float, cpm_high: float, min_floor: float) -> Dict[str, float]:
        min_price = max(min_floor, (views / 1000.0) * cpm_low)
        max_price = max(min_price, (views / 1000.0) * cpm_high)
        return {"min": round(min_price, 2), "max": round(max_price, 2)}

    single_post = price_range(post_views, cpm_post[0], cpm_post[1], 5.0)
    single_story = price_range(story_views, cpm_story[0], cpm_story[1], 3.0)

    # Pacchetto: circa 2x–2.5x il post singolo
    bundle_min = single_post["min"] * 1.8
    bundle_max = single_post["max"] * 2.5
    bundle_post_3stories = {
        "min": round(bundle_min, 2),
        "max": round(bundle_max, 2),
    }

    segment_label_map = {
        "casual": "Casual – profilo per sport",
        "emerging": "Emergente – primi brand",
        "pro": "Creator Pro – collaborazioni strutturate",
        "agency": "Top Agenzia – multi profilo",
    }

    return {
        "username": user.username,
        "main_platform": user.main_platform,
        "segment": user.segment,
        "segment_label": segment_label_map.get(user.segment, user.segment),
        "followers": followers,
        "estimated": {
            "post_avg_views": post_views,
            "story_avg_views": story_views,
        },
        "suggested_rates_eur": {
            "single_post": single_post,
            "single_story": single_story,
            "bundle_post_3stories": bundle_post_3stories,
        },
    }


# ------------------------------
# ROUTE DI PAGINA (HTML)
# ------------------------------


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


# ------------------------------
# API JSON usate da index.html
# ------------------------------


@app.post("/api/signup")
async def api_signup(payload: SignupRequest):
    # email già usata?
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

    # non esponiamo la password
    data = user.model_dump()
    data.pop("password", None)
    return data


@app.get("/api/media-kit")
async def api_media_kit(user_id: str):
    user = users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato.")

    kit = compute_media_kit(user)
    return kit
