# Info on Integrations

Here is the complete information for each field in your Integrations panel:

| Integration | What it is | Example Format | Purpose / Benefit |
| :--- | :--- | :--- | :--- |
| **Google Analytics 4 ID** | A web analytics tool by Google. | `G-12ABC34DEF` | Tracks page views, user locations, visitor counts, and session lengths to show you website traffic reports. |
| **Google Tag Manager ID** | A tag management platform. | `GTM-A1BC2DE` | Allows you to deploy marketing tags, tracking codes, and custom HTML scripts to your site without editing the source code. |
| **Microsoft Clarity ID** | A user behavior recording tool. | `h3f7g9a8s2` | Provides session recordings (videos of what users do) and heatmaps showing where users click and scroll. |
| **Calendly URL** | An online appointment scheduler. | `https://calendly.com/ornetops` | Adds a booking page/button to your site so customers can schedule demos or consultations with you. |

---

## 1. Are these free of cost?
Yes, they all have completely free tiers that are more than enough for most businesses:

* **Google Analytics 4:** **100% Free** (No traffic limits for standard reporting).
* **Google Tag Manager:** **100% Free**.
* **Microsoft Clarity:** **100% Free** (Clarity is completely free with no limits on traffic or recorded sessions).
* **Calendly:** **Free Basic Plan** (Allows you to set up 1 active meeting type, e.g., a "30-Minute Consultation/Demo", completely free). You only pay if you need complex team scheduling or multiple meeting options.

---

## 2. How to integrate each one:
To integrate them, you do not need to change any code. You just get the IDs from their dashboards and paste them into your admin panel.

### Google Analytics 4 (GA4):
1. Go to [analytics.google.com](https://analytics.google.com) and log in with your Google account.
2. Click **Admin** (gear icon) > **Create Account** / **Create Property**.
3. Name your property (e.g., "Ornetops") and select your timezone.
4. For **Data Stream**, select **Web**, enter your URL: `https://ornetops.online`, and name the stream.
5. Google will show you a page with your **Measurement ID** (starts with `G-`).
6. Copy that `G-` ID and paste it into the **Google Analytics 4 ID** field in your Admin Panel.

### Google Tag Manager (GTM):
1. Go to [tagmanager.google.com](https://tagmanager.google.com) and log in.
2. Click **Create Account**, name it, and choose your country.
3. Under **Container Setup**, enter `ornetops.online`, select **Web** as the Target Platform, and click **Create**.
4. You will see a popup with code, and in the top-right corner, your GTM ID (e.g., `GTM-XXXXXXX`).
5. Copy that GTM ID and paste it into the **Google Tag Manager ID** field in your Admin Panel.

### Microsoft Clarity:
1. Go to [clarity.microsoft.com](https://clarity.microsoft.com) and log in.
2. Click **New Project**, enter your project name (e.g., "Ornetops Website"), and type your URL: `https://ornetops.online`.
3. Go to **Settings** > **Setup**.
4. You will see a **Project ID** in the overview or inside the tracking code URL.
5. Copy that Project ID and paste it into the **Microsoft Clarity ID** field in your Admin Panel.

### Calendly:
1. Go to [calendly.com](https://calendly.com) and sign up.
2. Create a meeting event (e.g. "Book a Product Demo").
3. Go to your Calendly dashboard, click **Copy Link** on that event card. It will look like `https://calendly.com/your-username/book-demo`.
4. Paste that link into the **Calendly URL** field in your Admin Panel.
