import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, MapPin, MessageCircleMore, Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import InquiryForm from "@/pages/public/InquiryForm";
import { usePublicSettings } from "@/context/SettingsContext";

export default function Contact() {
  const { settings } = usePublicSettings();
  const [activeLocIdx, setActiveLocIdx] = useState(0);

  const c = settings?.company || {};
  const phone = c.phone || "+91 99999 99999";
  const email = c.email || "hello@ornetops.com";
  const whatsapp = c.whatsapp || phone;
  const companyName = c.name || "ORNETOPS";

  // Locations array fallback to default Mumbai HQ
  const locations = settings?.locations || [
    { 
      name: "Mumbai Headquarters", 
      address: c.address || "Mumbai, India", 
      map_url: "https://www.openstreetmap.org/export/embed.html?bbox=72.78%2C18.85%2C73.0%2C19.10&amp;layer=mapnik" 
    }
  ];

  const activeLoc = locations[activeLocIdx] || locations[0] || {};

  return (
    <div className="border-b" data-testid="contact-page">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-2 lg:px-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Get in touch</div>
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight lg:text-5xl">Contact us</h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">Reach out for sales, demos, calibration & service support. We respond within 4 business hours.</p>

          {/* Locations selection tabs */}
          {locations.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {locations.map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveLocIdx(idx)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition-all ${
                    activeLocIdx === idx
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-secondary/40 text-foreground hover:bg-secondary border-border"
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Tile icon={MapPin} t={activeLoc.name || "Headquarters"} v={activeLoc.address || "Mumbai, India"} />
            <Tile icon={Phone} t="Phone" v={phone} />
            <Tile icon={Mail} t="Email" v={email} />
            <Tile icon={MessageCircleMore} t="WhatsApp" v={whatsapp} />
          </div>

          <div className="mt-6 overflow-hidden rounded-md border bg-secondary/10">
            <iframe
              title={`${companyName} - ${activeLoc.name}`}
              src={activeLoc.map_url || "https://www.openstreetmap.org/export/embed.html?bbox=72.78%2C18.85%2C73.0%2C19.10&amp;layer=mapnik"}
              loading="lazy"
              className="h-72 w-full border-0"
              allowFullScreen
            />
          </div>

          {/* Social media redirects */}
          {settings?.social && (
            <div className="mt-6 flex flex-col gap-2 rounded-md border p-4 bg-card/30">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Follow Us</div>
              <div className="flex gap-4 text-muted-foreground pt-1">
                {settings.social.facebook && <a href={settings.social.facebook} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></a>}
                {settings.social.instagram && <a href={settings.social.instagram} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>}
                {settings.social.linkedin && <a href={settings.social.linkedin} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors"><Linkedin className="h-5 w-5" /></a>}
                {settings.social.twitter && <a href={settings.social.twitter} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>}
                {settings.social.youtube && <a href={settings.social.youtube} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors"><Youtube className="h-5 w-5" /></a>}
              </div>
            </div>
          )}
        </div>
        
        <Card><CardContent className="p-6">
          <div className="mb-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Send us a message</div>
            <h2 className="font-display text-2xl font-medium tracking-tight">We'd love to hear from you</h2>
          </div>
          <InquiryForm source="contact" />
        </CardContent></Card>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, t, v }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="rounded-md border bg-secondary p-1.5 w-fit text-primary"><Icon className="h-4 w-4" /></div>
      <div className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">{t}</div>
      <div className="text-sm font-medium whitespace-pre-line">{v}</div>
    </div>
  );
}
