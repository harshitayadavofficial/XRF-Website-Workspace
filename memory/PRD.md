# AurumTech Instruments — Product Requirements Document

## Original Problem Statement
Enterprise website for "AurumTech Instruments" — a placeholder brand for a company specializing in Gold Testing Machines, XRF Analyzers, Hallmarking Equipment, Laser Marking, Furnaces & Calibration Standards. The deliverable must compete with Helmut Fischer, Thermo Fisher, Bruker, Hitachi, Evident & Rigaku. Built around four pillars: Trust · Product · Knowledge · Lead Generation. Full enterprise Admin Panel (CMS + CRM + RBAC + WhatsApp/Email + Support Tickets + Audit Log + Settings + Analytics). Light/Dark theme. Interactive 3D product viewer (Three.js, GLB/GLTF). API-first architecture.

## User Choices (verbatim)
- Scope: "Full admin CMS + CRM first, minimal website"
- Branding: "not as of now create it" → using placeholder "AurumTech Instruments" with premium gold/dark theme
- AI Assistant: Skip
- Integrations v1: Email config UI (delivery MOCKED) + WhatsApp click-to-chat + JWT admin auth; payments deferred
- 3D viewer: support all formats (GLB/GLTF) — no real models yet, ship placeholder

## Architecture
- Backend: FastAPI + MongoDB (Motor). Single `server.py` with consolidated routes & RBAC.
- Frontend: React 19 + Tailwind + shadcn/ui + Three.js (@react-three/fiber + drei) + recharts.
- Auth: bcrypt + JWT (httpOnly cookies). 9-role RBAC. Admin seeded from .env.
- Theme: dark default with gold (#D4AF37) primary; light mode supported.

## Implemented (2026-02-19)
### Backend
- JWT auth (login/logout/me) with httpOnly secure cookies, brute-force lockout.
- 9-role RBAC enforced via FastAPI deps. Audit logging for all writes.
- Admin seeding (3 demo accounts), DB indexes, sample products/categories/blogs/testimonials/case studies.
- CMS CRUD for 14 collections (products, categories, industries, technologies, solutions, services, blogs, case_studies, testimonials, events, dealers, careers, downloads, faqs).
- Lead CRM: pipeline (7 statuses), assignment, follow-up notes, source tracking, public inquiry endpoint.
- Demo/Quote requests: public endpoint auto-creates a Lead. Admin can update statuses.
- Support Tickets: public submission + admin status workflow.
- Settings store: company, social, email config, WhatsApp config, SEO, integrations (GA4/GTM/Clarity/Calendly).
- Dashboard analytics endpoint (counts, status breakdown, source breakdown, 14-day daily lead chart).

### Frontend — Admin Console
- Login screen, AuthProvider with cookie session check.
- AdminLayout (sidebar + topbar + theme toggle + role badge).
- Dashboard with 8 KPI cards + 2 charts (line + bar).
- Leads page: Kanban (7 columns) + Table view, search, source filter, status moves, notes, new lead dialog, detail dialog.
- Products CRUD with specs/features editors + 3D model URL field.
- Generic CrudPage powering 8 CMS modules (categories, industries, services, blogs, case studies, testimonials, events, dealers).
- RequestList page powering Demo/Quote/Tickets inboxes with inline status updates.
- Users page (invite/edit/delete + role management).
- Settings page with 6 tabs (Company / Social / Email / WhatsApp / SEO / Integrations).
- Audit Log viewer.

### Frontend — Public Website (minimal but premium)
- Layout: glass-blur sticky nav, floating WhatsApp + Call buttons, footer.
- Home: hero w/ 3D viewer, stats strip, categories, industries, why-choose-us, featured products, testimonials, case studies/blogs, CTA.
- Products list (with category filter + search) + Product Detail (3D viewer, specs, applications, inquiry tab, related products).
- Industries, Technology, Services, Resources (blog/case studies/downloads tabs), Contact (form + map + tiles).
- Request Demo + Request Quote with success states.

## Test Credentials
- admin@aurumtech.com / Admin@123 (super_admin)
- sales@aurumtech.com / Sales@123 (sales_manager)
- content@aurumtech.com / Content@123 (content_manager)

## Backlog
### P0 (after first user review)
- Real email delivery via SendGrid/Resend (currently MOCKED — config stored)
- File upload for product 3D models & media (object storage integration)
- Lead assignment UI (drag-drop to user, currently API-only)

### P1
- Multi-language support (i18n scaffold)
- Product Comparison tool, ROI Calculator, Product Finder questionnaire
- AI Assistant (deferred per user choice)
- Live Chat widget
- Calendly embed for Demo booking
- Dealer locator map + Become-a-dealer form

### P2
- WhatsApp Business API automation (currently click-to-chat only)
- Payment gateway integrations (Razorpay/Stripe) for AMC/Service charges
- CRM integrations (Salesforce/HubSpot/Zoho)
- 2FA, login history, active sessions
- Schema markup, sitemap.xml, robots.txt, full SEO automation
- Mobile app, Customer Portal, Dealer Portal
