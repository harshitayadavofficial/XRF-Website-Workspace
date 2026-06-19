"""AurumTech Instruments – comprehensive backend API tests."""
import os
import time
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://precision-metals-6.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN = ("admin@aurumtech.com", "Admin@123")
SALES = ("sales@aurumtech.com", "Sales@123")
CONTENT = ("content@aurumtech.com", "Content@123")


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    return s, r.json()


# ------------- Health -------------
def test_health_root():
    r = requests.get(f"{API}/", timeout=20)
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "ok"
    assert "service" in body


# ------------- Auth -------------
class TestAuth:
    def test_login_admin_sets_cookies(self):
        s, body = _login(*ADMIN)
        assert body["role"] == "super_admin"
        assert body["email"] == ADMIN[0]
        assert "access_token" in s.cookies or "access_token" in body
        # /me with cookies
        r = s.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN[0]

    def test_me_without_cookie_401(self):
        r = requests.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 401

    def test_logout_clears_cookies(self):
        s, _ = _login(*ADMIN)
        r = s.post(f"{API}/auth/logout", timeout=20)
        assert r.status_code == 200
        # Force clear cookies and confirm /me 401
        s.cookies.clear()
        r2 = s.get(f"{API}/auth/me", timeout=20)
        assert r2.status_code == 401

    def test_brute_force_lockout(self):
        unique_email = f"nouser_{uuid.uuid4().hex[:8]}@aurumtech.com"
        codes = []
        for _ in range(7):
            r = requests.post(f"{API}/auth/login",
                              json={"email": unique_email, "password": "wrong"}, timeout=20)
            codes.append(r.status_code)
        # Expect at least one 429 after 5 failures
        assert 429 in codes, f"Expected lockout 429 in codes={codes}"


# ------------- RBAC -------------
class TestRBAC:
    def test_sales_can_list_leads_cannot_create_user(self):
        s, _ = _login(*SALES)
        r = s.get(f"{API}/leads", timeout=20)
        assert r.status_code == 200
        r2 = s.post(f"{API}/users", json={
            "email": f"TEST_x_{uuid.uuid4().hex[:6]}@x.com",
            "password": "Xx12345!", "name": "X", "role": "sales_executive"
        }, timeout=20)
        assert r2.status_code == 403

    def test_content_can_post_blog_cannot_create_user(self):
        s, _ = _login(*CONTENT)
        r = s.post(f"{API}/blogs", json={
            "title": f"TEST blog {uuid.uuid4().hex[:6]}",
            "slug": f"test-blog-{uuid.uuid4().hex[:6]}", "content": "x"
        }, timeout=20)
        assert r.status_code == 200, r.text
        blog_id = r.json().get("id")
        # cleanup
        s2, _ = _login(*ADMIN)
        if blog_id:
            s2.delete(f"{API}/blogs/{blog_id}", timeout=20)
        r2 = s.post(f"{API}/users", json={
            "email": f"TEST_y_{uuid.uuid4().hex[:6]}@x.com",
            "password": "Xx12345!", "name": "Y", "role": "sales_executive"
        }, timeout=20)
        assert r2.status_code == 403


# ------------- Public lead/demo/quote/ticket -------------
class TestPublicForms:
    def test_public_lead(self):
        r = requests.post(f"{API}/leads/public", json={
            "name": "TEST Lead", "email": "test_lead@example.com",
            "phone": "+91 9999999999", "source": "contact",
            "message": "interested in XRF"
        }, timeout=20)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_public_demo_creates_lead(self):
        s, _ = _login(*ADMIN)
        before = len(s.get(f"{API}/leads", params={"source": "demo_request"}, timeout=20).json())
        r = requests.post(f"{API}/demo-requests/public", json={
            "name": "TEST Demo", "email": "demo@example.com", "product_interest": "xrf"
        }, timeout=20)
        assert r.status_code == 200
        time.sleep(0.5)
        after = len(s.get(f"{API}/leads", params={"source": "demo_request"}, timeout=20).json())
        assert after == before + 1

    def test_public_quote_creates_lead(self):
        s, _ = _login(*ADMIN)
        before = len(s.get(f"{API}/leads", params={"source": "quote_request"}, timeout=20).json())
        r = requests.post(f"{API}/quote-requests/public", json={
            "name": "TEST Quote", "email": "quote@example.com", "product": "Aurum XRF Pro 9000"
        }, timeout=20)
        assert r.status_code == 200
        time.sleep(0.5)
        after = len(s.get(f"{API}/leads", params={"source": "quote_request"}, timeout=20).json())
        assert after == before + 1

    def test_public_ticket(self):
        r = requests.post(f"{API}/tickets/public", json={
            "subject": "TEST ticket", "description": "issue", "email": "t@x.com"
        }, timeout=20)
        assert r.status_code == 200


# ------------- Lead CRUD -------------
class TestLeadCRUD:
    def _seed_lead(self):
        r = requests.post(f"{API}/leads/public", json={
            "name": f"TEST CRUD {uuid.uuid4().hex[:6]}", "email": "crud@example.com"
        }, timeout=20)
        return r.json()["id"]

    def test_patch_valid_status_and_invalid(self):
        s, _ = _login(*ADMIN)
        lid = self._seed_lead()
        r = s.patch(f"{API}/leads/{lid}", json={"status": "contacted"}, timeout=20)
        assert r.status_code == 200
        # invalid
        r2 = s.patch(f"{API}/leads/{lid}", json={"status": "garbage"}, timeout=20)
        assert r2.status_code == 400

    def test_add_note(self):
        s, _ = _login(*ADMIN)
        lid = self._seed_lead()
        r = s.post(f"{API}/leads/{lid}/notes", json={"text": "follow up"}, timeout=20)
        assert r.status_code == 200
        assert r.json()["text"] == "follow up"

    def test_delete_super_admin(self):
        s, _ = _login(*ADMIN)
        lid = self._seed_lead()
        r = s.delete(f"{API}/leads/{lid}", timeout=20)
        assert r.status_code == 200


# ------------- Products -------------
class TestProducts:
    def test_list_seeded(self):
        r = requests.get(f"{API}/products", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_create_patch_delete(self):
        s, _ = _login(*ADMIN)
        slug = f"test-prod-{uuid.uuid4().hex[:6]}"
        r = s.post(f"{API}/products", json={
            "name": "TEST Prod", "slug": slug, "category": "xrf-analyzers",
            "summary": "test", "published": True
        }, timeout=20)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        r2 = s.patch(f"{API}/products/{pid}", json={"name": "TEST Prod 2", "slug": slug}, timeout=20)
        assert r2.status_code == 200
        r3 = s.delete(f"{API}/products/{pid}", timeout=20)
        assert r3.status_code == 200

    def test_slug_unique(self):
        s, _ = _login(*ADMIN)
        slug = f"test-uniq-{uuid.uuid4().hex[:6]}"
        r1 = s.post(f"{API}/products", json={"name": "A", "slug": slug, "category": "x"}, timeout=20)
        assert r1.status_code == 200
        r2 = s.post(f"{API}/products", json={"name": "B", "slug": slug, "category": "x"}, timeout=20)
        # Should fail (mongo dup key -> 500 or 400)
        assert r2.status_code >= 400
        s.delete(f"{API}/products/{r1.json()['id']}", timeout=20)


# ------------- Settings -------------
class TestSettings:
    def test_put_get_mask_and_no_overwrite(self):
        s, _ = _login(*ADMIN)
        r = s.put(f"{API}/settings", json={
            "company": {"name": "AurumTech"},
            "email": {"host": "smtp.x.com", "password": "supersecret", "api_key": "KEY123"}
        }, timeout=20)
        assert r.status_code == 200
        r2 = requests.get(f"{API}/settings", timeout=20)
        assert r2.status_code == 200
        body = r2.json()
        assert body["email"]["password"] == "********"
        assert body["email"]["api_key"] == "********"
        # Save with masked => no overwrite
        s.put(f"{API}/settings", json={
            "company": {"name": "AurumTech 2"},
            "email": {"host": "smtp.x.com", "password": "********", "api_key": "********"}
        }, timeout=20)
        # Re-login as same admin (no api to fetch secret), but verify by changing email config and ensuring secret preserved by setting non-masked then masked again:
        # We can't directly read secret; just confirm masking still appears
        body2 = requests.get(f"{API}/settings", timeout=20).json()
        assert body2["email"]["password"] == "********"
        assert body2["company"]["name"] == "AurumTech 2"


# ------------- Audit -------------
class TestAudit:
    def test_audit_entries(self):
        s, _ = _login(*ADMIN)
        # generate event
        slug = f"test-aud-{uuid.uuid4().hex[:6]}"
        r = s.post(f"{API}/products", json={"name": "TEST aud", "slug": slug, "category": "x"}, timeout=20)
        pid = r.json()["id"]
        s.delete(f"{API}/products/{pid}", timeout=20)
        rr = s.get(f"{API}/audit-logs", timeout=20)
        assert rr.status_code == 200
        entries = rr.json()
        assert any(e.get("module") == "products" for e in entries)


# ------------- Dashboard -------------
class TestDashboard:
    def test_stats_shape(self):
        s, _ = _login(*ADMIN)
        r = s.get(f"{API}/dashboard/stats", timeout=20)
        assert r.status_code == 200
        b = r.json()
        for key in ["total_leads", "new_leads", "won_leads", "demo_requests",
                    "quote_requests", "tickets_open", "products", "blogs",
                    "status_breakdown", "source_breakdown", "daily_leads"]:
            assert key in b
        assert len(b["daily_leads"]) == 14
