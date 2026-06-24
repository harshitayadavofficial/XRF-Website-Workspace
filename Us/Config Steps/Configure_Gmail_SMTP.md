# Gmail SMTP Configuration Guide for ORNETOPS

> This guide explains how to configure Gmail as the email provider for outbound
> notifications (lead alerts, quote confirmations, demo request emails, etc.)
> in the ORNETOPS Admin Panel.

---

## What You Need (All Free)

| Setting          | Value                                              |
|------------------|----------------------------------------------------|
| **Provider**     | `Gmail` (or `Generic SMTP`)                        |
| **SMTP Host**    | `smtp.gmail.com`                                   |
| **SMTP Port**    | `587`                                              |
| **Username**     | Your full Gmail address (e.g. `yourcompany@gmail.com`) |
| **Password**     | A **Google App Password** (NOT your regular Gmail password) |
| **From Address** | Same Gmail address (e.g. `yourcompany@gmail.com`)  |

---

## Step-by-Step: Get a Google App Password

### Prerequisites
- A Gmail or Google Workspace account
- 2-Step Verification must be enabled on the account

### Step 1: Enable 2-Step Verification

1. Open your browser and go to: https://myaccount.google.com/security
2. Sign in with your Gmail account
3. Under **"How you sign in to Google"**, click **2-Step Verification**
4. Follow the on-screen prompts to enable it (you'll verify with your phone number)
5. Once enabled, you'll see a green checkmark next to "2-Step Verification"

### Step 2: Generate an App Password

1. Go to: https://myaccount.google.com/apppasswords
2. You may need to sign in again and verify your identity
3. In the **"App name"** field, type: `ORNETOPS Mail`
4. Click **Create**
5. Google will display a **16-character password** like: `abcd efgh ijkl mnop`
6. **Copy this password immediately** (remove spaces when pasting)

> ⚠️ **IMPORTANT:** Google shows this password **only once**. If you lose it,
> you'll need to delete it and generate a new one from the same page.

---

## Step-by-Step: Configure in ORNETOPS Admin Panel

1. Go to **https://ornetops.online/admin/settings**
2. Log in with your admin credentials
3. Click the **"Email"** tab in the settings page
4. Toggle **"Enable outbound emails"** → ON
5. Fill in the following fields:

   | Field                          | Value                              |
   |--------------------------------|------------------------------------|
   | **Provider**                   | `Gmail`                            |
   | **SMTP Host**                  | `smtp.gmail.com`                   |
   | **SMTP Port**                  | `587`                              |
   | **Username**                   | `yourcompany@gmail.com`            |
   | **Password / SMTP Token**      | Paste the 16-char App Password     |
   | **From Address**               | `yourcompany@gmail.com`            |

6. Click **"Save changes"** at the top of the page
7. Wait for the **"Settings saved"** toast notification

---

## Gmail Sending Limits (Free Tier)

| Limit                    | Personal Gmail | Google Workspace (Paid) |
|--------------------------|:--------------:|:-----------------------:|
| Emails per day           | 500            | 2,000                   |
| Recipients per message   | 100            | 100                     |
| Max attachment size      | 25 MB          | 25 MB                   |

For a CRM notification system (lead alerts, quote emails), the free
500/day limit is more than sufficient for most businesses.

---

## Using Google Workspace (Optional, Recommended)

If you have a custom domain (e.g. `hello@ornetops.online`), you can use
**Google Workspace** instead of a personal Gmail account:

- Same setup steps apply (enable 2-Step Verification → create App Password)
- Emails will come from your business domain instead of `@gmail.com`
- Higher sending limit: 2,000 emails/day
- Google Workspace starts at $6/user/month

---

## Troubleshooting

| Issue                                  | Solution                                                  |
|----------------------------------------|-----------------------------------------------------------|
| "Authentication failed"                | Make sure you're using the **App Password**, not your regular Gmail password |
| "Less secure apps" error               | App Passwords bypass this — no need to enable less secure apps |
| "App Passwords" page not visible       | You must enable **2-Step Verification** first              |
| Emails going to spam                   | Set up SPF/DKIM records for your domain (Google Workspace) |
| "Daily limit exceeded"                 | Wait 24 hours or upgrade to Google Workspace               |

---

## Quick Reference

```
Host:     smtp.gmail.com
Port:     587
Security: STARTTLS (handled automatically by the backend)
Auth:     Username + App Password
```

---

*Last Updated: 23 June 2026*
*For: ORNETOPS (ornetops.online) Admin Panel*
