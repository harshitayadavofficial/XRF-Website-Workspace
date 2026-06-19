from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated, Any

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
app = FastAPI(title="AurumTech Instruments API")
api = APIRouter(prefix="/api")

# ---------- Object Storage (Emergent) ----------
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = "aurumtech"
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
MAX_DOC_SIZE = 25 * 1024 * 1024       # 25 MB


def _init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY missing — uploads disabled")
    r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    r.raise_for_status()
    _storage_key = r.json()["storage_key"]
    return _storage_key


def _put_object(path: str, data: bytes, content_type: str) -> dict:
    key = _init_storage()
    r = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=180,
    )
    if r.status_code == 403:
        global _storage_key
        _storage_key = None
        key = _init_storage()
        r = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=180,
        )
    r.raise_for_status()
    return r.json()


def _get_object(path: str):
    key = _init_storage()
    r = requests.get(f"{STORAGE_URL}/objects/{path}",
                     headers={"X-Storage-Key": key}, timeout=120)
    if r.status_code == 403:
        global _storage_key
        _storage_key = None
        key = _init_storage()
        r = requests.get(f"{STORAGE_URL}/objects/{path}",
                         headers={"X-Storage-Key": key}, timeout=120)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


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
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=8 * 3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=7 * 24 * 3600, path="/")


# ---------- Models ----------
def _id_str(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)

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
    "super_admin", "admin",
    "sales_manager", "sales_executive",
    "service_manager", "service_executive",
    "content_manager", "dealer_manager", "customer",
]

ROLE_PERMISSIONS = {
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
    return role in {"super_admin", "admin", "sales_manager", "sales_executive",
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
        if user["role"] not in roles and user["role"] != "super_admin":
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
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items() if k != "password"}
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
        d["created_at"] = now_iso()
        d["updated_at"] = now_iso()
        r = await db[coll].insert_one(d)
        await audit(user, "create", coll, str(r.inserted_id), None, request)
        return {**doc_out({**d, "_id": r.inserted_id})}

    @api.patch(f"/{coll}/{{iid}}")
    async def update_item(iid: str, payload: GenericIn, request: Request, user: dict = Depends(require_role(*allowed_roles))):
        d = payload.model_dump()
        d["updated_at"] = now_iso()
        try:
            r = await db[coll].update_one({"_id": ObjectId(iid)}, {"$set": d})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid id")
        if not r.matched_count:
            raise HTTPException(status_code=404, detail="Not found")
        await audit(user, "update", coll, iid, None, request)
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
        items.append(doc_out(d))
    return items

@api.post("/leads/public")
async def public_create_lead(payload: LeadCreateIn, request: Request):
    """Public endpoint - used by contact/inquiry forms."""
    d = payload.model_dump()
    d["status"] = "new"
    d["assigned_to"] = None
    d["notes"] = []
    d["created_at"] = now_iso()
    d["updated_at"] = now_iso()
    d["ip"] = request.client.host if request.client else ""
    r = await db.leads.insert_one(d)
    # mock email notification: just log
    logger.info(f"[LEAD] New lead from {d.get('email')} - {d.get('name')} - source={d.get('source')}")
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
async def public_demo(payload: DemoRequestIn):
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
    return {"ok": True}

@api.post("/quote-requests/public")
async def public_quote(payload: QuoteRequestIn):
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


# ---------- Settings (key-value store) ----------
@api.get("/settings")
async def get_settings():
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
    await db.settings.update_one({"_id": "global"}, {"$set": d}, upsert=True)
    await audit(user, "update", "settings", "global", None, request)
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
        content_type = f.content_type or MIME_BY_EXT.get(ext, "application/octet-stream")
        if content_type not in ALLOWED_UPLOAD:
            raise HTTPException(status_code=400, detail=f"File type not allowed: {content_type}")

        data = await f.read()
        size = len(data)

        if content_type in ALLOWED_IMAGE and size > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail=f"Image '{f.filename}' exceeds 10MB")
        if content_type in ALLOWED_VIDEO and size > MAX_VIDEO_SIZE:
            raise HTTPException(status_code=413, detail=f"Video '{f.filename}' exceeds 100MB")
        if content_type in ALLOWED_DOC and size > MAX_DOC_SIZE:
            raise HTTPException(status_code=413, detail=f"File '{f.filename}' exceeds 25MB")

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
    return {"service": "AurumTech API", "status": "ok"}


# ---------- Seed ----------
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@aurumtech.com").lower()
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

    # Seed extra demo staff if missing
    demos = [
        ("sales@aurumtech.com", "Sales Manager Demo", "sales_manager", "Sales@123"),
        ("content@aurumtech.com", "Content Manager Demo", "content_manager", "Content@123"),
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
             "quote": "AurumTech's XRF Pro 9000 has transformed our daily karat verification – fast and bulletproof accuracy.",
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

# CORS - use explicit origin with credentials
frontend_url = os.environ.get("FRONTEND_URL", "*")
cors_origins = [frontend_url] if frontend_url != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("aurumtech")


@app.on_event("startup")
async def _startup():
    await ensure_indexes()
    await seed_admin()
    try:
        _init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Object storage init deferred: {e}")
    logger.info("AurumTech API ready")

@app.on_event("shutdown")
async def _shutdown():
    client.close()
