import { Card, CardContent } from "@/components/ui/card";
import { Wrench, BookOpen, Settings as Cog, ShieldCheck, Activity, Users } from "lucide-react";

const SERVICES = [
  { icon: Wrench, t: "Installation", d: "Turnkey site preparation and commissioning across India and abroad." },
  { icon: ShieldCheck, t: "Calibration", d: "NABL-traceable calibration with documented certificates." },
  { icon: Activity, t: "Repairs", d: "Genuine parts and OEM-trained engineers within 24-48 hrs." },
  { icon: Cog, t: "AMC", d: "Annual maintenance plans for predictable uptime." },
  { icon: BookOpen, t: "Training", d: "Operator certification programs at customer site or HQ." },
  { icon: Users, t: "Consultancy", d: "Hallmarking & lab setup consultancy from first sample to license." },
];

export default function Services() {
  return (
    <div className="border-b" data-testid="services-page">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Services</div>
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight lg:text-5xl">Lifetime partnership, not just a one-time sale</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon: Icon, t, d }) => (
            <Card key={t} className="border-border/60">
              <CardContent className="p-6">
                <div className="rounded-md border bg-primary/10 p-2 w-fit text-primary"><Icon className="h-4 w-4" /></div>
                <div className="mt-4 text-base font-medium">{t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
