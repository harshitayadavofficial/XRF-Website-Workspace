"""Notification helpers: email via SMTP/Resend + WhatsApp via Meta or Twilio."""
import smtplib
import logging
import os
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("ornetops")

DEFAULT_TEMPLATES = {
    "contact_admin": {
        "subject": "New CRM Lead: {name}",
        "body": "<h3>New Lead Submitted</h3><p><b>Name:</b> {name}<br><b>Email:</b> {email}<br><b>Phone:</b> {phone}<br><b>Company:</b> {company}<br><b>Message:</b> {message}</p>"
    },
    "contact_customer": {
        "subject": "Thank you for contacting ORNETOPS",
        "body": "<p>Dear {name},</p><p>Thank you for reaching out to ORNETOPS. We have received your message and our team will get back to you shortly.</p>"
    },
    "demo_admin": {
        "subject": "New Demo Request: {name}",
        "body": "<h3>Demo Request Details</h3><p><b>Name:</b> {name}<br><b>Email:</b> {email}<br><b>Phone:</b> {phone}<br><b>Product Interest:</b> {product_interest}<br><b>Preferred Date:</b> {preferred_date}<br><b>Message:</b> {message}</p>"
    },
    "demo_customer": {
        "subject": "ORNETOPS Demo Request Confirmed",
        "body": "<p>Dear {name},</p><p>Thank you for requesting a demo of the {product_interest}. We have received your request and will schedule a demo for you soon.</p>"
    },
    "quote_admin": {
        "subject": "New Quote Request: {name}",
        "body": "<h3>Quote Request Details</h3><p><b>Name:</b> {name}<br><b>Email:</b> {email}<br><b>Phone:</b> {phone}<br><b>Product:</b> {product}<br><b>Quantity:</b> {quantity}<br><b>Message:</b> {message}</p>"
    },
    "quote_customer": {
        "subject": "ORNETOPS Quote Request Confirmed",
        "body": "<p>Dear {name},</p><p>Thank you for requesting a quote for {product}. Our sales team is reviewing it and will send you a quotation shortly.</p>"
    }
}

def format_template(text: str, data: dict) -> str:
    """Format template string by replacing placeholders safely."""
    placeholders = {
        "name": data.get("name", "") or "Customer",
        "email": data.get("email", "") or "",
        "phone": data.get("phone", "") or "",
        "company": data.get("company", "") or "",
        "city": data.get("city", "") or "",
        "country": data.get("country", "") or "",
        "product_interest": data.get("product_interest", "") or data.get("product", "") or "",
        "product": data.get("product", "") or data.get("product_interest", "") or "",
        "quantity": str(data.get("quantity", 1)),
        "preferred_date": data.get("preferred_date", "") or "",
        "message": data.get("message", "") or ""
    }
    for k, v in placeholders.items():
        text = text.replace("{" + k + "}", str(v))
    return text

def get_logo_attachment(settings: dict) -> dict:
    """Helper to locate, read, and package the company logo from settings as a MIME inline attachment."""
    if not isinstance(settings, dict):
        return None
    logo_cfg = settings.get("logo", {})
    if not isinstance(logo_cfg, dict):
        return None
    logo_url = logo_cfg.get("image_light") or logo_cfg.get("image") or logo_cfg.get("image_dark") or ""
    if not logo_url:
        return None
    
    clean_url = logo_url.split("?")[0]
    idx = clean_url.find("/api/files/")
    if idx == -1:
        return None
    
    rel_path = "uploads/" + clean_url[idx + len("/api/files/"):]
    from pathlib import Path
    logo_file = Path(__file__).parent / rel_path
    if logo_file.exists():
        try:
            ext = logo_file.suffix.lower().replace(".", "")
            mime = "image/png"
            if ext in ("jpg", "jpeg"):
                mime = "image/jpeg"
            elif ext == "gif":
                mime = "image/gif"
            elif ext == "webp":
                mime = "image/webp"
            elif ext == "svg":
                mime = "image/svg+xml"
            with open(logo_file, "rb") as f:
                content = f.read()
            return {
                "content": content,
                "filename": f"logo.{ext}",
                "content_type": mime,
                "cid": "company_logo"
            }
        except Exception as e:
            logger.error(f"Error reading logo file for email: {e}")
    return None


def wrap_email_html(body_content: str, company_name: str, has_logo_cid: bool = False) -> str:
    """Wrap email body in a beautiful gold/dark hallmark themed layout."""
    year = datetime.now().year
    
    if has_logo_cid:
        logo_html = f'<img src="cid:company_logo" alt="{company_name}" height="40" style="height: 40px; border: 0; display: block; margin: 0 auto 10px auto;" />'
    else:
        logo_html = f'<h2 style="color: #eab308; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">{company_name}</h2>'

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="background-color: #18181b; padding: 25px; text-align: center; border-bottom: 2px solid #eab308;">
      {logo_html}
    </div>
    <div style="padding: 30px; line-height: 1.6; font-size: 15px; color: #444444;">
      {body_content}
    </div>
    <div style="background-color: #f4f4f5; padding: 15px; text-align: center; font-size: 11px; color: #71717a; border-top: 1px solid #e5e5e5;">
      &copy; {year} {company_name}. All rights reserved.<br>
      Precision Hallmarking & Gold Analysis Systems.
    </div>
  </div>
</body>
</html>
"""


async def send_email(cfg: dict, to: str, subject: str, body_html: str, attachments: list = None, raise_errors: bool = False):
    """Send HTML email using config settings."""
    if not cfg.get("enabled"):
        logger.info(f"[EMAIL-SKIPPED] Sending disabled: {subject} -> {to}")
        return

    provider = cfg.get("provider", "smtp")
    from_address = cfg.get("from", "noreply@ornetops.com")
    
    try:
        if provider in ("smtp", "gmail"):
            _smtp_send(cfg, to, subject, body_html, attachments)
        elif provider == "resend":
            await _resend_send(cfg, to, subject, body_html, attachments)
        elif provider == "sendgrid":
            await _sendgrid_send(cfg, to, subject, body_html, attachments)
        elif provider == "brevo":
            api_key = cfg.get("api_key", "")
            if api_key.startswith("xsmtpsib-"):
                logger.info(f"[BREVO-SMTP-FALLBACK] SMTP key detected, routing via Brevo SMTP relay for {to}")
                smtp_cfg = {
                    **cfg,
                    "host": "smtp-relay.brevo.com",
                    "port": 587,
                    "user": cfg.get("from", ""),
                    "password": api_key
                }
                _smtp_send(smtp_cfg, to, subject, body_html, attachments)
            else:
                await _brevo_send(cfg, to, subject, body_html, attachments)
        else:
            logger.warning(f"[EMAIL-UNSUPPORTED] Unknown email provider: {provider}")
            return
        logger.info(f"[EMAIL-SENT] {provider} -> {to} | {subject}")
    except Exception as e:
        logger.error(f"[EMAIL-ERROR] {provider} -> {to}: {e}", exc_info=True)
        if raise_errors:
            raise e


def _smtp_send(cfg: dict, to: str, subject: str, body_html: str, attachments: list = None):
    """Send email via SMTP."""
    from email.mime.base import MIMEBase
    from email.mime.image import MIMEImage
    from email import encoders

    if attachments:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        from_addr = cfg.get("from", cfg.get("user", ""))
        msg["From"] = from_addr
        msg["To"] = to

        body_part = MIMEMultipart("alternative")
        body_part.attach(MIMEText(body_html, "html"))
        msg.attach(body_part)

        for att in attachments:
            content = att["content"]
            filename = att["filename"]
            content_type = att.get("content_type", "application/octet-stream")
            cid = att.get("cid")

            if cid:
                maintype, subtype = content_type.split("/", 1)
                img = MIMEImage(content, _subtype=subtype)
                img.add_header("Content-ID", f"<{cid}>")
                img.add_header("Content-Disposition", "inline", filename=filename)
                msg.attach(img)
            else:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(content)
                encoders.encode_base64(part)
                part.add_header("Content-Disposition", f"attachment; filename=\"{filename}\"")
                msg.attach(part)
    else:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        from_addr = cfg.get("from", cfg.get("user", ""))
        msg["From"] = from_addr
        msg["To"] = to
        msg.attach(MIMEText(body_html, "html"))
    
    host = cfg.get("host", "smtp.gmail.com")
    port = int(cfg.get("port", 587))
    
    with smtplib.SMTP(host, port, timeout=15) as server:
        server.ehlo()
        server.starttls()
        server.login(cfg["user"], cfg["password"])
        server.sendmail(from_addr, [to], msg.as_string())


async def _resend_send(cfg: dict, to: str, subject: str, body_html: str, attachments: list = None):
    """Send email via Resend API."""
    import httpx
    import base64
    api_key = cfg.get("api_key", "")
    from_addr = cfg.get("from", "noreply@ornetops.com")
    
    payload = {
        "from": from_addr,
        "to": [to],
        "subject": subject,
        "html": body_html
    }
    
    if attachments:
        resend_attachments = []
        for att in attachments:
            b64_content = base64.b64encode(att["content"]).decode("utf-8")
            att_dict = {
                "content": b64_content,
                "filename": att["filename"],
            }
            if att.get("cid"):
                att_dict["id"] = att["cid"]
            resend_attachments.append(att_dict)
        payload["attachments"] = resend_attachments
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json=payload
        )
        r.raise_for_status()


async def _sendgrid_send(cfg: dict, to: str, subject: str, body_html: str, attachments: list = None):
    """Send email via SendGrid API."""
    import httpx
    import base64
    api_key = cfg.get("api_key", "")
    from_addr = cfg.get("from", "noreply@ornetops.com")
    
    payload = {
        "personalizations": [{"to": [{"email": to}]}],
        "from": {"email": from_addr},
        "subject": subject,
        "content": [{"type": "text/html", "value": body_html}]
    }
    
    if attachments:
        sg_attachments = []
        for att in attachments:
            b64_content = base64.b64encode(att["content"]).decode("utf-8")
            att_dict = {
                "content": b64_content,
                "filename": att["filename"],
                "type": att.get("content_type", "application/octet-stream"),
                "disposition": "inline" if att.get("cid") else "attachment"
            }
            if att.get("cid"):
                att_dict["content_id"] = att["cid"]
            sg_attachments.append(att_dict)
        payload["attachments"] = sg_attachments
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json=payload
        )
        r.raise_for_status()


async def _brevo_send(cfg: dict, to: str, subject: str, body_html: str, attachments: list = None):
    """Send email via Brevo REST API."""
    import httpx
    import base64
    api_key = cfg.get("api_key", "")
    from_addr = cfg.get("from", "noreply@ornetops.com")
    
    payload = {
        "sender": {"email": from_addr},
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": body_html
    }
    
    if attachments:
        brevo_attachments = []
        for att in attachments:
            b64_content = base64.b64encode(att["content"]).decode("utf-8")
            att_dict = {
                "content": b64_content,
                "name": att["filename"]
            }
            brevo_attachments.append(att_dict)
        payload["attachment"] = brevo_attachments
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": api_key,
                "Content-Type": "application/json"
            },
            json=payload
        )
        r.raise_for_status()

async def send_whatsapp(wa_cfg: dict, to_number: str, message: str):
    """Send WhatsApp message prioritizing settings UI config, then falling back to environment variables."""
    # Settings UI credentials
    twilio_sid = wa_cfg.get("twilio_sid") or os.environ.get("TWILIO_SID", "")
    twilio_token = wa_cfg.get("twilio_token") or os.environ.get("TWILIO_TOKEN", "")
    twilio_from = wa_cfg.get("twilio_wa_from") or os.environ.get("TWILIO_WA_FROM", "whatsapp:+14155238886")
    
    meta_phone_id = wa_cfg.get("wa_phone_id") or os.environ.get("WA_PHONE_ID", "")
    meta_token = wa_cfg.get("wa_access_token") or os.environ.get("WA_ACCESS_TOKEN", "")

    # Clean phone numbers
    # Ensure to_number has numbers only
    clean_to = "".join(filter(str.isdigit, to_number))
    if not clean_to:
        logger.warning("[WA-SKIPPED] Recipient WhatsApp number is empty or invalid.")
        return

    try:
        # Check Meta Cloud API first
        if meta_phone_id and meta_token:
            await _meta_wa_send(meta_phone_id, meta_token, clean_to, message)
        # Check Twilio sandbox
        elif twilio_sid and twilio_token:
            # Twilio wants a plus-sign prefix in number format
            to_with_plus = f"+{clean_to}"
            await _twilio_wa_send(twilio_sid, twilio_token, twilio_from, to_with_plus, message)
        else:
            logger.info("[WA-SKIPPED] No WhatsApp credentials configured (neither Twilio nor Meta).")
    except Exception as e:
        logger.error(f"[WA-ERROR] Failed to send WhatsApp to {to_number}: {e}", exc_info=True)

async def _meta_wa_send(phone_id: str, token: str, to: str, text: str):
    """Send WhatsApp message via Meta Cloud API."""
    import httpx
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"https://graph.facebook.com/v19.0/{phone_id}/messages",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": text}
            }
        )
        r.raise_for_status()
        logger.info(f"[WA-META-SENT] Success status: {r.status_code} to {to}")

async def _twilio_wa_send(sid: str, token: str, from_: str, to: str, text: str):
    """Send WhatsApp message via Twilio REST API."""
    import httpx
    # Ensure from_ is correctly prefixed
    sender = from_ if from_.startswith("whatsapp:") else f"whatsapp:{from_}"
    recipient = to if to.startswith("whatsapp:") else f"whatsapp:{to}"
    
    async with httpx.AsyncClient(auth=(sid, token), timeout=15.0) as client:
        r = await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
            data={
                "From": sender,
                "To": recipient,
                "Body": text
            }
        )
        r.raise_for_status()
        logger.info(f"[WA-TWILIO-SENT] Success status: {r.status_code} to {to}")


async def notify_new_submission(db, form_type: str, data: dict):
    """Background task to handle new submission notifications."""
    try:
        # Load settings
        cfg = await db.settings.find_one({"_id": "global"}) or {}
        email_cfg = cfg.get("email", {})
        wa_cfg = cfg.get("whatsapp_cfg", {})
        company_name = cfg.get("company", {}).get("name", "ORNETOPS")
        
        # Get logo attachment
        logo_att = get_logo_attachment(cfg)
        attachments = [logo_att] if logo_att else None
        has_logo = logo_att is not None
        
        # Get admin contact details
        admin_email = cfg.get("company", {}).get("email", "")
        if not admin_email or admin_email.strip() == "":
            admin_user = await db.users.find_one({"role": "super_admin"})
            if admin_user:
                admin_email = admin_user.get("email")
                
        admin_phone = os.environ.get("WA_NOTIFY_NUMBER") or wa_cfg.get("number") or ""
        if not admin_phone or admin_phone.strip() == "":
            admin_user = await db.users.find_one({"role": "super_admin"})
            if admin_user:
                admin_phone = admin_user.get("phone") or ""

        # Fetch configured templates from settings
        templates_cfg = cfg.get("templates", {})
        
        # 1. ADMIN EMAIL ALERT
        admin_tmpl = templates_cfg.get(f"{form_type}_admin") or DEFAULT_TEMPLATES[f"{form_type}_admin"]
        admin_subject = format_template(admin_tmpl.get("subject", ""), data)
        admin_body_raw = format_template(admin_tmpl.get("body", ""), data)
        admin_body_html = wrap_email_html(admin_body_raw, company_name, has_logo)
        
        if admin_email:
            await send_email(email_cfg, admin_email, admin_subject, admin_body_html, attachments)
            
        # 2. CUSTOMER CONFIRMATION EMAIL
        customer_email = data.get("email")
        if customer_email:
            cust_tmpl = templates_cfg.get(f"{form_type}_customer") or DEFAULT_TEMPLATES[f"{form_type}_customer"]
            cust_subject = format_template(cust_tmpl.get("subject", ""), data)
            cust_body_raw = format_template(cust_tmpl.get("body", ""), data)
            cust_body_html = wrap_email_html(cust_body_raw, company_name, has_logo)
            await send_email(email_cfg, customer_email, cust_subject, cust_body_html, attachments)

        # 3. ADMIN WHATSAPP ALERT
        if admin_phone:
            # Build WhatsApp message text
            name = data.get("name", "")
            phone = data.get("phone", "")
            email = data.get("email", "")
            company = data.get("company", "") or "N/A"
            msg_text = data.get("message", "") or ""
            
            if form_type == "contact":
                wa_msg = f"🔔 *New CRM Lead (Contact Form)*\n\n*Name:* {name}\n*Phone:* {phone}\n*Email:* {email}\n*Company:* {company}\n*Message:* {msg_text}"
            elif form_type == "demo":
                prod = data.get("product_interest", "") or "Gold Analyzer"
                pref_date = data.get("preferred_date", "") or "Not scheduled"
                wa_msg = f"🔔 *New Demo Request*\n\n*Name:* {name}\n*Phone:* {phone}\n*Email:* {email}\n*Product:* {prod}\n*Pref Date:* {pref_date}"
            else:
                prod = data.get("product", "") or "Gold Analyzer"
                qty = data.get("quantity", 1)
                wa_msg = f"🔔 *New Quote Request*\n\n*Name:* {name}\n*Phone:* {phone}\n*Email:* {email}\n*Product:* {prod}\n*Quantity:* {qty}"
                
            await send_whatsapp(wa_cfg, admin_phone, wa_msg)

    except Exception as e:
        logger.error(f"[NOTIFICATION-SYSTEM-ERROR] Failed to run notifications for {form_type}: {e}", exc_info=True)


async def send_blog_notification_emails(db, blog_doc: dict, config: dict):
    """
    Sends email notifications about a blog post to customers.
    config: {"enabled": True, "recipients": "all" | ["email1", "email2", ...]}
    """
    try:
        global_cfg = await db.settings.find_one({"_id": "global"}) or {}
        email_cfg = global_cfg.get("email", {})
        company_name = global_cfg.get("company", {}).get("name", "ORNETOPS")

        if not email_cfg.get("enabled"):
            logger.info("[BLOG-EMAIL-SKIPPED] Email system disabled globally")
            return

        recipients_option = config.get("recipients", "all")
        emails = []

        if isinstance(recipients_option, list):
            emails = [e for e in recipients_option if e and isinstance(e, str) and "@" in e]
        else:
            emails = await db.leads.distinct("email")
            emails = [e for e in emails if e and isinstance(e, str) and "@" in e]

        if not emails:
            logger.info("[BLOG-EMAIL-SKIPPED] No valid recipient emails found")
            return

        title = blog_doc.get("title", "New Article Available")
        excerpt = blog_doc.get("excerpt", "")
        category = blog_doc.get("category", "Updates")
        image = blog_doc.get("image", "")

        frontend_url = os.environ.get("FRONTEND_URL", "https://ornetops.online").rstrip("/")
        blog_url = f"{frontend_url}/resources"

        logo_att = get_logo_attachment(global_cfg)
        attachments = [logo_att] if logo_att else None
        has_logo = logo_att is not None

        body_content = f"""
        <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #eab308; color: #18181b; padding: 4px 8px; font-size: 10px; font-weight: bold; text-transform: uppercase; border-radius: 4px; tracking-widest: 1px;">{category.upper()}</span>
            <h2 style="color: #18181b; font-size: 22px; margin-top: 10px; margin-bottom: 10px;">{title}</h2>
        </div>
        """

        if image:
            backend_url = os.environ.get("BACKEND_URL", "https://ornetops.online/api").rstrip("/")
            if image.startswith("/api/files/"):
                img_src = backend_url + image
            elif image.startswith("http"):
                img_src = image
            else:
                img_src = backend_url + f"/files/{image}"

            body_content += f"""
            <div style="margin-bottom: 20px; border-radius: 6px; overflow: hidden; text-align: center;">
                <img src="{img_src}" alt="{title}" style="max-width: 100%; height: auto; border: 0; display: block; margin: 0 auto;" />
            </div>
            """

        body_content += f"""
        <p style="font-size: 15px; color: #444444; line-height: 1.6; margin-bottom: 25px;">{excerpt}</p>
        <div style="text-align: center; margin-top: 20px; margin-bottom: 10px;">
            <a href="{blog_url}" target="_blank" style="background-color: #18181b; color: #eab308; border: 1px solid #eab308; padding: 12px 24px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 4px; display: inline-block; transition: background-color 0.2s;">Read Full Article</a>
        </div>
        """

        body_html = wrap_email_html(body_content, company_name, has_logo)
        subject = f"New Article: {title}"

        import asyncio
        for email in emails:
            asyncio.create_task(send_email(email_cfg, email, subject, body_html, attachments))

        logger.info(f"[BLOG-EMAIL-NOTIFICATIONS] Dispatched notifications to {len(emails)} customers")

    except Exception as e:
        logger.error(f"Error in send_blog_notification_emails: {e}", exc_info=True)
