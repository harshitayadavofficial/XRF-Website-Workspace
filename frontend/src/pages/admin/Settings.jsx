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

export default function Settings() {
  const [s, setS] = useState(null);

  const load = async () => {
    const { data } = await api.get("/settings");
    setS({
      company: { name: "AurumTech Instruments", tagline: "Precision Engineered for Precious Metals", phone: "+91 99999 99999", email: "hello@aurumtech.com", whatsapp: "+919999999999", address: "Mumbai, India", website: "https://aurumtech.com", ...(data.company || {}) },
      social: { linkedin: "", twitter: "", youtube: "", facebook: "", instagram: "", ...(data.social || {}) },
      email: { provider: "smtp", host: "smtp.gmail.com", port: 587, user: "", password: "", from: "", api_key: "", enabled: false, ...(data.email || {}) },
      whatsapp_cfg: { number: "+919999999999", default_msg: "Hi, I'd like to know more about AurumTech products.", enabled: true, ...(data.whatsapp_cfg || {}) },
      seo: { title: "AurumTech Instruments — XRF Analyzers, Gold Testing, Hallmarking", description: "Premium XRF analyzers, gold testing machines, hallmarking and laser marking equipment.", keywords: "XRF, gold testing, hallmarking, BIS, refinery", og_image: "", ...(data.seo || {}) },
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
    });
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api.put("/settings", s);
      toast.success("Settings saved");
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
          <TabsTrigger value="company" data-testid="tab-company">Company</TabsTrigger>
          <TabsTrigger value="announcements" data-testid="tab-announcements">Announcements</TabsTrigger>
          <TabsTrigger value="social" data-testid="tab-social">Social</TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email">Email</TabsTrigger>
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
            <div className="sm:col-span-2"><Label className="text-xs uppercase tracking-widest">Address</Label><Textarea className="mt-1.5" value={s.company.address || ""} onChange={(e) => setSec("company", { address: e.target.value })} /></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementEditor s={s} setSec={setSec} />
        </TabsContent>

        <TabsContent value="social">
          <Card><CardContent className="p-6 grid gap-3 sm:grid-cols-2">
            {Object.keys(s.social).map((k) => (
              <F key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} v={s.social[k]} on={(v) => setSec("social", { [k]: v })} testid={`set-social-${k}`} />
            ))}
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
                </SelectContent>
              </Select>
            </div>
            <F label="From address" v={s.email.from} on={(v) => setSec("email", { from: v })} testid="set-email-from" />
            <F label="SMTP Host" v={s.email.host} on={(v) => setSec("email", { host: v })} testid="set-email-host" />
            <F label="SMTP Port" v={s.email.port} on={(v) => setSec("email", { port: Number(v) || v })} testid="set-email-port" />
            <F label="Username" v={s.email.user} on={(v) => setSec("email", { user: v })} testid="set-email-user" />
            <F label="Password / SMTP Token" v={s.email.password} on={(v) => setSec("email", { password: v })} testid="set-email-pass" type="password" />
            <F label="API Key (for SendGrid/Resend/Mailgun)" v={s.email.api_key} on={(v) => setSec("email", { api_key: v })} testid="set-email-apikey" />
            <div className="sm:col-span-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              ⚠ Email sending integration is configured here but actual outbound delivery is MOCKED in this version. New leads are still saved to the CRM and logged on the server.
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card><CardContent className="p-6 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center gap-3"><Switch checked={!!s.whatsapp_cfg.enabled} onCheckedChange={(v) => setSec("whatsapp_cfg", { enabled: v })} data-testid="set-wa-enabled" /> <span className="text-sm">Show WhatsApp button on website</span></div>
            <F label="WhatsApp Number (with country code)" v={s.whatsapp_cfg.number} on={(v) => setSec("whatsapp_cfg", { number: v })} testid="set-wa-number" />
            <F label="Default message" v={s.whatsapp_cfg.default_msg} on={(v) => setSec("whatsapp_cfg", { default_msg: v })} testid="set-wa-msg" />
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
