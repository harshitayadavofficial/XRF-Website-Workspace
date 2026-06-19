import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, MapPin, MessageCircleMore } from "lucide-react";
import InquiryForm from "@/pages/public/InquiryForm";

export default function Contact() {
  return (
    <div className="border-b" data-testid="contact-page">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-2 lg:px-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Get in touch</div>
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight lg:text-5xl">Contact us</h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">Reach out for sales, demos, calibration & service support. We respond within 4 business hours.</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Tile icon={MapPin} t="Headquarters" v="Mumbai, India" />
            <Tile icon={Phone} t="Phone" v="+91 99999 99999" />
            <Tile icon={Mail} t="Email" v="hello@aurumtech.com" />
            <Tile icon={MessageCircleMore} t="WhatsApp" v="+91 99999 99999" />
          </div>

          <div className="mt-6 overflow-hidden rounded-md border">
            <iframe
              title="AurumTech HQ"
              src="https://www.openstreetmap.org/export/embed.html?bbox=72.78%2C18.85%2C73.0%2C19.10&amp;layer=mapnik"
              loading="lazy"
              className="h-72 w-full"
            />
          </div>
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
      <div className="text-sm font-medium">{v}</div>
    </div>
  );
}
