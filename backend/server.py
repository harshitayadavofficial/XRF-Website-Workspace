from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import secrets
import time
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated, Any
from notify import notify_new_submission

import bcrypt
import jwt
import requests
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator, EmailStr, field_validator


# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ---------- App ----------
app = FastAPI(title="ORNETOPS API")
api = APIRouter(prefix="/api")

# ---------- Object Storage (Emergent) ----------
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = "ornetops"
_storage_key: Optional[str] = None

MIME_BY_EXT = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif",
    "webp": "image/webp", "svg": "image/svg+xml",
    "mp4": "video/mp4", "mov": "video/quicktime", "webm": "video/webm", "m4v": "video/x-m4v",
    "pdf": "application/pdf",
    "glb": "model/gltf-binary", "gltf": "model/gltf+json",
}

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
ALLOWED_VIDEO = {"video/mp4", "video/quicktime", "video/webm", "video/x-m4v"}
ALLOWED_DOC = {"application/pdf", "model/gltf-binary", "model/gltf+json"}
ALLOWED_UPLOAD = ALLOWED_IMAGE | ALLOWED_VIDEO | ALLOWED_DOC

MAX_IMAGE_SIZE = 10 * 1024 * 1024     # 10 MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024    # 100 MB
MAX_DOC_SIZE = 100 * 1024 * 1024      # 100 MB (Supports up to 100MB 3D models)

UPLOAD_DIR = ROOT_DIR / "uploads"

def _init_storage():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return "local"


def _put_object(path: str, data: bytes, content_type: str) -> dict:
    _init_storage()
    # Security: Ensure path is relative and does not escape UPLOAD_DIR
    safe_path = str(path).lstrip("\\/")
    target_file = (UPLOAD_DIR / safe_path).resolve()
    if not str(target_file).startswith(str(UPLOAD_DIR.resolve())):
        raise ValueError("Directory traversal attempt detected")
    target_file.parent.mkdir(parents=True, exist_ok=True)
    with open(target_file, "wb") as f:
        f.write(data)
    return {"path": path}


def _get_object(path: str):
    _init_storage()
    # Security: Ensure path is relative and does not escape UPLOAD_DIR
    safe_path = str(path).lstrip("\\/")
    target_file = (UPLOAD_DIR / safe_path).resolve()
    if not str(target_file).startswith(str(UPLOAD_DIR.resolve())):
        raise ValueError("Directory traversal attempt detected")
    if not target_file.exists() or target_file.is_dir():
        raise FileNotFoundError(f"Local file not found: {path}")
    with open(target_file, "rb") as f:
        content = f.read()
    ext = path.rsplit(".", 1)[-1].lower() if "." in path else "bin"
    ctype = MIME_BY_EXT.get(ext, "application/octet-stream")
    return content, ctype


# ---------- Auth helpers ----------
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    cookie_secure = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
    # Security: Use 'lax' for SameSite cookie attribute to protect against CSRF attacks.
    samesite = "lax"
    response.set_cookie("access_token", access, httponly=True, secure=cookie_secure, samesite=samesite, max_age=8 * 3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=cookie_secure, samesite=samesite, max_age=7 * 24 * 3600, path="/")


# ---------- Models ----------
def _id_str(v: Any) -> str:
    return str(v) if v is not None else ""

# ---------- Version Tracker ----------
DATA_VERSION = 1

def bump_data_version():
    global DATA_VERSION
    DATA_VERSION += 1

# ---------- Rate Limiter ----------
_rate_store: dict = {}  # ip -> [timestamp, ...]
_RATE_LIMIT = 10  # max requests
_RATE_WINDOW = 60  # seconds

def rate_limit(request: Request):
    """Allow max 10 public form submissions per IP per 60 seconds."""
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    hits = _rate_store.get(ip, [])
    hits = [t for t in hits if now - t < _RATE_WINDOW]
    if len(hits) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a minute before submitting again."
        )
    hits.append(now)
    _rate_store[ip] = hits

PyObjectId = Annotated[str, BeforeValidator(_id_str)]

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    phone: Optional[str] = None
    created_at: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserCreateIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "sales_executive"
    phone: Optional[str] = None

class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None

# Generic create/update inputs: validation kept loose to allow CMS flexibility
class GenericIn(BaseModel):
    model_config = ConfigDict(extra="allow")

# Lead
LEAD_STATUSES = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"]
LEAD_SOURCES = ["contact", "demo_request", "quote_request", "product_inquiry", "dealer_inquiry", "support"]

def _blank_to_none(v):
    if isinstance(v, str) and v.strip() == "":
        return None
    return v

class LeadCreateIn(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    product_interest: Optional[str] = None
    message: Optional[str] = None
    source: str = "contact"

    @field_validator("email", mode="before")
    @classmethod
    def _e(cls, v): return _blank_to_none(v)

class LeadUpdateIn(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    product_interest: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[List[dict]] = None

class NoteIn(BaseModel):
    text: str

# Demo / Quote
class DemoRequestIn(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    city: Optional[str] = None
    product_interest: Optional[str] = None
    preferred_date: Optional[str] = None
    message: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def _e(cls, v): return _blank_to_none(v)

class QuoteRequestIn(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    product: Optional[str] = None
    quantity: Optional[int] = 1
    message: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def _e(cls, v): return _blank_to_none(v)

class TicketIn(BaseModel):
    subject: str
    description: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    product: Optional[str] = None
    priority: Optional[str] = "medium"

    @field_validator("email", mode="before")
    @classmethod
    def _e(cls, v): return _blank_to_none(v)


# ---------- RBAC ----------
ROLES = [
    "supreme_user", "super_admin", "admin",
    "sales_manager", "sales_executive",
    "service_manager", "service_executive",
    "content_manager", "dealer_manager", "customer",
]

ROLE_PERMISSIONS = {
    "supreme_user": {"all"},
    "super_admin": {"all"},
    "admin": {"products", "blogs", "downloads", "leads", "events", "testimonials", "case_studies",
              "dealers", "demos", "quotes", "tickets", "media", "categories"},
    "sales_manager": {"leads", "demos", "quotes", "customers", "lead_assign"},
    "sales_executive": {"leads_own", "demos", "quotes"},
    "service_manager": {"tickets", "amc", "service"},
    "service_executive": {"tickets_own"},
    "content_manager": {"blogs", "resources", "downloads", "testimonials", "case_studies", "events", "products"},
    "dealer_manager": {"dealers"},
    "customer": {"products_view", "downloads", "tickets_own"},
}

def can(role: str, action: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, set())
    return "all" in perms or action in perms

def staff_only(role: str) -> bool:
    return role in {"supreme_user", "super_admin", "admin", "sales_manager", "sales_executive",
                    "service_manager", "service_executive", "content_manager", "dealer_manager"}


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles and user["role"] != "super_admin" and user["role"] != "supreme_user":
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return _dep

def require_staff(user: dict = Depends(get_current_user)) -> dict:
    if not staff_only(user["role"]):
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


# ---------- Helpers ----------
def doc_out(d: dict) -> dict:
    if not d:
        return d
    out = {**d}
    if "_id" in out:
        out["id"] = str(out["_id"])
        del out["_id"]
    return out

async def audit(user: dict, action: str, module: str, entity_id: str = "", details: Optional[dict] = None, request: Optional[Request] = None):
    ip = request.client.host if request and request.client else ""
    await db.audit_logs.insert_one({
        "user_id": user.get("id", ""),
        "user_email": user.get("email", ""),
        "role": user.get("role", ""),
        "action": action,
        "module": module,
        "entity_id": entity_id,
        "details": details or {},
        "ip": ip,
        "created_at": now_iso(),
    })


# ---------- Auth Endpoints ----------
@api.post("/auth/login")
async def login(payload: LoginIn, response: Response, request: Request):
    rate_limit(request)
    email = payload.email.lower().strip()
    # Use email-only identifier so K8s ingress IP rotation doesn't bypass lockout.
    identifier = f"email:{email}"

    # brute force check
    record = await db.login_attempts.find_one({"identifier": identifier})
    if record and record.get("locked_until"):
        locked_until = datetime.fromisoformat(record["locked_until"])
        if locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1},
             "$set": {"last_at": now_iso(),
                      "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
                                       if (record and record.get("count", 0) + 1 >= 5) else None}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    await db.login_attempts.delete_one({"identifier": identifier})

    uid = str(user["_id"])
    access = create_access_token(uid, user["email"], user["role"])
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)

    return {
        "id": uid, "email": user["email"], "name": user["name"], "role": user["role"],
        "phone": user.get("phone"), "access_token": access,
    }

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- Users (Admin) ----------
@api.get("/users")
async def list_users(user: dict = Depends(require_role("super_admin", "admin"))):
    items = []
    async for u in db.users.find().sort("created_at", -1):
        if u.get("role") == "supreme_user":
            continue
        items.append({
            "id": str(u["_id"]), "email": u["email"], "name": u["name"],
            "role": u["role"], "phone": u.get("phone"),
            "created_at": u.get("created_at"),
        })
    return items

@api.post("/users")
async def create_user(payload: UserCreateIn, request: Request, user: dict = Depends(require_role("super_admin", "admin"))):
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if payload.role == "supreme_user" and user["role"] != "supreme_user":
        raise HTTPException(status_code=403, detail="Forbidden")
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")
    doc = {
        "email": payload.email.lower(), "name": payload.name, "role": payload.role,
        "phone": payload.phone, "password_hash": hash_password(payload.password),
        "created_at": now_iso(),
    }
    r = await db.users.insert_one(doc)
    await audit(user, "create", "user", str(r.inserted_id), {"email": payload.email}, request)
    return {"id": str(r.inserted_id), **{k: v for k, v in doc.items() if k != "password_hash"}}

@api.patch("/users/{uid}")
async def update_user(uid: str, payload: UserUpdateIn, request: Request, user: dict = Depends(require_role("super_admin", "admin"))):
    try:
        target = await db.users.find_one({"_id": ObjectId(uid)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    if target and target.get("role") == "supreme_user" and user["role"] != "supreme_user":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items() if k != "password"}
    if "role" in updates and updates["role"] == "supreme_user" and user["role"] != "supreme_user":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    if payload.password:
        updates["password_hash"] = hash_password(payload.password)
    if not updates:
        return {"ok": True}
    r = await db.users.update_one({"_id": ObjectId(uid)}, {"$set": updates})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    await audit(user, "update", "user", uid, {"keys": list(updates.keys())}, request)
    return {"ok": True}

@api.delete("/users/{uid}")
async def delete_user(uid: str, request: Request, user: dict = Depends(require_role("super_admin"))):
    if uid == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete self")
    try:
        target = await db.users.find_one({"_id": ObjectId(uid)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    if target and target.get("role") == "supreme_user" and user["role"] != "supreme_user":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    r = await db.users.delete_one({"_id": ObjectId(uid)})
    if not r.deleted_count:
        raise HTTPException(status_code=404, detail="Not found")
    await audit(user, "delete", "user", uid, None, request)
    return {"ok": True}


# ---------- Generic CMS factory ----------
def make_cms_routes(name: str, allowed_roles: tuple = ("super_admin", "admin", "content_manager")):
    coll = name

    @api.get(f"/{coll}")
    async def list_items():
        items = []
        async for d in db[coll].find().sort("created_at", -1).limit(500):
            items.append(doc_out(d))
        return items

    @api.get(f"/{coll}/{{iid}}")
    async def get_item(iid: str):
        try:
            d = await db[coll].find_one({"_id": ObjectId(iid)})
        except Exception:
            d = None
        if not d:
            raise HTTPException(status_code=404, detail="Not found")
        return doc_out(d)

    @api.post(f"/{coll}")
    async def create_item(payload: GenericIn, request: Request, user: dict = Depends(require_role(*allowed_roles))):
        d = payload.model_dump()
        email_notification = d.pop("email_notification", None)
        d["created_at"] = now_iso()
        d["updated_at"] = now_iso()
        r = await db[coll].insert_one(d)
        await audit(user, "create", coll, str(r.inserted_id), None, request)
        if coll == "blogs" and email_notification and email_notification.get("enabled"):
            from notify import send_blog_notification_emails
            blog_doc = {**d, "_id": r.inserted_id}
            asyncio.create_task(send_blog_notification_emails(db, blog_doc, email_notification))
        bump_data_version()
        return {**doc_out({**d, "_id": r.inserted_id})}

    @api.patch(f"/{coll}/{{iid}}")
    async def update_item(iid: str, payload: GenericIn, request: Request, user: dict = Depends(require_role(*allowed_roles))):
        d = payload.model_dump()
        email_notification = d.pop("email_notification", None)
        d["updated_at"] = now_iso()
        try:
            r = await db[coll].update_one({"_id": ObjectId(iid)}, {"$set": d})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid id")
        if not r.matched_count:
            raise HTTPException(status_code=404, detail="Not found")
        await audit(user, "update", coll, iid, None, request)
        if coll == "blogs" and email_notification and email_notification.get("enabled"):
            from notify import send_blog_notification_emails
            blog_doc = {**d, "_id": ObjectId(iid)}
            asyncio.create_task(send_blog_notification_emails(db, blog_doc, email_notification))
        bump_data_version()
        return {"ok": True}

    @api.delete(f"/{coll}/{{iid}}")
    async def delete_item(iid: str, request: Request, user: dict = Depends(require_role(*allowed_roles))):
        try:
            r = await db[coll].delete_one({"_id": ObjectId(iid)})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid id")
        if not r.deleted_count:
            raise HTTPException(status_code=404, detail="Not found")
        await audit(user, "delete", coll, iid, None, request)
        bump_data_version()
        return {"ok": True}

    # Rename to avoid name collisions (FastAPI uses operation_id from function name)
    list_items.__name__ = f"list_{coll}"
    get_item.__name__ = f"get_{coll}"
    create_item.__name__ = f"create_{coll}"
    update_item.__name__ = f"update_{coll}"
    delete_item.__name__ = f"delete_{coll}"


# Register CMS collections
for _name in ["products", "categories", "industries", "technologies", "solutions",
              "services", "blogs", "case_studies", "testimonials", "events",
              "dealers", "careers", "downloads", "faqs"]:
    make_cms_routes(_name)


# ---------- Leads (CRM) ----------
@api.get("/leads")
async def list_leads(status: Optional[str] = None, source: Optional[str] = None, assigned_to: Optional[str] = None,
                     user: dict = Depends(require_staff)):
    q = {}
    if status:
        q["status"] = status
    if source:
        q["source"] = source
    if assigned_to:
        q["assigned_to"] = assigned_to
    # sales_executive sees only own leads
    if user["role"] == "sales_executive":
        q["assigned_to"] = user["id"]
    items = []
    async for d in db.leads.find(q).sort("created_at", -1).limit(500):
        item = doc_out(d)
        if user["role"] != "supreme_user":
            item.pop("ip", None)
        items.append(item)
    return items

@api.post("/leads/public")
async def public_create_lead(payload: LeadCreateIn, request: Request):
    """Public endpoint - used by contact/inquiry forms."""
    rate_limit(request)
    d = payload.model_dump()
    d["status"] = "new"
    d["assigned_to"] = None
    d["notes"] = []
    d["created_at"] = now_iso()
    d["updated_at"] = now_iso()
    d["ip"] = request.client.host if request.client else ""
    r = await db.leads.insert_one(d)
    # Trigger email/WhatsApp notifications in background
    asyncio.create_task(notify_new_submission(db, "contact", d))
    logger.info(f"[LEAD] New lead from {d.get('email')} - {d.get('name')} - source={d.get('source')}")
    bump_data_version()
    return {"ok": True, "id": str(r.inserted_id)}

@api.post("/leads")
async def create_lead(payload: LeadCreateIn, request: Request, user: dict = Depends(require_staff)):
    d = payload.model_dump()
    d["status"] = "new"
    d["assigned_to"] = None
    d["notes"] = []
    d["created_at"] = now_iso()
    d["updated_at"] = now_iso()
    r = await db.leads.insert_one(d)
    await audit(user, "create", "leads", str(r.inserted_id), None, request)
    bump_data_version()
    return doc_out({**d, "_id": r.inserted_id})

@api.patch("/leads/{lid}")
async def update_lead(lid: str, payload: LeadUpdateIn, request: Request, user: dict = Depends(require_staff)):
    updates = payload.model_dump(exclude_none=True)
    if "status" in updates and updates["status"] not in LEAD_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    updates["updated_at"] = now_iso()
    try:
        r = await db.leads.update_one({"_id": ObjectId(lid)}, {"$set": updates})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    await audit(user, "update", "leads", lid, {"keys": list(updates.keys())}, request)
    bump_data_version()
    return {"ok": True}

@api.post("/leads/{lid}/notes")
async def add_lead_note(lid: str, payload: NoteIn, request: Request, user: dict = Depends(require_staff)):
    note = {"id": str(uuid.uuid4()), "text": payload.text,
            "by": user["email"], "by_id": user["id"], "at": now_iso()}
    r = await db.leads.update_one({"_id": ObjectId(lid)}, {"$push": {"notes": note}, "$set": {"updated_at": now_iso()}})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    await audit(user, "note", "leads", lid, None, request)
    return note

@api.delete("/leads/{lid}")
async def delete_lead(lid: str, request: Request, user: dict = Depends(require_role("super_admin", "admin", "sales_manager"))):
    try:
        r = await db.leads.delete_one({"_id": ObjectId(lid)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not r.deleted_count:
        raise HTTPException(status_code=404, detail="Not found")
    await audit(user, "delete", "leads", lid, None, request)
    return {"ok": True}


# ---------- Demo / Quote / Ticket (public submission, admin manage) ----------
@api.post("/demo-requests/public")
async def public_demo(payload: DemoRequestIn, request: Request):
    rate_limit(request)
    d = payload.model_dump()
    d["status"] = "new"
    d["created_at"] = now_iso()
    r = await db.demo_requests.insert_one(d)
    # Also create a lead
    await db.leads.insert_one({
        "name": d["name"], "email": d.get("email"), "phone": d.get("phone"),
        "company": d.get("company"), "city": d.get("city"),
        "product_interest": d.get("product_interest"), "message": d.get("message"),
        "source": "demo_request", "status": "new", "assigned_to": None, "notes": [],
        "created_at": now_iso(), "updated_at": now_iso(),
    })
    # Trigger notifications in background
    asyncio.create_task(notify_new_submission(db, "demo", d))
    bump_data_version()
    return {"ok": True, "id": str(r.inserted_id)}

@api.get("/demo-requests")
async def list_demos(user: dict = Depends(require_staff)):
    items = []
    async for d in db.demo_requests.find().sort("created_at", -1).limit(500):
        items.append(doc_out(d))
    return items

@api.patch("/demo-requests/{did}")
async def update_demo(did: str, payload: GenericIn, request: Request, user: dict = Depends(require_staff)):
    d = payload.model_dump()
    d["updated_at"] = now_iso()
    try:
        r = await db.demo_requests.update_one({"_id": ObjectId(did)}, {"$set": d})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    await audit(user, "update", "demo_requests", did, None, request)
    bump_data_version()
    return {"ok": True}

@api.post("/quote-requests/public")
async def public_quote(payload: QuoteRequestIn, request: Request):
    rate_limit(request)
    d = payload.model_dump()
    d["status"] = "new"
    d["created_at"] = now_iso()
    r = await db.quote_requests.insert_one(d)
    await db.leads.insert_one({
        "name": d["name"], "email": d.get("email"), "phone": d.get("phone"),
        "company": d.get("company"), "product_interest": d.get("product"),
        "message": d.get("message"), "source": "quote_request",
        "status": "new", "assigned_to": None, "notes": [],
        "created_at": now_iso(), "updated_at": now_iso(),
    })
    # Trigger notifications in background
    asyncio.create_task(notify_new_submission(db, "quote", d))
    bump_data_version()
    return {"ok": True, "id": str(r.inserted_id)}

@api.get("/quote-requests")
async def list_quotes(user: dict = Depends(require_staff)):
    items = []
    async for d in db.quote_requests.find().sort("created_at", -1).limit(500):
        items.append(doc_out(d))
    return items

@api.patch("/quote-requests/{qid}")
async def update_quote(qid: str, payload: GenericIn, request: Request, user: dict = Depends(require_staff)):
    d = payload.model_dump()
    d["updated_at"] = now_iso()
    try:
        r = await db.quote_requests.update_one({"_id": ObjectId(qid)}, {"$set": d})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    await audit(user, "update", "quote_requests", qid, None, request)
    bump_data_version()
    return {"ok": True}

@api.post("/quote-requests/{qid}/send-quote-pdf")
async def send_quote_pdf_email(qid: str, request: Request, user: dict = Depends(require_staff)):
    try:
        quote = await db.quote_requests.find_one({"_id": ObjectId(qid)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quote ID")
    if not quote:
        raise HTTPException(status_code=404, detail="Quote request not found")

    settings_doc = await db.settings.find_one({"_id": "global"}) or {}
    email_cfg = settings_doc.get("email", {})
    if not email_cfg or not email_cfg.get("enabled"):
        raise HTTPException(status_code=400, detail="Email sending is disabled. Please configure and enable outbound emails in Settings.")

    # 1. Look up the product to see if there is an uploaded brochure PDF file
    product_name = quote.get("product")
    brochure_bytes = None
    brochure_filename = None
    if product_name:
        from bson import Regex
        prod_doc = await db.products.find_one({
            "$or": [
                {"name": product_name},
                {"slug": product_name},
                {"name": Regex(f"^{product_name}$", "i")}
            ]
        })
        if prod_doc and prod_doc.get("brochure_url"):
            b_url = prod_doc["brochure_url"]
            idx = b_url.find("/api/files/")
            if idx != -1:
                rel_path = "uploads/" + b_url[idx + len("/api/files/"):]
                brochure_path = ROOT_DIR / rel_path
                if brochure_path.exists():
                    try:
                        with open(brochure_path, "rb") as f:
                            brochure_bytes = f.read()
                        brochure_filename = brochure_path.name
                    except Exception as e:
                        logger.error(f"Failed to read brochure file: {e}")

    # 2. Generate the Quotation PDF
    from export_pdf import generate_quote_pdf
    quote_data = {**quote, "id": str(quote["_id"])}
    try:
        quote_pdf_bytes = generate_quote_pdf(quote_data, settings_doc)
    except Exception as e:
        logger.error(f"Failed to generate quote PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate Quotation PDF: {str(e)}")

    # 3. Assemble email attachments
    attachments = []
    # Dynamic quote PDF
    attachments.append({
        "content": quote_pdf_bytes,
        "filename": f"Quotation_{qid[-6:].upper()}.pdf",
        "content_type": "application/pdf"
    })
    # Optional brochure PDF
    if brochure_bytes:
        attachments.append({
            "content": brochure_bytes,
            "filename": brochure_filename or "Product_Brochure.pdf",
            "content_type": "application/pdf"
        })

    # Logo attachment for header inline embedding (from Task 3)
    from notify import get_logo_attachment, wrap_email_html, send_email
    logo_att = get_logo_attachment(settings_doc)
    if logo_att:
        attachments.append(logo_att)

    # 4. Construct email body
    company_name = settings_doc.get("company", {}).get("name", "ORNETOPS")
    client_name = quote.get("name", "Customer")
    
    body_content = f"""
    <p>Dear {client_name},</p>
    <p>Thank you for your interest in our gold testing and XRF solutions. As requested, we have enclosed your official price quotation and product documentation for <strong>{product_name or 'our systems'}</strong>.</p>
    <p>Our sales team is ready to assist you with any custom requirements or technical validation needs.</p>
    <p>Best regards,<br/><strong>{company_name} Sales Team</strong></p>
    """
    
    body_html = wrap_email_html(body_content, company_name, has_logo_cid=(logo_att is not None))
    subject = f"Your Quotation from {company_name} - Ref: Q-{qid[-6:].upper()}"
    to_email = quote.get("email")
    if not to_email:
        raise HTTPException(status_code=400, detail="Client has no email address configured")

    # 5. Send email in background/synced
    try:
        await send_email(email_cfg, to_email, subject, body_html, attachments=attachments, raise_errors=True)
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to dispatch email (SMTP Host Unreachable or Invalid Config).")

    # 6. Update request status to "sent"
    await db.quote_requests.update_one({"_id": ObjectId(qid)}, {"$set": {"status": "sent", "updated_at": now_iso()}})
    await audit(user, "send_quote_pdf", "quote_requests", qid, {"email": to_email}, request)
    bump_data_version()

    return {"ok": True}

@api.post("/tickets/public")
async def public_ticket(payload: TicketIn):
    d = payload.model_dump()
    d["status"] = "open"
    d["created_at"] = now_iso()
    d["updated_at"] = now_iso()
    r = await db.tickets.insert_one(d)
    return {"ok": True, "id": str(r.inserted_id)}

@api.get("/tickets")
async def list_tickets(user: dict = Depends(require_staff)):
    items = []
    async for d in db.tickets.find().sort("created_at", -1).limit(500):
        items.append(doc_out(d))
    return items

@api.patch("/tickets/{tid}")
async def update_ticket(tid: str, payload: GenericIn, request: Request, user: dict = Depends(require_staff)):
    d = payload.model_dump()
    d["updated_at"] = now_iso()
    try:
        r = await db.tickets.update_one({"_id": ObjectId(tid)}, {"$set": d})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    await audit(user, "update", "tickets", tid, None, request)
    return {"ok": True}


# ---------- Audit Log ----------
@api.get("/audit-logs")
async def list_audit(limit: int = 200, user: dict = Depends(require_role("super_admin", "admin"))):
    items = []
    async for d in db.audit_logs.find().sort("created_at", -1).limit(limit):
        items.append(doc_out(d))
    return items


# ---------- System Logs ----------
@api.get("/system/logs/download")
async def download_system_logs(archive: bool = False, user: dict = Depends(require_role("super_admin", "admin"))):
    log_dir = ROOT_DIR / "logs"
    if archive:
        import zipfile
        import io
        log_files = []
        if log_dir.exists():
            for p in log_dir.glob("logs.txt*"):
                if p.is_file():
                    log_files.append(p)
        if not log_files:
            log_dir.mkdir(exist_ok=True)
            log_path = log_dir / "logs.txt"
            log_path.touch()
            log_files.append(log_path)
            
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for p in log_files:
                zip_file.write(p, arcname=p.name)
        zip_buffer.seek(0)
        return Response(
            zip_buffer.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=system_logs_archive.zip"}
        )
    else:
        from fastapi.responses import FileResponse
        log_path = log_dir / "logs.txt"
        if not log_path.exists():
            log_dir.mkdir(exist_ok=True)
            log_path.touch()
        return FileResponse(log_path, filename="logs.txt", media_type="text/plain")


# ---------- Export Data ----------
@api.get("/export/{resource}")
async def export_data(
    resource: str,
    format: str = "csv",  # "csv", "xlsx", "pdf"
    user: dict = Depends(require_role("super_admin", "admin"))
):
    import io
    collection_map = {
        "leads": (db.leads, [
            ("name", "Name"),
            ("email", "Email"),
            ("phone", "Phone"),
            ("company", "Company"),
            ("city", "City"),
            ("product_interest", "Product Interest"),
            ("status", "Status"),
            ("source", "Source"),
            ("created_at", "Created At")
        ], "Leads_Export"),
        
        "demo-requests": (db.demo_requests, [
            ("name", "Name"),
            ("email", "Email"),
            ("phone", "Phone"),
            ("company", "Company"),
            ("city", "City"),
            ("product_interest", "Product Interest"),
            ("preferred_date", "Preferred Date"),
            ("status", "Status"),
            ("created_at", "Created At")
        ], "Demo_Requests_Export"),
        
        "quote-requests": (db.quote_requests, [
            ("name", "Name"),
            ("email", "Email"),
            ("phone", "Phone"),
            ("company", "Company"),
            ("product", "Product"),
            ("quantity", "Quantity"),
            ("status", "Status"),
            ("created_at", "Created At")
        ], "Quote_Requests_Export"),
        
        "tickets": (db.tickets, [
            ("name", "Name"),
            ("email", "Email"),
            ("phone", "Phone"),
            ("company", "Company"),
            ("subject", "Subject"),
            ("priority", "Priority"),
            ("status", "Status"),
            ("created_at", "Created At")
        ], "Support_Tickets_Export"),
        
        "audit-logs": (db.audit_logs, [
            ("created_at", "Timestamp"),
            ("user_email", "User Email"),
            ("role", "Role"),
            ("action", "Action"),
            ("module", "Module"),
            ("entity_id", "Entity ID"),
            ("ip", "IP Address")
        ], "Audit_Logs_Export")
    }
    
    if resource not in collection_map:
        cms_colls = ["blogs", "categories", "industries", "services", "testimonials", "case_studies", "dealers"]
        if resource in cms_colls:
            collection_map[resource] = (db[resource], [
                ("title" if resource in ["blogs", "case_studies"] else "name", "Name/Title"),
                ("slug", "Slug"),
                ("created_at", "Created At")
            ], f"{resource.capitalize()}_Export")
        else:
            raise HTTPException(status_code=400, detail="Invalid export resource")
            
    coll, cols, filename_prefix = collection_map[resource]
    
    cursor = coll.find().sort("created_at", -1)
    data = await cursor.to_list(length=5000)
    
    formatted_data = []
    for item in data:
        row = {}
        for key, _ in cols:
            val = item.get(key, "")
            if key == "created_at" and val:
                try:
                    val = str(val)[:19].replace("T", " ")
                except:
                    pass
            row[key] = val
        formatted_data.append(row)
        
    filename = f"{filename_prefix}_{int(time.time())}"
    
    if format == "csv":
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([label for _, label in cols])
        for row in formatted_data:
            writer.writerow([row.get(k, "") for k, _ in cols])
        
        content = output.getvalue()
        output.close()
        return Response(
            content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
        )
        
    elif format == "xlsx":
        import pandas as pd
        df = pd.DataFrame(formatted_data)
        col_rename = {k: label for k, label in cols}
        df = df.rename(columns=col_rename)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
            
        content = output.getvalue()
        output.close()
        return Response(
            content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
        )
        
    elif format == "pdf":
        from export_pdf import export_to_pdf
        title_label = filename_prefix.replace("_", " ")
        # Fetch company name and logo from settings for PDF header
        _settings_doc = await db.settings.find_one({"_id": "global"}) or {}
        _company = _settings_doc.get("company", {}) or {}
        _company_name = _company.get("name", "ORNETOPS")
        _logo_url = _company.get("pdf_logo", "")
        if not _logo_url:
            _logo_cfg = _settings_doc.get("logo", {}) or {}
            if isinstance(_logo_cfg, dict):
                _logo_url = _logo_cfg.get("image_light") or _logo_cfg.get("image") or _logo_cfg.get("image_dark") or ""
        if not _logo_url:
            _logo_url = _company.get("logo", "")
        _pdf_footer_text = _company.get("pdf_footer_text", "")
        
        _pdf_header_style = _company.get("pdf_header_style", "dark")
        _pdf_company_name = _company.get("pdf_company_name", "") or _company_name
        try:
            _pdf_logo_height = int(_company.get("pdf_logo_height", 35))
        except Exception:
            _pdf_logo_height = 35

        _pdf_header_bg = _company.get("pdf_header_bg", "")
        _pdf_header_text_color = _company.get("pdf_header_text_color", "")

        pdf_content = export_to_pdf(formatted_data, cols, title_label,
                                    company_name=_pdf_company_name, logo_url=_logo_url,
                                    pdf_footer_text=_pdf_footer_text,
                                    pdf_header_style=_pdf_header_style,
                                    pdf_logo_height=_pdf_logo_height,
                                    pdf_header_bg=_pdf_header_bg,
                                    pdf_header_text_color=_pdf_header_text_color)
        return Response(
            pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}.pdf"}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format")


# ---------- Settings (key-value store) ----------
@api.get("/data-version")
async def get_data_version():
    return {"version": DATA_VERSION}

@api.get("/settings")
async def get_settings(user: dict = Depends(require_role("super_admin", "admin"))):
    doc = await db.settings.find_one({"_id": "global"})
    if not doc:
        return {}
    out = {**doc}
    out.pop("_id", None)
    # Hide secrets
    if "email" in out and isinstance(out["email"], dict):
        if out["email"].get("password"):
            out["email"]["password"] = "********"
        if out["email"].get("api_key"):
            out["email"]["api_key"] = "********"
    if "whatsapp_cfg" in out and isinstance(out["whatsapp_cfg"], dict):
        if out["whatsapp_cfg"].get("twilio_token"):
            out["whatsapp_cfg"]["twilio_token"] = "********"
        if out["whatsapp_cfg"].get("wa_access_token"):
            out["whatsapp_cfg"]["wa_access_token"] = "********"
    return out


@api.get("/settings/public")
async def get_settings_public():
    doc = await db.settings.find_one({"_id": "global"})
    if not doc:
        return {}
    out = {**doc}
    out.pop("_id", None)
    # Completely remove SMTP credentials and private settings
    out.pop("email", None)
    if "whatsapp_cfg" in out and isinstance(out["whatsapp_cfg"], dict):
        public_wa = {
            "enabled": out["whatsapp_cfg"].get("enabled", False),
            "number": out["whatsapp_cfg"].get("number", ""),
            "default_msg": out["whatsapp_cfg"].get("default_msg", ""),
        }
        out["whatsapp_cfg"] = public_wa
    return out


@api.put("/settings")
async def put_settings(payload: GenericIn, request: Request, user: dict = Depends(require_role("super_admin", "admin"))):
    d = payload.model_dump()
    # don't overwrite stored secrets with the masked value
    existing = await db.settings.find_one({"_id": "global"}) or {}
    if isinstance(d.get("email"), dict):
        if d["email"].get("password") in (None, "", "********"):
            d["email"]["password"] = existing.get("email", {}).get("password", "")
        if d["email"].get("api_key") in (None, "", "********"):
            d["email"]["api_key"] = existing.get("email", {}).get("api_key", "")
    if isinstance(d.get("whatsapp_cfg"), dict):
        if d["whatsapp_cfg"].get("twilio_token") in (None, "", "********"):
            d["whatsapp_cfg"]["twilio_token"] = existing.get("whatsapp_cfg", {}).get("twilio_token", "")
        if d["whatsapp_cfg"].get("wa_access_token") in (None, "", "********"):
            d["whatsapp_cfg"]["wa_access_token"] = existing.get("whatsapp_cfg", {}).get("wa_access_token", "")
    await db.settings.update_one({"_id": "global"}, {"$set": d}, upsert=True)
    await audit(user, "update", "settings", "global", None, request)
    bump_data_version()
    return {"ok": True}


# ---------- Dashboard Analytics ----------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(require_staff)):
    total_leads = await db.leads.count_documents({})
    new_leads = await db.leads.count_documents({"status": "new"})
    won_leads = await db.leads.count_documents({"status": "won"})
    demo_requests = await db.demo_requests.count_documents({})
    quote_requests = await db.quote_requests.count_documents({})
    tickets_open = await db.tickets.count_documents({"status": "open"})
    products = await db.products.count_documents({})
    blogs = await db.blogs.count_documents({})

    # Lead status breakdown
    status_breakdown = {}
    for s in LEAD_STATUSES:
        status_breakdown[s] = await db.leads.count_documents({"status": s})

    # Source breakdown
    source_breakdown = {}
    for s in LEAD_SOURCES:
        source_breakdown[s] = await db.leads.count_documents({"source": s})

    # Leads per day (last 14 days)
    today = datetime.now(timezone.utc).date()
    daily = []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        c = await db.leads.count_documents({
            "created_at": {"$gte": start.isoformat(), "$lt": end.isoformat()}
        })
        daily.append({"date": day.isoformat(), "leads": c})

    return {
        "total_leads": total_leads,
        "new_leads": new_leads,
        "won_leads": won_leads,
        "demo_requests": demo_requests,
        "quote_requests": quote_requests,
        "tickets_open": tickets_open,
        "products": products,
        "blogs": blogs,
        "status_breakdown": status_breakdown,
        "source_breakdown": source_breakdown,
        "daily_leads": daily,
    }


@api.get("/system/stats")
async def system_stats(user: dict = Depends(require_role("super_admin", "admin"))):
    import psutil
    import platform
    import time
    
    # Memory metrics
    try:
        vm = psutil.virtual_memory()
        memory_stats = {
            "total": vm.total,
            "available": vm.available,
            "used": vm.used,
            "percent": vm.percent,
        }
    except Exception as e:
        logger.error(f"Failed to get memory stats: {e}")
        memory_stats = {"total": 0, "available": 0, "used": 0, "percent": 0}

    # CPU metrics
    try:
        cpu_stats = {
            "percent": psutil.cpu_percent(interval=None),
            "count_logical": psutil.cpu_count(logical=True),
            "count_physical": psutil.cpu_count(logical=False),
        }
    except Exception as e:
        logger.error(f"Failed to get CPU stats: {e}")
        cpu_stats = {"percent": 0, "count_logical": 0, "count_physical": 0}

    # Disk metrics
    try:
        du = psutil.disk_usage("/")
        disk_stats = {
            "total": du.total,
            "used": du.used,
            "free": du.free,
            "percent": du.percent,
        }
    except Exception as e:
        logger.error(f"Failed to get disk stats: {e}")
        disk_stats = {"total": 0, "used": 0, "free": 0, "percent": 0}

    # Python Process metrics
    try:
        proc = psutil.Process()
        proc_mem = proc.memory_info().rss
        uptime = time.time() - proc.create_time()
        process_stats = {
            "memory": proc_mem,
            "uptime": uptime,
        }
    except Exception as e:
        logger.error(f"Failed to get process stats: {e}")
        process_stats = {"memory": 0, "uptime": 0}

    # OS Info
    os_info = {
        "system": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "python_version": platform.python_version(),
    }

    return {
        "memory": memory_stats,
        "cpu": cpu_stats,
        "disk": disk_stats,
        "process": process_stats,
        "os": os_info,
    }


# ---------- Uploads ----------
@api.post("/uploads")
async def upload_files(
    files: List[UploadFile] = File(...),
    request: Request = None,
    user: dict = Depends(require_staff),
):
    """Multi-file upload. Returns [{url, original_name, content_type, size, kind}] for each file."""
    if not files:
        raise HTTPException(status_code=400, detail="No files received")
    results = []
    for f in files:
        ext = (f.filename or "").rsplit(".", 1)[-1].lower() if "." in (f.filename or "") else "bin"
        if f.content_type == "application/octet-stream" or not f.content_type:
            content_type = MIME_BY_EXT.get(ext, "application/octet-stream")
        else:
            content_type = f.content_type
            
        if content_type not in ALLOWED_UPLOAD:
            raise HTTPException(status_code=400, detail=f"File type not allowed: {content_type}")

        data = await f.read()
        size = len(data)

        if content_type in ALLOWED_IMAGE and size > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail=f"Image '{f.filename}' exceeds 10MB")
        if content_type in ALLOWED_VIDEO and size > MAX_VIDEO_SIZE:
            raise HTTPException(status_code=413, detail=f"Video '{f.filename}' exceeds 100MB")
        if content_type in ALLOWED_DOC and size > MAX_DOC_SIZE:
            raise HTTPException(status_code=413, detail=f"File '{f.filename}' exceeds 100MB")

        kind = "image" if content_type in ALLOWED_IMAGE else ("video" if content_type in ALLOWED_VIDEO else "file")
        path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
        try:
            stored = _put_object(path, data, content_type)
        except Exception as e:
            logger.error(f"Storage upload failed: {e}")
            raise HTTPException(status_code=502, detail="Upload failed — storage unavailable")

        stored_path = stored.get("path") or path
        await db.files.insert_one({
            "storage_path": stored_path,
            "original_filename": f.filename,
            "content_type": content_type,
            "size": size,
            "kind": kind,
            "uploaded_by": user["id"],
            "is_deleted": False,
            "created_at": now_iso(),
        })
        await audit(user, "upload", "files", stored_path, {"name": f.filename, "size": size}, request)

        results.append({
            "url": f"/api/files/{stored_path}",
            "original_name": f.filename,
            "content_type": content_type,
            "size": size,
            "kind": kind,
            "path": stored_path,
        })
    return results


@api.get("/files/{path:path}")
async def serve_file(path: str):
    """Public file serve. Marketing assets are intentionally public — security through UUID-based paths."""
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ctype = _get_object(path)
    except Exception as e:
        logger.error(f"Storage download failed: {e}")
        raise HTTPException(status_code=502, detail="File temporarily unavailable")
    headers = {
        "Cache-Control": "public, max-age=2592000, immutable",  # 30 days
        "Content-Disposition": f'inline; filename="{record.get("original_filename", "file")}"',
    }
    return Response(content=data, media_type=record.get("content_type") or ctype, headers=headers)


@api.delete("/uploads/{path:path}")
async def soft_delete_file(path: str, request: Request, user: dict = Depends(require_staff)):
    r = await db.files.update_one({"storage_path": path}, {"$set": {"is_deleted": True, "deleted_at": now_iso()}})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Not found")
    await audit(user, "delete", "files", path, None, request)
    return {"ok": True}



@api.get("/")
async def root():
    return {"service": "ORNETOPS API", "status": "ok"}


# ---------- Seed ----------
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@ornetops.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Super Admin", "role": "super_admin",
            "phone": "+91 9999999999", "created_at": now_iso(),
        })
        logger.info(f"Seeded super admin: {admin_email}")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password),
                                            "role": "super_admin"}})
        logger.info("Updated super admin password from env")

    # Seed supreme user
    supreme_email = "supreme.rjchouhan@ornetops.com"
    supreme_password = "QazWsx147852"
    existing_supreme = await db.users.find_one({"email": supreme_email})
    if existing_supreme is None:
        await db.users.insert_one({
            "email": supreme_email, "password_hash": hash_password(supreme_password),
            "name": "R. J. Chouhan", "role": "supreme_user",
            "phone": "+91 9999999999", "created_at": now_iso(),
        })
        logger.info(f"Seeded supreme user: {supreme_email}")
    elif not verify_password(supreme_password, existing_supreme.get("password_hash", "")):
        await db.users.update_one({"email": supreme_email},
                                  {"$set": {"password_hash": hash_password(supreme_password),
                                            "role": "supreme_user"}})
        logger.info("Updated supreme user password")

    # Seed extra demo staff if missing
    demos = [
        ("sales@ornetops.com", "Sales Manager Demo", "sales_manager", "Sales@123"),
        ("content@ornetops.com", "Content Manager Demo", "content_manager", "Content@123"),
    ]
    for em, nm, rl, pw in demos:
        ex = await db.users.find_one({"email": em})
        if ex is None:
            await db.users.insert_one({
                "email": em, "password_hash": hash_password(pw),
                "name": nm, "role": rl, "created_at": now_iso(),
            })

    # Seed categories / sample products if empty
    if await db.categories.count_documents({}) == 0:
        cats = [
            {"slug": "gold-testing", "name": "Gold Testing Machines",
             "description": "Non-destructive gold purity testing systems.", "icon": "Sparkles"},
            {"slug": "xrf-analyzers", "name": "XRF Analyzers",
             "description": "Portable, benchtop and industrial XRF analyzers.", "icon": "ScanLine"},
            {"slug": "hallmarking", "name": "Hallmarking Equipment",
             "description": "BIS-compliant hallmarking equipment.", "icon": "BadgeCheck"},
            {"slug": "laser-marking", "name": "Laser Marking Systems",
             "description": "Precision laser marking for jewellery & bullion.", "icon": "Zap"},
            {"slug": "furnaces", "name": "Induction Furnaces",
             "description": "Compact and industrial induction furnaces.", "icon": "Flame"},
            {"slug": "accessories", "name": "Accessories & Standards",
             "description": "Calibration standards and accessories.", "icon": "Package"},
            {"slug": "software", "name": "Software Solutions",
             "description": "Analysis & lab management software.", "icon": "Code"},
        ]
        for c in cats:
            c["created_at"] = now_iso()
            c["updated_at"] = now_iso()
            await db.categories.insert_one(c)

    if await db.products.count_documents({}) == 0:
        samples = [
            {"slug": "aurum-xrf-pro-9000", "name": "Aurum XRF Pro 9000",
             "category": "xrf-analyzers", "tagline": "Flagship benchtop XRF analyzer",
             "summary": "Industry-leading benchtop XRF for precise gold karat and alloy analysis.",
             "image": "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd",
             "specs": [
                 {"k": "Detector", "v": "Silicon Drift Detector (SDD)"},
                 {"k": "Resolution", "v": "<135 eV"},
                 {"k": "Elements", "v": "Mg to U"},
                 {"k": "Sample Chamber", "v": "200 x 200 x 100 mm"},
                 {"k": "Power", "v": "100-240V AC"},
             ],
             "features": ["Non-destructive testing", "Sub-second karat readout",
                          "Touchscreen UI", "Network/Cloud sync"],
             "price_from": 0, "currency": "INR", "featured": True, "published": True},
            {"slug": "goldscan-portable-x1", "name": "GoldScan Portable X1",
             "category": "gold-testing", "tagline": "Handheld gold tester",
             "summary": "Lightweight handheld XRF for instant on-site karat verification.",
             "image": "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd",
             "specs": [
                 {"k": "Weight", "v": "1.4 kg"},
                 {"k": "Battery", "v": "8 hrs continuous"},
                 {"k": "Display", "v": "5\" capacitive touch"},
             ],
             "features": ["Portable", "10s analysis", "Cloud reports"],
             "featured": True, "published": True},
            {"slug": "hallmark-laser-h500", "name": "Hallmark Laser H500",
             "category": "laser-marking", "tagline": "Precision laser marker",
             "summary": "Fibre laser marking system tailored for BIS hallmarking workflows.",
             "image": "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd",
             "specs": [
                 {"k": "Laser Power", "v": "20W / 30W / 50W"},
                 {"k": "Marking Area", "v": "110 x 110 mm"},
                 {"k": "Speed", "v": "Up to 7000 mm/s"},
             ],
             "features": ["BIS-aligned", "Auto-feeder ready", "Vision alignment"],
             "featured": True, "published": True},
            {"slug": "induction-furnace-if25", "name": "Induction Furnace IF25",
             "category": "furnaces", "tagline": "2.5kg gold melting furnace",
             "summary": "Compact induction furnace for refineries and jewellers.",
             "image": "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd",
             "specs": [{"k": "Capacity", "v": "2.5 kg"}, {"k": "Max Temp", "v": "1600°C"}],
             "features": ["Rapid melt", "Energy efficient", "Tilting pour"],
             "featured": False, "published": True},
        ]
        for p in samples:
            p["created_at"] = now_iso()
            p["updated_at"] = now_iso()
            await db.products.insert_one(p)

    if await db.testimonials.count_documents({}) == 0:
        await db.testimonials.insert_many([
            {"name": "R. Mehta", "title": "Founder, Mehta Jewellers",
             "quote": "ORNETOPS's XRF Pro 9000 has transformed our daily karat verification – fast and bulletproof accuracy.",
             "rating": 5, "created_at": now_iso(), "updated_at": now_iso()},
            {"name": "S. Patel", "title": "Lab Manager, BIS Hallmarking Center",
             "quote": "Their hallmarking laser plus XRF combo is the most reliable setup we've used in 10 years.",
             "rating": 5, "created_at": now_iso(), "updated_at": now_iso()},
            {"name": "K. Raman", "title": "Head, Coastal Refinery",
             "quote": "Service support is outstanding. Calibration and AMC packages are well thought-out.",
             "rating": 5, "created_at": now_iso(), "updated_at": now_iso()},
        ])

    if await db.case_studies.count_documents({}) == 0:
        await db.case_studies.insert_many([
            {"title": "Mehta Chain modernised 32 stores in 90 days",
             "industry": "Jewellery Chain", "challenge": "Inconsistent karat reporting across stores.",
             "solution": "Standardised XRF Pro 9000 with cloud dashboards.",
             "result": "+18% customer trust score; 5x faster verifications.",
             "image": "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd",
             "created_at": now_iso(), "updated_at": now_iso()},
        ])

    if await db.blogs.count_documents({}) == 0:
        await db.blogs.insert_many([
            {"title": "Understanding XRF Technology in 5 minutes",
             "slug": "xrf-technology-explained", "excerpt": "How XRF non-destructively determines element composition.",
             "content": "XRF (X-ray Fluorescence) excites the sample with primary X-rays...",
             "image": "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd",
             "category": "Technology", "published": True,
             "created_at": now_iso(), "updated_at": now_iso()},
            {"title": "BIS Hallmarking 2026 – What Jewellers Should Know",
             "slug": "bis-hallmarking-2026", "excerpt": "Recent BIS updates and how to stay compliant.",
             "content": "The Bureau of Indian Standards has tightened...",
             "image": "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd",
             "category": "Compliance", "published": True,
             "created_at": now_iso(), "updated_at": now_iso()},
        ])


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.leads.create_index("created_at")
    await db.leads.create_index("status")
    await db.products.create_index("slug", unique=True)
    await db.categories.create_index("slug", unique=True)
    await db.blogs.create_index("slug", unique=True)


# Mount
app.include_router(api)

# CORS - allow domain, www subdomain, and direct IP for full compatibility
_frontend_url = os.environ.get("FRONTEND_URL", "")
_cors_origins = list(dict.fromkeys(filter(None, [
    _frontend_url,
    "https://ornetops.online",
    "https://www.ornetops.online",
    "https://141.148.195.149",
    "http://localhost:3000",
])))
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Serve Frontend Static Files ----------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

FRONTEND_BUILD_DIR = ROOT_DIR / ".." / "frontend" / "build"

if FRONTEND_BUILD_DIR.exists():
    # Mount static assets (js, css, media)
    app.mount("/static", StaticFiles(directory=FRONTEND_BUILD_DIR / "static"), name="static")

    _index_cache = {"html": "", "data_version": -1, "seo_hash": ""}

    # Serve the main index.html or root files (like favicon, manifest.json)
    @app.get("/{path_name:path}")
    async def serve_frontend(path_name: str):
        # Exclude API endpoints from static file serving fallback
        if path_name.startswith("api"):
            raise HTTPException(status_code=404, detail="Not found")
            
        # Check if the file exists directly in the build folder (e.g. favicon.ico, manifest.json)
        local_file = FRONTEND_BUILD_DIR / path_name
        if local_file.is_file():
            return FileResponse(local_file)
            
        # Fallback to index.html for React routing
        index_file = FRONTEND_BUILD_DIR / "index.html"
        if not index_file.exists():
            return {"error": "Frontend build files not found"}

        from fastapi.responses import HTMLResponse
        import re
        import hashlib

        # Load settings for dynamic SEO and integrations injection
        try:
            settings = await db.settings.find_one({"_id": "global"})
            seo = settings.get("seo", {}) if settings else {}
            integrations = settings.get("integrations", {}) if settings else {}
        except Exception:
            seo = {}
            integrations = {}

        # Compute hash of SEO and integrations dictionary to detect changes
        combined_str = f"seo:{sorted(seo.items()) if seo else ''}|integrations:{sorted(integrations.items()) if integrations else ''}"
        seo_hash = hashlib.md5(combined_str.encode("utf-8")).hexdigest()

        global DATA_VERSION
        if _index_cache["data_version"] == DATA_VERSION and _index_cache["seo_hash"] == seo_hash and _index_cache["html"]:
            return HTMLResponse(_index_cache["html"])

        try:
            with open(index_file, "r", encoding="utf-8") as f:
                html = f.read()

            title = seo.get("title") or "ORNETOPS — XRF Analyzers, Gold Testing, Hallmarking"
            desc = seo.get("description") or "ORNETOPS is a leading manufacturer of high-precision XRF gold testing machines, hallmarking, and precious metal analysis equipment. BIS compliant and trusted worldwide."
            keywords = seo.get("keywords") or "XRF gold testing, hallmarking machine, gold analyzer, BIS compliance, precious metal analysis, ORNETOPS"
            og_img = seo.get("og_image") or "https://ornetops.online/api/files/ornetops/uploads/6a362c3962cec1e84abd5eee/7b63e224-793b-488a-bbfc-2ad06d9414c3.png"

            # Clean up default tags to prevent duplication
            html = re.sub(r"<title>.*?</title>", "", html, flags=re.IGNORECASE)
            html = re.sub(r'<meta\s+name="description"\s+content=".*?"\s*/?>', "", html, flags=re.IGNORECASE)
            html = re.sub(r'<meta\s+name="keywords"\s+content=".*?"\s*/?>', "", html, flags=re.IGNORECASE)
            html = re.sub(r'<meta\s+property="og:[^"]+?"\s+content=".*?"\s*/?>', "", html, flags=re.IGNORECASE)
            html = re.sub(r'<meta\s+name="twitter:[^"]+?"\s+content=".*?"\s*/?>', "", html, flags=re.IGNORECASE)
            html = re.sub(r'<meta\s+property="twitter:[^"]+?"\s+content=".*?"\s*/?>', "", html, flags=re.IGNORECASE)

            # Build and inject the optimized meta tags
            seo_tags = f"""<title>{title}</title>
    <meta name="description" content="{desc}" />
    <meta name="keywords" content="{keywords}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://ornetops.online/" />
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{desc}" />
    <meta property="og:image" content="{og_img}" />
    <meta property="og:site_name" content="ORNETOPS" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://ornetops.online/" />
    <meta name="twitter:title" content="{title}" />
    <meta name="twitter:description" content="{desc}" />
    <meta name="twitter:image" content="{og_img}" />"""

            # Build and inject integration scripts
            integration_tags = []

            # 1. Google Analytics 4 (GA4)
            ga4_id = integrations.get("ga4")
            if ga4_id:
                integration_tags.append(f"""<!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id={ga4_id}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){{dataLayer.push(arguments);}}
      gtag('js', new Date());
      gtag('config', '{ga4_id}');
    </script>""")

            # 2. Google Tag Manager (GTM)
            gtm_id = integrations.get("gtm")
            if gtm_id:
                integration_tags.append(f"""<!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':
    new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    }})(window,document,'script','dataLayer','{gtm_id}');</script>
    <!-- End Google Tag Manager -->""")

            # 3. Microsoft Clarity
            clarity_id = integrations.get("clarity")
            if clarity_id:
                integration_tags.append(f"""<!-- Microsoft Clarity -->
    <script type="text/javascript">
        (function(c,l,a,r,i,t,y){{
            c[a]=c[a]||function(){{(c[a].q=c[a].q||[]).push(arguments)}};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        }})(window, document, "clarity", "script", "{clarity_id}");
    </script>""")

            # 4. Calendly badge widget
            calendly_url = integrations.get("calendly")
            if calendly_url:
                integration_tags.append(f"""<!-- Calendly badge widget -->
    <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet">
    <script src="https://assets.calendly.com/assets/external/widget.js" type="text/javascript" async></script>
    <script type="text/javascript">
    window.addEventListener('load', function() {{
      if (window.Calendly) {{
        Calendly.initBadgeWidget({{
          url: '{calendly_url}',
          text: 'Schedule a Demo',
          color: '#D4AF37',
          textColor: '#ffffff',
          branding: false
        }});
      }}
    }});
    </script>""")

            all_tags = seo_tags
            if integration_tags:
                all_tags += "\n    " + "\n    ".join(integration_tags)

            # Place right after the <head> tag
            head_tag_match = re.search(r"<head\b[^>]*>", html, re.IGNORECASE)
            if head_tag_match:
                head_tag = head_tag_match.group(0)
                html = html.replace(head_tag, f"{head_tag}\n    {all_tags}")
            else:
                html = f"<head>{all_tags}</head>" + html

            _index_cache["html"] = html
            _index_cache["data_version"] = DATA_VERSION
            _index_cache["seo_hash"] = seo_hash

            return HTMLResponse(html)
        except Exception as e:
            logger.error(f"Error serving frontend index: {e}")
            return FileResponse(index_file)


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ornetops")

try:
    from logging.handlers import RotatingFileHandler
    log_dir = ROOT_DIR / "logs"
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "logs.txt"
    file_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=100, encoding="utf-8")
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logging.getLogger().addHandler(file_handler)
    logger.info("File logger initialized at backend/logs/logs.txt")
except Exception as e:
    logger.warning(f"Failed to initialize file logger: {e}")


@app.on_event("startup")
async def _startup():
    await ensure_indexes()
    await seed_admin()
    try:
        _init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Object storage init deferred: {e}")
    logger.info("ORNETOPS API ready")

@app.on_event("shutdown")
async def _shutdown():
    client.close()
