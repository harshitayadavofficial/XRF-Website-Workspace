# Website Performance Testing Guide for ORNETOPS

> This guide covers multiple free tools and methods to measure your website's
> performance, load time, SEO score, and identify optimization opportunities.

---

## 1. Google PageSpeed Insights (Recommended - Free)

**URL:** https://pagespeed.web.dev/

### How to Use:
1. Open https://pagespeed.web.dev/
2. Enter your URL: `https://ornetops.online/`
3. Click **Analyze**
4. Wait 30-60 seconds for results

### What You Get:
| Metric                         | Good Score  | Description                                    |
|--------------------------------|-------------|------------------------------------------------|
| **Performance**                | 90-100      | Overall speed score                            |
| **First Contentful Paint**     | < 1.8s      | Time until first visible content               |
| **Largest Contentful Paint**   | < 2.5s      | Time until largest element loads               |
| **Total Blocking Time**        | < 200ms     | Time JS blocks user interaction                |
| **Cumulative Layout Shift**    | < 0.1       | Visual stability (elements jumping around)     |
| **Speed Index**                | < 3.4s      | How quickly content is visually populated       |
| **Accessibility**              | 90-100      | Screen reader, color contrast, ARIA labels     |
| **Best Practices**             | 90-100      | HTTPS, no console errors, image formats        |
| **SEO**                        | 90-100      | Meta tags, headings, mobile-friendly           |

### Test Both Modes:
- **Mobile** (default) — stricter, simulates 4G + slow CPU
- **Desktop** — tests on desktop connection speed

---

## 2. GTmetrix (Free Account)

**URL:** https://gtmetrix.com/

### How to Use:
1. Go to https://gtmetrix.com/
2. Enter: `https://ornetops.online/`
3. Click **Test your site**
4. Wait 1-2 minutes

### What You Get:
- **GTmetrix Grade** (A-F)
- **Web Vitals** (LCP, TBT, CLS)
- **Page load time** (in seconds)
- **Total page size** (in MB)
- **Number of requests**
- **Waterfall chart** showing what loads and when
- **Historical tracking** (with free account)

---

## 3. WebPageTest (Advanced - Free)

**URL:** https://www.webpagetest.org/

### How to Use:
1. Go to https://www.webpagetest.org/
2. Enter: `https://ornetops.online/`
3. Choose test location (e.g., Mumbai, India)
4. Choose browser (Chrome)
5. Click **Start Test**

### What You Get:
- **First View vs Repeat View** comparison
- **Waterfall chart** with DNS, Connect, TLS, TTFB breakdown
- **Filmstrip view** (visual progress frame by frame)
- **Content breakdown** (JS, CSS, images, fonts by size)
- **Connection view** (parallel requests visualization)

---

## 4. Chrome DevTools (Built-in - Free)

### How to Use:
1. Open https://ornetops.online/ in Chrome
2. Press **F12** (or right-click → Inspect)
3. Go to the **Network** tab
4. Reload the page (Ctrl+Shift+R for hard reload)
5. Check the bottom bar for: **requests count**, **transferred size**, **finish time**

### Lighthouse Audit (inside DevTools):
1. Open DevTools (F12)
2. Click the **Lighthouse** tab
3. Select categories: Performance, Accessibility, Best Practices, SEO
4. Select Device: Mobile or Desktop
5. Click **Analyze page load**
6. Wait 30-60 seconds for the report

---

## 5. Uptime & Monitoring Tools (Free Tiers)

| Tool                  | URL                                    | Free Tier                      |
|-----------------------|----------------------------------------|--------------------------------|
| **UptimeRobot**       | https://uptimerobot.com/               | 50 monitors, 5-min intervals   |
| **Freshping**         | https://freshping.io/                  | 50 monitors, 1-min intervals   |
| **StatusCake**        | https://statuscake.com/                | 10 monitors, 5-min intervals   |

These send you email/SMS alerts if your site goes down.

---

## 6. Security & SSL Check

| Tool                  | URL                                                  | What It Checks               |
|-----------------------|------------------------------------------------------|------------------------------|
| **SSL Labs**          | https://www.ssllabs.com/ssltest/                     | SSL certificate grade (A-F)  |
| **Security Headers**  | https://securityheaders.com/                         | HTTP security headers        |
| **Mozilla Observatory** | https://observatory.mozilla.org/                   | Overall security score       |

---

## 7. Your Built-in System Stats

Your ORNETOPS admin panel already has a **System Stats** endpoint:

- **URL:** https://ornetops.online/api/system/stats
- **Access:** Admin only (requires login)
- **Shows:** CPU %, Memory usage, Disk usage, Process uptime

---

## Quick Checklist for Performance Optimization

### Already Implemented ✅
- [x] Gzip compression enabled in Nginx
- [x] Static file caching (30-day Cache-Control headers)
- [x] Production React build (minified JS/CSS)
- [x] HTTPS/SSL via Let's Encrypt

### Recommended Improvements 🔧
- [ ] **Image optimization** — Convert images to WebP format
- [ ] **Lazy loading** — Add `loading="lazy"` to below-fold images
- [ ] **Code splitting** — Break the 595KB JS bundle into smaller chunks
- [ ] **CDN** — Consider Cloudflare (free tier) for global edge caching
- [ ] **Preconnect hints** — Add `<link rel="preconnect">` for external domains
- [ ] **Font subsetting** — Load only required character sets from Google Fonts

---

## Recommended Testing Frequency

| When                          | What to Test                          |
|-------------------------------|---------------------------------------|
| After every deployment        | PageSpeed Insights (quick check)      |
| Weekly                        | GTmetrix (track trends)               |
| Monthly                       | Full Lighthouse audit + WebPageTest   |
| After major content changes   | PageSpeed + check image sizes         |

---

*Last Updated: 24 June 2026*
*For: ORNETOPS (ornetops.online)*
