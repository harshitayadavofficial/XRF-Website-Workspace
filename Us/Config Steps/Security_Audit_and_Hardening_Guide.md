# Security Audit & Hardening Guide for ORNETOPS

This guide provides a security analysis of the current ORNETOPS web application deployment (UAT environment) and outlines recommended settings to secure the infrastructure, API, database, and front-end against common OWASP vulnerabilities.

---

## 1. Network & HTTPS Hardening

### SSL/TLS Configuration
- **Current State**: The UAT deployment uses Let's Encrypt certificates or falls back to a self-signed cert. The `nginx.conf` restricts protocols to `TLSv1.2` and `TLSv1.3`, which is excellent.
- **Vulnerability / Gap**: The Nginx configuration uses `ssl_ciphers HIGH:!aNULL:!MD5;`. This includes older, less secure ciphers.
- **Hardening Action**:
  Update `ssl_ciphers` to use modern, secure cipher suites that support forward secrecy (PFS). For example:
  ```nginx
  ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
  ssl_prefer_server_ciphers on;
  ```

### HTTP Strict Transport Security (HSTS)
- **Current State**: Missing. If a user visits `http://ornetops.online`, they are redirected to `https://`, but an active attacker on the network can intercept the initial HTTP request (Man-in-the-Middle).
- **Hardening Action**:
  Add the HSTS header to the HTTPS server block in `nginx.conf`:
  ```nginx
  add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
  ```

---

## 2. Authentication & JWT Hardening

### Cookie Security
- **Current State**:
  - The JWT tokens are stored in cookies (`access_token` and `refresh_token`).
  - The `set_auth_cookies` helper parses `COOKIE_SECURE` from the environment.
  - In `deploy_to_uat.bat`, UAT deployment patches the environment to set `COOKIE_SECURE=true`.
  - When `cookie_secure` is true, cookies are flagged `Secure` and `SameSite=None`.
- **Vulnerability / Gap**:
  - `SameSite=None` allows cookies to be sent on cross-site requests, making the site susceptible to Cross-Site Request Forgery (CSRF) if CORS or validation logic is bypassed.
- **Hardening Action**:
  - Since the API and Frontend are hosted on the same domain (`ornetops.online` serving both backend api route and frontend build), change `samesite` in production to `"lax"` (or even `"strict"` for write operations) to enforce CSRF protection.
  ```python
  # In backend/server.py
  samesite = "lax"  # Ensure SameSite is Lax even when Secure is true to block CSRF
  ```

### JWT Lifetimes & Secrets
- **Current State**:
  - Access token expires in 8 hours.
  - Refresh token expires in 7 days.
  - Local development secret is set in `.env` as `local_development_secret_key_123456`.
- **Hardening Action**:
  - **Do NOT reuse the development secret in production.** The production VM environment must generate and store a high-entropy string (at least 32 bytes) for `JWT_SECRET` in `~/app/backend/.env`.
  - Consider reducing the access token expiry from 8 hours to 15–30 minutes, relying on the refresh token endpoint to obtain a new access token seamlessly.

---

## 3. Application & File Upload Security

### Upload Type & Path Validation
- **Current State**:
  - Restricted to specific MIME types (`ALLOWED_UPLOAD` covering common images, videos, PDF, glb, and gltf).
  - Maximum upload size is enforced (10MB for images, 100MB for docs/videos).
  - Storage paths use a randomized UUID (`uuid.uuid4()`) which prevents ID enumeration attacks.
- **Vulnerability / Gap**:
  - Path traversal vulnerability when serving files: `@api.get("/files/{path:path}")` passes the raw path to `_get_object`, which looks up `UPLOAD_DIR / path`. If `path` contains `../` sequences, it can result in a **Directory Traversal** attack allowing reading arbitrary files on the system.
- **Hardening Action**:
  - Prevent directory traversal by sanitizing the requested path in the local storage handler. Update `_get_object` to resolve the absolute path and verify it stays inside `UPLOAD_DIR`:
  ```python
  def _get_object(path: str):
      _init_storage()
      # Prevent traversal by resolving and verifying bounds
      target_file = (UPLOAD_DIR / path).resolve()
      if not str(target_file).startswith(str(UPLOAD_DIR.resolve())):
          raise HTTPException(status_code=400, detail="Access denied")
      if not target_file.exists() or target_file.is_dir():
          raise FileNotFoundError(f"Local file not found: {path}")
      ...
  ```

### Rate Limiting on Authentication & Logins
- **Current State**:
  - The login endpoint (`/auth/login`) has a lockout system (`login_attempts` collection locking accounts for 15 minutes after 5 failures).
  - The generic `rate_limit` utility is only applied to public submissions (leads, quote requests, demo requests).
- **Hardening Action**:
  - Apply the rate-limiting decorator/dependency directly to the login endpoint as a second layer of defense against distributed brute-force attacks:
  ```python
  @api.post("/auth/login")
  async def login(payload: LoginIn, response: Response, request: Request):
      rate_limit(request)  # Prevent rapid login requests
      ...
  ```

---

## 4. Content Security Policy (CSP) & Client Headers

### Security Headers
- **Current State**:
  - Nginx applies:
    - `X-Frame-Options "SAMEORIGIN"` (prevents Clickjacking).
    - `X-Content-Type-Options "nosniff"` (prevents MIME-sniffing).
    - `X-XSS-Protection "1; mode=block"` (legacy protection).
    - `Referrer-Policy "strict-origin-when-cross-origin"`.
    - `Permissions-Policy` disabling camera, microphone, and geolocation.
- **Vulnerability / Gap**:
  - No Content Security Policy (CSP) is active. CSP prevents unauthorized inline scripts, stylesheets, and connections (mitigating XSS and data exfiltration).
- **Hardening Action**:
  - Add a CSP header in `nginx.conf`. Note that React inline scripts, Google fonts, and PostHog require specific exceptions.
  ```nginx
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://assets.emergent.sh https://us.i.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://us.i.posthog.com; connect-src 'self' https://us.i.posthog.com https://ornetops.online; frame-ancestors 'none';" always;
  ```

---

## 5. Security Checklist for Production Rollout

1. **Verify production secrets**: Generate secure secrets for MongoDB connections, JWT tokens, and SMTP email credentials.
2. **Update SameSite attribute**: Ensure session cookies are set to `SameSite=Lax` to protect administrators against cross-origin forgery.
3. **Audit filesystem permissions**: Ensure the directory containing the app and uploads is readable/writable only by the application running user (i.e. don't run containers or processes as host root unless strictly necessary).
4. **Implement directory traversal checks**: Harden the local file resolver in `server.py` to prevent reading files outside the designated upload directory.
5. **Enable HSTS**: Ensure user traffic is locked to HTTPS.
