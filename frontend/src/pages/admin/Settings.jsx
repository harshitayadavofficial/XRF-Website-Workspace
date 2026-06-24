import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import FileUpload from "@/components/FileUpload";
import { usePublicSettings } from "@/context/SettingsContext";


export default function Settings() {
  const [s, setS] = useState(null);
  const { refresh } = usePublicSettings();

  const load = async () => {
    const { data } = await api.get("/settings");
    setS({
      company: { 
        name: "ORNETOPS", 
        tagline: "Precision Engineered for Precious Metals", 
        phone: "+91 99999 99999", 
        email: "hello@ornetops.com", 
        whatsapp: "+919999999999", 
        address: "Mumbai, India", 
        website: "https://ornetops.com", 
        footer_bottom_text: "Engineered with precision · ISO • BIS • NABL",
        pdf_footer_text: "{company_name} | {title}",
        pdf_header_style: "dark",
        pdf_logo_height: 35,
        pdf_company_name: "ORNETOPS",
        pdf_logo: "",
        pdf_header_bg: "",
        pdf_header_text_color: "",
        ...(data.company || {}) 
      },
      logo: { mode: "text", text: "ORNETOPS", image: "", image_light: "", image_dark: "", ...(data.logo || {}) },
      footer_logo: { mode: "inherit", text: "", image: "", image_light: "", image_dark: "", height: 32, width: "", description: "", ...(data.footer_logo || {}) },
      social: { linkedin: "", twitter: "", youtube: "", facebook: "", instagram: "", color: "#D4AF37", ...(data.social || {}) },

      email: { provider: "smtp", host: "smtp.gmail.com", port: 587, user: "", password: "", from: "", api_key: "", enabled: false, ...(data.email || {}) },
      whatsapp_cfg: { 
        number: "+919999999999", 
        default_msg: "Hi, I'd like to know more about ORNETOPS products.", 
        enabled: true, 
        twilio_sid: "", 
        twilio_token: "", 
        twilio_wa_from: "whatsapp:+14155238886", 
        wa_phone_id: "", 
        wa_access_token: "",
        ...(data.whatsapp_cfg || {}) 
      },
      seo: { title: "ORNETOPS — XRF Analyzers, Gold Testing, Hallmarking", description: "Premium XRF analyzers, gold testing machines, hallmarking and laser marking equipment by ORNETOPS.", keywords: "XRF, gold testing, hallmarking, BIS, refinery, ornetops", og_image: "", ...(data.seo || {}) },
      integrations: { ga4: "", gtm: "", clarity: "", calendly: "", ...(data.integrations || {}) },
      announcements: {
        top: {
          enabled: false,
          interval: 6,
          items: [],
          ...(data.announcements?.top || {}),
        },
        home: {
          enabled: false,
          interval: 6,
          items: [],
          ...(data.announcements?.home || {}),
        },
      },
      hero: {
        slides: [],
        interval: 6,
        ...(data.hero || {}),
      },
      trust_logos_cfg: { enabled: true, title: "Trusted by Industry Leaders", eyebrow: "Partnerships", height: 40, ...(data.trust_logos_cfg || {}) },
      trust_logos: data.trust_logos || [],
      
      locations: data.locations || [
        { name: "Mumbai Headquarters", address: "Mumbai, India", map_url: "https://www.openstreetmap.org/export/embed.html?bbox=72.78%2C18.85%2C73.0%2C19.10&layer=mapnik" }
      ],
      about: { 
        title: "About ORNETOPS", 
        tagline: "Pioneering XRF & Gold Testing Technology", 
        story: "ORNETOPS is a leading developer and manufacturer of high-precision X-ray Fluorescence (XRF) spectrometers for precious metal analysis, serving refineries, jewellers, and BIS hallmarking centers worldwide.", 
        mission: "To deliver robust, BIS-compliant testing systems with unmatched accuracy and speed, fostering trust in the global jewelry and refining industries.", 
        vision: "To be the global benchmark for gold and precious metal analysis technologies, continuously pushing the boundaries of precision and reliability.", 
        banner_image: "", 
        ...(data.about || {}) 
      },
      templates: {
        contact_admin: { subject: "New CRM Lead: {name}", body: "<h3>New Lead Submitted</h3><p><b>Name:</b> {name}<br><b>Email:</b> {email}<br><b>Phone:</b> {phone}<br><b>Company:</b> {company}<br><b>Message:</b> {message}</p>" },
        contact_customer: { subject: "Thank you for contacting ORNETOPS", body: "<p>Dear {name},</p><p>Thank you for reaching out to ORNETOPS. We have received your message and our team will get back to you shortly.</p>" },
        demo_admin: { subject: "New Demo Request: {name}", body: "<h3>Demo Request Details</h3><p><b>Name:</b> {name}<br><b>Email:</b> {email}<br><b>Phone:</b> {phone}<br><b>Product Interest:</b> {product_interest}<br><b>Preferred Date:</b> {preferred_date}<br><b>Message:</b> {message}</p>" },
        demo_customer: { subject: "ORNETOPS Demo Request Confirmed", body: "<p>Dear {name},</p><p>Thank you for requesting a demo of the {product_interest}. We have received your request and will schedule a demo for you soon.</p>" },
        quote_admin: { subject: "New Quote Request: {name}", body: "<h3>Quote Request Details</h3><p><b>Name:</b> {name}<br><b>Email:</b> {email}<br><b>Phone:</b> {phone}<br><b>Product:</b> {product}<br><b>Quantity:</b> {quantity}<br><b>Message:</b> {message}</p>" },
        quote_customer: { subject: "ORNETOPS Quote Request Confirmed", body: "<p>Dear {name},</p><p>Thank you for requesting a quote for {product}. Our sales team is reviewing it and will send you a quotation shortly.</p>" },
        ...(data.templates || {})
      }
    });
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api.put("/settings", s);
      toast.success("Settings saved");
      await refresh(); // Propagate changes to all public pages immediately
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    }
  };

  if (!s) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const setSec = (section, partial) => setS({ ...s, [section]: { ...s[section], ...partial } });

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div className="flex justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">System</div>
          <h1 className="text-3xl font-medium tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure company, email, WhatsApp, SEO & integrations</p>
        </div>
        <Button onClick={save} data-testid="settings-save"> Save changes</Button>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="company" data-testid="tab-company">Company & HQ</TabsTrigger>
          <TabsTrigger value="logo" data-testid="tab-logo">Logo & Branding</TabsTrigger>
          <TabsTrigger value="about" data-testid="tab-about">About Us</TabsTrigger>
          <TabsTrigger value="hero" data-testid="tab-hero">Hero Slides</TabsTrigger>
          <TabsTrigger value="trust_logos" data-testid="tab-trust-logos">Trust Logos</TabsTrigger>
          <TabsTrigger value="announcements" data-testid="tab-announcements">Announcements</TabsTrigger>
          <TabsTrigger value="social" data-testid="tab-social">Social</TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email">Email</TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">Email Templates</TabsTrigger>
          <TabsTrigger value="whatsapp" data-testid="tab-whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="seo" data-testid="tab-seo">SEO</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
        </TabsList>


        <TabsContent value="company">
          <Card><CardContent className="p-6 grid gap-3 sm:grid-cols-2">
            <F label="Company Name" v={s.company.name} on={(v) => setSec("company", { name: v })} testid="set-company-name" />
            <F label="Tagline" v={s.company.tagline} on={(v) => setSec("company", { tagline: v })} testid="set-tagline" />
            <F label="Phone" v={s.company.phone} on={(v) => setSec("company", { phone: v })} testid="set-phone" />
            <F label="Email" v={s.company.email} on={(v) => setSec("company", { email: v })} testid="set-email" />
            <F label="WhatsApp Number" v={s.company.whatsapp} on={(v) => setSec("company", { whatsapp: v })} testid="set-wa" />
            <F label="Website" v={s.company.website} on={(v) => setSec("company", { website: v })} testid="set-website" />
            <div className="sm:col-span-2 mb-4"><Label className="text-xs uppercase tracking-widest">Address</Label><Textarea className="mt-1.5" value={s.company.address || ""} onChange={(e) => setSec("company", { address: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <LocationsEditor s={s} setS={setS} />
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="logo">
          <div className="space-y-6">
            {/* Header Logo */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-base font-medium">Header Logo Settings</h3>
                  <p className="text-xs text-muted-foreground">Configure the logo displayed in the top navigation header.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs uppercase tracking-widest">Logo Mode</Label>
                    <Select value={s.logo.mode || "text"} onValueChange={(v) => setSec("logo", { mode: v })}>
                      <SelectTrigger className="mt-1.5" data-testid="set-logo-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text Only</SelectItem>
                        <SelectItem value="image">Image Only</SelectItem>
                        <SelectItem value="both">Both (Image & Text)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <F label="Logo Text" v={s.logo.text} on={(v) => setSec("logo", { text: v })} testid="set-logo-text" />
                  
                  <div>
                    <Label className="text-xs uppercase tracking-widest mb-1.5 block">Logo Image - Light Theme</Label>
                    <FileUpload value={s.logo.image_light || ""} onChange={(v) => setSec("logo", { image_light: v })} mode="single" accept="image" testid="set-logo-image-light" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-widest mb-1.5 block">Logo Image - Dark Theme</Label>
                    <FileUpload value={s.logo.image_dark || ""} onChange={(v) => setSec("logo", { image_dark: v })} mode="single" accept="image" testid="set-logo-image-dark" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs uppercase tracking-widest mb-1.5 block">Default Logo Image (Fallback)</Label>
                    <FileUpload value={s.logo.image || ""} onChange={(v) => setSec("logo", { image: v })} mode="single" accept="image" testid="set-logo-image" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer Logo */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-base font-medium">Footer Logo Settings</h3>
                  <p className="text-xs text-muted-foreground">Configure the logo displayed in the bottom footer.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs uppercase tracking-widest">Logo Mode</Label>
                    <Select value={s.footer_logo?.mode || "inherit"} onValueChange={(v) => setSec("footer_logo", { mode: v })}>
                      <SelectTrigger className="mt-1.5" data-testid="set-footer-logo-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">Inherit Header Logo</SelectItem>
                        <SelectItem value="text">Text Only</SelectItem>
                        <SelectItem value="image">Image Only</SelectItem>
                        <SelectItem value="both">Both (Image & Text)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs uppercase tracking-widest">Logo Height (px)</Label>
                    <Input
                      type="number"
                      min={16}
                      max={200}
                      className="mt-1.5"
                      value={s.footer_logo?.height ?? 32}
                      onChange={(e) => setSec("footer_logo", { height: Number(e.target.value) || "" })}
                      data-testid="set-footer-logo-height"
                    />
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-widest">Logo Width (px)</Label>
                    <Input
                      type="text"
                      className="mt-1.5"
                      placeholder="auto"
                      value={s.footer_logo?.width ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSec("footer_logo", { width: val === "" ? "" : (Number(val) || val) });
                      }}
                      data-testid="set-footer-logo-width"
                    />
                  </div>
                </div>

                {s.footer_logo?.mode !== "inherit" && (
                  <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
                    <div className="sm:col-span-2">
                      <F label="Logo Text" v={s.footer_logo?.text} on={(v) => setSec("footer_logo", { text: v })} testid="set-footer-logo-text" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-widest mb-1.5 block">Logo Image - Light Theme</Label>
                      <FileUpload value={s.footer_logo?.image_light || ""} onChange={(v) => setSec("footer_logo", { image_light: v })} mode="single" accept="image" testid="set-footer-logo-image-light" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-widest mb-1.5 block">Logo Image - Dark Theme</Label>
                      <FileUpload value={s.footer_logo?.image_dark || ""} onChange={(v) => setSec("footer_logo", { image_dark: v })} mode="single" accept="image" testid="set-footer-logo-image-dark" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs uppercase tracking-widest mb-1.5 block">Default Logo Image (Fallback)</Label>
                      <FileUpload value={s.footer_logo?.image || ""} onChange={(v) => setSec("footer_logo", { image: v })} mode="single" accept="image" testid="set-footer-logo-image" />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t mt-4">
                  <Label className="text-xs uppercase tracking-widest block mb-1.5">Footer Bottom Text</Label>
                  <Textarea
                    value={s.footer_logo?.description ?? ""}
                    onChange={(e) => setSec("footer_logo", { description: e.target.value })}
                    placeholder="Precision XRF, gold testing, hallmarking and laser marking systems trusted by jewellers..."
                    rows={3}
                    data-testid="set-footer-logo-description"
                  />
                </div>
              </CardContent>
            </Card>
            {/* Global Footer & PDF Settings */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-base font-medium">Global Footer & PDF Settings</h3>
                  <p className="text-xs text-muted-foreground">Configure custom text for the website footer bar and PDF documents.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs uppercase tracking-widest">Website Footer Bottom Bar Text</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="Engineered with precision · ISO • BIS • NABL"
                      value={s.company?.footer_bottom_text ?? ""}
                      onChange={(e) => setSec("company", { footer_bottom_text: e.target.value })}
                      data-testid="set-footer-bottom-text"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-widest">PDF Footer Text</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="{company_name} | {title}"
                      value={s.company?.pdf_footer_text ?? ""}
                      onChange={(e) => setSec("company", { pdf_footer_text: e.target.value })}
                      data-testid="set-pdf-footer-text"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3 border-t pt-4">
                  <div>
                    <Label className="text-xs uppercase tracking-widest">PDF Header Style</Label>
                    <Select
                      value={s.company?.pdf_header_style ?? "dark"}
                      onValueChange={(v) => setSec("company", { pdf_header_style: v })}
                    >
                      <SelectTrigger className="mt-1.5" data-testid="set-pdf-header-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Classic Dark Bar</SelectItem>
                        <SelectItem value="clean">Clean Transparent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-widest">PDF Header Company Name</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="ORNETOPS"
                      value={s.company?.pdf_company_name ?? ""}
                      onChange={(e) => setSec("company", { pdf_company_name: e.target.value })}
                      data-testid="set-pdf-company-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-widest">PDF Logo Height (px)</Label>
                    <Input
                      type="number"
                      className="mt-1.5"
                      placeholder="35"
                      value={s.company?.pdf_logo_height ?? ""}
                      onChange={(e) => setSec("company", { pdf_logo_height: Number(e.target.value) || "" })}
                      data-testid="set-pdf-logo-height"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                  <div>
                    <Label className="text-xs uppercase tracking-widest block mb-1">PDF Header Background Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={s.company?.pdf_header_bg || "#1A1A1A"}
                        onChange={(e) => setSec("company", { pdf_header_bg: e.target.value })}
                        className="h-10 w-12 cursor-pointer rounded border border-input bg-background p-1 mt-1"
                      />
                      <Input
                        className="mt-1 flex-1"
                        placeholder="e.g. #1A1A1A or transparent"
                        value={s.company?.pdf_header_bg ?? ""}
                        onChange={(e) => setSec("company", { pdf_header_bg: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-widest block mb-1">PDF Company Name Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={s.company?.pdf_header_text_color || "#D4AF37"}
                        onChange={(e) => setSec("company", { pdf_header_text_color: e.target.value })}
                        className="h-10 w-12 cursor-pointer rounded border border-input bg-background p-1 mt-1"
                      />
                      <Input
                        className="mt-1 flex-1"
                        placeholder="e.g. #D4AF37"
                        value={s.company?.pdf_header_text_color ?? ""}
                        onChange={(e) => setSec("company", { pdf_header_text_color: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs uppercase tracking-widest mb-1.5 block">Custom PDF Header Logo (Transparent image recommended; falls back to Website Header Logo)</Label>
                    <FileUpload value={s.company?.pdf_logo || ""} onChange={(v) => setSec("company", { pdf_logo: v })} mode="single" accept="image" testid="set-pdf-logo" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="about">
          <Card><CardContent className="p-6 space-y-4">
            <div className="mb-4">
              <h3 className="text-base font-medium">About Us Page Content</h3>
              <p className="text-xs text-muted-foreground">Configure the story, mission, and vision statements displayed on the public About Us page.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Header Banner Title" v={s.about?.title} on={(v) => setSec("about", { title: v })} testid="set-about-title" />
              <F label="Tagline" v={s.about?.tagline} on={(v) => setSec("about", { tagline: v })} testid="set-about-tagline" />
              <div className="sm:col-span-2">
                <Label className="text-xs uppercase tracking-widest mb-1.5 block">Header Banner / Side Image</Label>
                <FileUpload value={s.about?.banner_image || ""} onChange={(v) => setSec("about", { banner_image: v })} mode="single" accept="image" testid="set-about-banner" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs uppercase tracking-widest">Our Story Content</Label>
                <Textarea className="mt-1.5 h-32" value={s.about?.story || ""} onChange={(e) => setSec("about", { story: e.target.value })} data-testid="set-about-story" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs uppercase tracking-widest">Our Mission</Label>
                <Textarea className="mt-1.5 h-20" value={s.about?.mission || ""} onChange={(e) => setSec("about", { mission: e.target.value })} data-testid="set-about-mission" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs uppercase tracking-widest">Our Vision</Label>
                <Textarea className="mt-1.5 h-20" value={s.about?.vision || ""} onChange={(e) => setSec("about", { vision: e.target.value })} data-testid="set-about-vision" />
              </div>
            </div>
          </CardContent></Card>
        </TabsContent>


        <TabsContent value="hero">
          <HeroEditor s={s} setSec={setSec} />
        </TabsContent>

        <TabsContent value="trust_logos">
          <TrustLogosEditor s={s} setS={setS} />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementEditor s={s} setSec={setSec} />
        </TabsContent>

        <TabsContent value="social">
          <Card><CardContent className="p-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.keys(s.social).filter(k => k !== "color").map((k) => (
                <F key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} v={s.social[k]} on={(v) => setSec("social", { [k]: v })} testid={`set-social-${k}`} />
              ))}
            </div>

            <div className="border-t pt-4">
              <Label className="text-xs uppercase tracking-widest block mb-1.5">Social Icons Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={s.social?.color || "#D4AF37"}
                  onChange={(e) => setSec("social", { color: e.target.value })}
                  className="h-10 w-20 cursor-pointer rounded-md border border-input bg-background p-1"
                  data-testid="set-social-color"
                />
                <span className="font-mono text-sm">{s.social?.color || "#D4AF37"}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSec("social", { color: "#D4AF37" })}
                  className="text-xs"
                >
                  Reset to Gold
                </Button>
              </div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="email">
          <Card><CardContent className="p-6 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center gap-3"><Switch checked={!!s.email.enabled} onCheckedChange={(v) => setSec("email", { enabled: v })} data-testid="set-email-enabled" /> <span className="text-sm">Enable outbound emails</span></div>
            <div>
              <Label className="text-xs uppercase tracking-widest">Provider</Label>
              <Select value={s.email.provider} onValueChange={(v) => setSec("email", { provider: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">Generic SMTP</SelectItem>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="ses">Amazon SES</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="brevo">Brevo (Sendinblue)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <F label="From address" v={s.email.from} on={(v) => setSec("email", { from: v })} testid="set-email-from" />
            <F label="SMTP Host" v={s.email.host} on={(v) => setSec("email", { host: v })} testid="set-email-host" />
            <F label="SMTP Port" v={s.email.port} on={(v) => setSec("email", { port: Number(v) || v })} testid="set-email-port" />
            <F label="Username" v={s.email.user} on={(v) => setSec("email", { user: v })} testid="set-email-user" />
            <F label="Password / SMTP Token" v={s.email.password} on={(v) => setSec("email", { password: v })} testid="set-email-pass" type="password" />
            <F label="API Key (for SendGrid/Resend/Mailgun)" v={s.email.api_key} on={(v) => setSec("email", { api_key: v })} testid="set-email-apikey" />
            <div className="sm:col-span-2 rounded-md border border-dashed border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-600 dark:text-emerald-400">
              ✔ Outbound email delivery is fully active. Configure your SMTP/API credentials to send real confirmation emails to customers and new lead alerts to admins.
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card><CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-medium">Notification Email Templates</h3>
              <p className="text-xs text-muted-foreground">Customize subjects and body HTML. Supported Placeholders: <code>{`{name}, {email}, {phone}, {company}, {message}, {city}, {country}, {product_interest}, {preferred_date}, {product}, {quantity}`}</code></p>
            </div>
            <Tabs defaultValue="contact_tmpl">
              <TabsList className="bg-secondary/40">
                <TabsTrigger value="contact_tmpl">Inquiry (Contact)</TabsTrigger>
                <TabsTrigger value="demo_tmpl">Demo Request</TabsTrigger>
                <TabsTrigger value="quote_tmpl">Quote Request</TabsTrigger>
              </TabsList>
              
              <TabsContent value="contact_tmpl" className="space-y-4 pt-4">
                <TemplateFields title="Admin Alert Email" sub={s.templates?.contact_admin} onSub={(p) => setSec("templates", { contact_admin: { ...s.templates.contact_admin, ...p } })} />
                <TemplateFields title="Customer Confirmation Email" sub={s.templates?.contact_customer} onSub={(p) => setSec("templates", { contact_customer: { ...s.templates.contact_customer, ...p } })} />
              </TabsContent>
              <TabsContent value="demo_tmpl" className="space-y-4 pt-4">
                <TemplateFields title="Admin Alert Email" sub={s.templates?.demo_admin} onSub={(p) => setSec("templates", { demo_admin: { ...s.templates.demo_admin, ...p } })} />
                <TemplateFields title="Customer Confirmation Email" sub={s.templates?.demo_customer} onSub={(p) => setSec("templates", { demo_customer: { ...s.templates.demo_customer, ...p } })} />
              </TabsContent>
              <TabsContent value="quote_tmpl" className="space-y-4 pt-4">
                <TemplateFields title="Admin Alert Email" sub={s.templates?.quote_admin} onSub={(p) => setSec("templates", { quote_admin: { ...s.templates.quote_admin, ...p } })} />
                <TemplateFields title="Customer Confirmation Email" sub={s.templates?.quote_customer} onSub={(p) => setSec("templates", { quote_customer: { ...s.templates.quote_customer, ...p } })} />
              </TabsContent>
            </Tabs>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card><CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3"><Switch checked={!!s.whatsapp_cfg.enabled} onCheckedChange={(v) => setSec("whatsapp_cfg", { enabled: v })} data-testid="set-wa-enabled" /> <span className="text-sm">Show WhatsApp floating button on website</span></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Admin WhatsApp Notification Number (with country code)" v={s.whatsapp_cfg.number} on={(v) => setSec("whatsapp_cfg", { number: v })} testid="set-wa-number" />
              <F label="Default floating button message" v={s.whatsapp_cfg.default_msg} on={(v) => setSec("whatsapp_cfg", { default_msg: v })} testid="set-wa-msg" />
            </div>
            
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">WhatsApp Notification Integration (Twilio Sandbox)</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <F label="Twilio Account SID" v={s.whatsapp_cfg.twilio_sid} on={(v) => setSec("whatsapp_cfg", { twilio_sid: v })} testid="set-wa-twilio-sid" />
                <F label="Twilio Auth Token" v={s.whatsapp_cfg.twilio_token} on={(v) => setSec("whatsapp_cfg", { twilio_token: v })} testid="set-wa-twilio-token" type="password" />
                <F label="Twilio WhatsApp From Number" v={s.whatsapp_cfg.twilio_wa_from} on={(v) => setSec("whatsapp_cfg", { twilio_wa_from: v })} testid="set-wa-twilio-from" placeholder="whatsapp:+14155238886" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Alternative: WhatsApp Meta Cloud API (Official)</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <F label="Meta WhatsApp Phone ID" v={s.whatsapp_cfg.wa_phone_id} on={(v) => setSec("whatsapp_cfg", { wa_phone_id: v })} testid="set-wa-meta-phone-id" />
                <F label="Meta WhatsApp Access Token" v={s.whatsapp_cfg.wa_access_token} on={(v) => setSec("whatsapp_cfg", { wa_access_token: v })} testid="set-wa-meta-token" type="password" />
              </div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card><CardContent className="p-6 grid gap-3 sm:grid-cols-2">
            <F label="Meta Title" v={s.seo.title} on={(v) => setSec("seo", { title: v })} testid="set-seo-title" />
            <F label="OG Image URL" v={s.seo.og_image} on={(v) => setSec("seo", { og_image: v })} testid="set-seo-og" />
            <div className="sm:col-span-2"><Label className="text-xs uppercase tracking-widest">Meta Description</Label><Textarea className="mt-1.5" value={s.seo.description || ""} onChange={(e) => setSec("seo", { description: e.target.value })} data-testid="set-seo-desc" /></div>
            <F label="Keywords" v={s.seo.keywords} on={(v) => setSec("seo", { keywords: v })} testid="set-seo-keywords" />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card><CardContent className="p-6 grid gap-3 sm:grid-cols-2">
            <F label="Google Analytics 4 ID" v={s.integrations.ga4} on={(v) => setSec("integrations", { ga4: v })} testid="set-ga4" />
            <F label="Google Tag Manager ID" v={s.integrations.gtm} on={(v) => setSec("integrations", { gtm: v })} testid="set-gtm" />
            <F label="Microsoft Clarity ID" v={s.integrations.clarity} on={(v) => setSec("integrations", { clarity: v })} testid="set-clarity" />
            <F label="Calendly URL" v={s.integrations.calendly} on={(v) => setSec("integrations", { calendly: v })} testid="set-calendly" />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function F({ label, v, on, testid, type = "text" }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest">{label}</Label>
      <Input type={type} className="mt-1.5" value={v ?? ""} onChange={(e) => on(e.target.value)} data-testid={testid} />
    </div>
  );
}


function AnnouncementEditor({ s, setSec }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AnnouncementBlock
        title="Top Bar (above header)"
        eyebrow="Slim banner shown on every public page"
        cfg={s.announcements.top}
        onChange={(v) => setSec("announcements", { ...s.announcements, top: v })}
        testIdPrefix="ann-top"
      />
      <AnnouncementBlock
        title="Home Strip (before Product Categories)"
        eyebrow="Card-style strip shown only on the home page"
        cfg={s.announcements.home}
        onChange={(v) => setSec("announcements", { ...s.announcements, home: v })}
        testIdPrefix="ann-home"
      />
    </div>
  );
}

function AnnouncementBlock({ title, eyebrow, cfg, onChange, testIdPrefix }) {
  const items = Array.isArray(cfg.items) ? cfg.items : [];
  const setItems = (next) => onChange({ ...cfg, items: next });
  const updateItem = (i, patch) => setItems(items.map((it, idx) => idx === i ? { ...(typeof it === "string" ? { text: it } : it), ...patch } : it));
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const addItem = () => setItems([...items, { text: "New announcement", badge: "", link: "", link_label: "" }]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div>
          <h3 className="text-base font-medium">{title}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-md border bg-secondary/30 p-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={!!cfg.enabled}
              onCheckedChange={(v) => onChange({ ...cfg, enabled: v })}
              data-testid={`${testIdPrefix}-enabled`}
            />
            <span className="text-sm">Show on website</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs uppercase tracking-widest">Slide interval (sec)</Label>
            <Input
              type="number"
              min={2}
              max={60}
              className="h-8 w-20"
              value={cfg.interval ?? 6}
              onChange={(e) => onChange({ ...cfg, interval: Math.max(2, Number(e.target.value) || 6) })}
              data-testid={`${testIdPrefix}-interval`}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {items.length === 0 && (
            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              No announcements yet. Add one below.
            </div>
          )}
          {items.map((raw, i) => {
            const it = typeof raw === "string" ? { text: raw } : (raw || {});
            return (
              <div key={i} className="rounded-md border bg-card p-3" data-testid={`${testIdPrefix}-item-${i}`}>
                <div className="grid gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-2">
                    <Label className="text-[10px] uppercase tracking-widest">Badge (optional)</Label>
                    <Input value={it.badge || ""} onChange={(e) => updateItem(i, { badge: e.target.value })} className="mt-1 h-9" placeholder="NEW" data-testid={`${testIdPrefix}-badge-${i}`} />
                  </div>
                  <div className="sm:col-span-6">
                    <Label className="text-[10px] uppercase tracking-widest">Text *</Label>
                    <Input value={it.text || ""} onChange={(e) => updateItem(i, { text: e.target.value })} className="mt-1 h-9" placeholder="🎉 Meet us at IIJS 2026, Booth #B-204" data-testid={`${testIdPrefix}-text-${i}`} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-[10px] uppercase tracking-widest">Link Label</Label>
                    <Input value={it.link_label || ""} onChange={(e) => updateItem(i, { link_label: e.target.value })} className="mt-1 h-9" placeholder="Register" data-testid={`${testIdPrefix}-linklabel-${i}`} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-[10px] uppercase tracking-widest">Link URL</Label>
                    <Input value={it.link || ""} onChange={(e) => updateItem(i, { link: e.target.value })} className="mt-1 h-9" placeholder="/events" data-testid={`${testIdPrefix}-link-${i}`} />
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeItem(i)} data-testid={`${testIdPrefix}-remove-${i}`}>Remove</Button>
                </div>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={addItem} className="rounded-sm" data-testid={`${testIdPrefix}-add`}>+ Add announcement</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroEditor({ s, setSec }) {
  const slides = Array.isArray(s.hero?.slides) ? s.hero.slides : [];
  const interval = s.hero?.interval ?? 6;

  const setSlides = (next) => setSec("hero", { ...s.hero, slides: next });
  const setInterval = (v) => setSec("hero", { ...s.hero, interval: Math.max(2, Number(v) || 6) });

  const addSlide = (type) => setSlides([...slides, { type, src: "", label: "", sublabel: "", desc: "", poster: "" }]);
  const updateSlide = (i, patch) => setSlides(slides.map((sl, idx) => idx === i ? { ...sl, ...patch } : sl));
  const removeSlide = (i) => setSlides(slides.filter((_, idx) => idx !== i));
  const moveUp = (i) => { if (i === 0) return; const arr = [...slides]; [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; setSlides(arr); };
  const moveDown = (i) => { if (i === slides.length - 1) return; const arr = [...slides]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; setSlides(arr); };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Homepage Hero</div>
              <h3 className="text-base font-medium">Hero Slides</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Add images, videos, or 3D models to the hero carousel. If empty, the flagship product's 3D model is shown as fallback.</p>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs uppercase tracking-widest">Auto-advance (sec)</Label>
              <Input type="number" min={2} max={60} className="h-8 w-20" value={interval} onChange={(e) => setInterval(e.target.value)} data-testid="hero-interval" />
            </div>
          </div>

          {/* Slide list */}
          <div className="space-y-4">
            {slides.length === 0 && (
              <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                No slides yet. Add your first slide below — image, video, or 3D model.
              </div>
            )}
            {slides.map((slide, i) => (
              <HeroSlideEditor
                key={i}
                index={i}
                total={slides.length}
                slide={slide}
                onChange={(patch) => updateSlide(i, patch)}
                onRemove={() => removeSlide(i)}
                onMoveUp={() => moveUp(i)}
                onMoveDown={() => moveDown(i)}
              />
            ))}
          </div>

          {/* Add buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-sm" onClick={() => addSlide("image")} data-testid="hero-add-image">
              + Add Image Slide
            </Button>
            <Button variant="outline" size="sm" className="rounded-sm" onClick={() => addSlide("video")} data-testid="hero-add-video">
              + Add Video Slide
            </Button>
            <Button variant="outline" size="sm" className="rounded-sm" onClick={() => addSlide("3d")} data-testid="hero-add-3d">
              + Add 3D Model Slide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HeroSlideEditor({ index, total, slide, onChange, onRemove, onMoveUp, onMoveDown }) {
  const typeLabel = slide.type === "3d" ? "3D Model (.glb/.gltf)" : slide.type === "video" ? "Video" : "Image";
  const acceptType = slide.type === "3d" ? "model" : slide.type === "video" ? "video" : "image";

  return (
    <div className="rounded-md border bg-card p-4 space-y-3" data-testid={`hero-slide-${index}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md border bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">Slide {index + 1} · {typeLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onMoveUp} disabled={index === 0} aria-label="Move up" data-testid={`hero-slide-up-${index}`}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </Button>
          <Button variant="ghost" size="sm" onClick={onMoveDown} disabled={index === total - 1} aria-label="Move down" data-testid={`hero-slide-down-${index}`}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onRemove} data-testid={`hero-slide-remove-${index}`}>Remove</Button>
        </div>
      </div>

      {/* Media upload */}
      <div>
        <Label className="text-xs uppercase tracking-widest">{typeLabel} File *</Label>
        <div className="mt-1.5">
          <FileUpload
            value={slide.src || ""}
            onChange={(v) => onChange({ src: v })}
            mode="single"
            accept={acceptType}
            testid={`hero-slide-src-${index}`}
          />
        </div>
      </div>

      {/* Video poster */}
      {slide.type === "video" && (
        <div>
          <Label className="text-xs uppercase tracking-widest">Poster / Thumbnail (optional)</Label>
          <div className="mt-1.5">
            <FileUpload
              value={slide.poster || ""}
              onChange={(v) => onChange({ poster: v })}
              mode="single"
              accept="image"
              testid={`hero-slide-poster-${index}`}
            />
          </div>
        </div>
      )}

      {/* Labels */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs uppercase tracking-widest">Badge Label</Label>
          <Input className="mt-1.5" placeholder="e.g. Flagship" value={slide.label || ""} onChange={(e) => onChange({ label: e.target.value })} data-testid={`hero-slide-label-${index}`} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Title</Label>
          <Input className="mt-1.5" placeholder="e.g. XRF Pro 9000" value={slide.sublabel || ""} onChange={(e) => onChange({ sublabel: e.target.value })} data-testid={`hero-slide-sublabel-${index}`} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Sub-text</Label>
          <Input className="mt-1.5" placeholder="e.g. Precision karat analyzer" value={slide.desc || ""} onChange={(e) => onChange({ desc: e.target.value })} data-testid={`hero-slide-desc-${index}`} />
        </div>
      </div>
    </div>
  );
}

function TrustLogosEditor({ s, setS }) {
  const logos = Array.isArray(s.trust_logos) ? s.trust_logos : [];
  const cfg = s.trust_logos_cfg || { enabled: true, title: "Trusted by Industry Leaders", eyebrow: "Partnerships", height: 40 };

  const setLogos = (next) => setS({ ...s, trust_logos: next });
  const setCfg = (patch) => setS({ ...s, trust_logos_cfg: { ...cfg, ...patch } });

  const addLogo = () => setLogos([...logos, { image: "", image_light: "", image_dark: "", name: "" }]);
  const updateLogo = (i, patch) => setLogos(logos.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const removeLogo = (i) => setLogos(logos.filter((_, idx) => idx !== i));
  const moveUp = (i) => { if (i === 0) return; const arr = [...logos]; [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; setLogos(arr); };
  const moveDown = (i) => { if (i === logos.length - 1) return; const arr = [...logos]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; setLogos(arr); };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Homepage Trust Band</div>
          <h3 className="text-base font-medium">Trusted by Industry Leaders</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Manage logos of partners, clients, or certifications shown in the homepage banner.</p>
        </div>

        {/* Section Config */}
        <div className="flex flex-col gap-4 rounded-md border bg-secondary/30 p-4 mb-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={!!cfg.enabled}
              onCheckedChange={(v) => setCfg({ enabled: v })}
              data-testid="trust-logos-enabled"
            />
            <span className="text-sm font-medium">Enable Section on Homepage</span>
          </div>
          
          <div className="w-full grid gap-3 sm:grid-cols-3 pt-3 border-t">
            <div>
              <Label className="text-xs uppercase tracking-widest">Section Eyebrow</Label>
              <Input
                className="mt-1.5"
                placeholder="Partnerships"
                value={cfg.eyebrow ?? ""}
                onChange={(e) => setCfg({ eyebrow: e.target.value })}
                data-testid="trust-logos-eyebrow"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest">Section Title</Label>
              <Input
                className="mt-1.5"
                placeholder="Trusted by Industry Leaders"
                value={cfg.title ?? ""}
                onChange={(e) => setCfg({ title: e.target.value })}
                data-testid="trust-logos-title"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest">Logo Height (px)</Label>
              <Input
                type="number"
                min={20}
                max={150}
                className="mt-1.5"
                value={cfg.height ?? 40}
                onChange={(e) => setCfg({ height: Number(e.target.value) || "" })}
                data-testid="trust-logos-height"
              />
            </div>
          </div>
        </div>

        {/* Logos List */}
        <div className="space-y-4">
          {logos.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
              No logos added yet. Click below to add one.
            </div>
          )}
          {logos.map((logo, i) => (
            <div key={i} className="rounded-md border bg-card p-4 space-y-3" data-testid={`trust-logo-item-${i}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md border bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">Logo {i + 1}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => moveUp(i)} disabled={i === 0} aria-label="Move up" data-testid={`trust-logo-up-${i}`}>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => moveDown(i)} disabled={i === logos.length - 1} aria-label="Move down" data-testid={`trust-logo-down-${i}`}>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeLogo(i)} data-testid={`trust-logo-remove-${i}`}>Remove</Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-widest block mb-1.5">Logo Image - Light Theme / Fallback *</Label>
                  <FileUpload
                    value={logo.image_light || logo.image || ""}
                    onChange={(v) => updateLogo(i, { image_light: v, image: v })}
                    mode="single"
                    accept="image"
                    testid={`trust-logo-image-light-${i}`}
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest block mb-1.5">Logo Image - Dark Theme</Label>
                  <FileUpload
                    value={logo.image_dark || ""}
                    onChange={(v) => updateLogo(i, { image_dark: v })}
                    mode="single"
                    accept="image"
                    testid={`trust-logo-image-dark-${i}`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs uppercase tracking-widest block mb-1.5">Leader / Partner Name (optional)</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. Muthoot Finance"
                    value={logo.name || ""}
                    onChange={(e) => updateLogo(i, { name: e.target.value })}
                    data-testid={`trust-logo-name-${i}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" className="rounded-sm" onClick={addLogo} data-testid="trust-logo-add">
          + Add Leader Logo
        </Button>
      </CardContent>
    </Card>
  );
}

function LocationsEditor({ s, setS }) {
  const locations = Array.isArray(s.locations) ? s.locations : [];
  const setLocations = (next) => setS({ ...s, locations: next });
  
  const addLocation = () => setLocations([...locations, { name: "New Location Office", address: "Office Address, City, Country", map_url: "https://www.openstreetmap.org/export/embed.html?bbox=72.78%2C18.85%2C73.0%2C19.10&layer=mapnik" }]);
  const updateLoc = (i, patch) => setLocations(locations.map((loc, idx) => idx === i ? { ...loc, ...patch } : loc));
  const removeLoc = (i) => setLocations(locations.filter((_, idx) => idx !== i));
  
  return (
    <div className="space-y-4 pt-4 border-t">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Office Locations & Maps</h3>
        <p className="text-xs text-muted-foreground">Manage headquarters and other office locations displayed on the Contact Us page.</p>
      </div>
      <div className="space-y-4">
        {locations.map((loc, i) => (
          <div key={i} className="rounded-md border p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Office {i+1}</span>
              <Button variant="ghost" size="sm" className="text-destructive h-8" onClick={() => removeLoc(i)}>Remove</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-[10px] uppercase tracking-widest">Office / HQ Name</Label>
                <Input className="mt-1" value={loc.name || ""} onChange={(e) => updateLoc(i, { name: e.target.value })} placeholder="e.g. Mumbai Headquarters" />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest">Office Address</Label>
                <Input className="mt-1" value={loc.address || ""} onChange={(e) => updateLoc(i, { address: e.target.value })} placeholder="e.g. Mumbai, India" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[10px] uppercase tracking-widest">OpenStreetMap Embed URL (iframe src)</Label>
                <Input className="mt-1" value={loc.map_url || ""} onChange={(e) => updateLoc(i, { map_url: e.target.value })} placeholder="https://www.openstreetmap.org/export/embed.html?..." />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addLocation}>+ Add Office Location</Button>
    </div>
  );
}

function TemplateFields({ title, sub, onSub }) {
  return (
    <div className="rounded-md border p-4 space-y-3 bg-card/50">
      <h4 className="text-sm font-semibold text-primary">{title}</h4>
      <div>
        <Label className="text-[10px] uppercase tracking-widest">Email Subject</Label>
        <Input className="mt-1" value={sub?.subject || ""} onChange={(e) => onSub({ subject: e.target.value })} />
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-widest">Email Body (HTML/Text)</Label>
        <Textarea className="mt-1 h-32 font-mono text-xs" value={sub?.body || ""} onChange={(e) => onSub({ body: e.target.value })} />
      </div>
    </div>
  );
}

