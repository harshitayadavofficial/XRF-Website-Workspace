import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ThreeViewer from "@/components/ThreeViewer";
import AnnouncementBar from "@/components/AnnouncementBar";
import { resolveAssetUrl } from "@/components/FileUpload";
import { usePublicSettings } from "@/context/SettingsContext";
import {
  Award, Globe2, ShieldCheck, Sparkles, Zap, Layers, Flame, Code,
  ScanLine, BadgeCheck, ArrowRight, ArrowUpRight, Quote,
} from "lucide-react";

const ICONS = { Sparkles, ScanLine, BadgeCheck, Zap, Flame, Layers, Code };

const STATS = [
  { v: "25+", l: "Years of Experience" },
  { v: "8,200+", l: "Machines Installed" },
  { v: "3,400+", l: "Customers Served" },
  { v: "42", l: "Countries Served" },
  { v: "18", l: "Service Centers" },
  { v: "12", l: "Certifications" },
];

const INDUSTRIES = [
  "Jewellery Stores", "Hallmarking Centers", "Refineries", "Bullion Traders",
  "Banks", "Pawn Shops", "Laboratories", "Precious Metal Buyers",
];

const WHY = [
  { icon: ShieldCheck, t: "Non-destructive Testing", d: "Zero damage XRF spectroscopy preserves the value of every sample." },
  { icon: Zap, t: "Lightning Fast", d: "Sub-second karat readouts. 10× faster than acid testing." },
  { icon: Award, t: "Accurate to ±0.01%", d: "Lab-grade precision certified by NABL & BIS." },
  { icon: Globe2, t: "Global Standards", d: "Compliant with BIS, ISO 17025, ASTM and OIML." },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const { settings } = usePublicSettings();

  useEffect(() => {
    Promise.all([
      api.get("/products"), api.get("/categories"),
      api.get("/testimonials"), api.get("/case_studies"), api.get("/blogs"),
    ]).then(([p, c, t, cs, b]) => {
      setProducts(p.data); setCats(c.data); setTestimonials(t.data);
      setCaseStudies(cs.data); setBlogs(b.data);
    });
  }, []);

  const featured = products.filter((p) => p.featured).slice(0, 3);
  const flagship = featured[0] || products[0];

  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="relative overflow-hidden border-b">
        <div
          className="absolute -right-40 top-0 h-[600px] w-[600px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle at center, hsl(var(--primary)) 0%, transparent 60%)" }}
        />
        <div className="absolute inset-0 grain opacity-[0.04]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 text-[10px] uppercase tracking-[0.2em] text-primary">
              Precision · BIS · NABL Certified
            </Badge>
            <h1 className="mt-6 font-display text-4xl font-medium leading-[0.95] tracking-tighter text-balance sm:text-5xl lg:text-6xl">
              Precision Engineered for the world of{" "}
              <span className="relative inline-block text-primary">
                Precious Metals
                <svg className="absolute -bottom-1 left-0 w-full" height="6" viewBox="0 0 200 6" preserveAspectRatio="none">
                  <path d="M0 3 Q 100 0 200 3" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </span>.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground lg:text-lg">
              XRF analyzers, gold testing systems, hallmarking equipment and laser markers — built for jewellers, refineries and laboratories.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-sm" data-testid="hero-quote-btn">
                <Link to="/request-quote">Get a Quote <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-sm" data-testid="hero-demo-btn">
                <Link to="/request-demo">Request Live Demo</Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-sm" data-testid="hero-expert-btn">
                <Link to="/contact">Contact Expert <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" /></Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 border-t pt-6">
              {STATS.slice(0, 3).map((s) => (
                <div key={s.l}>
                  <div className="font-display text-2xl font-medium tracking-tight tabular-nums">{s.v}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <ThreeViewer src={flagship?.model_3d} height={520} />
            {flagship && (
              <div className="absolute left-3 top-3 max-w-[200px] rounded-md border bg-background/85 backdrop-blur px-3 py-2 text-xs">
                <div className="text-[10px] uppercase tracking-widest text-primary">Flagship</div>
                <div className="font-semibold">{flagship.name}</div>
                <div className="text-muted-foreground">{flagship.tagline}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b bg-secondary/30">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden bg-border sm:grid-cols-3 lg:grid-cols-6">
          {STATS.map((s) => (
            <div key={s.l} className="bg-background p-5">
              <div className="font-display text-2xl font-medium tracking-tight tabular-nums">{s.v}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <AnnouncementBar config={settings?.announcements?.home} variant="section" testid="home-announcement" />
      <Section eyebrow="Catalog" title="Product Categories" sub="A complete portfolio for the precious metals workflow.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cats.map((c) => {
            const Icon = ICONS[c.icon] || Sparkles;
            return (
              <Link to={`/products?cat=${c.slug}`} key={c.id} className="group" data-testid={`cat-${c.slug}`}>
                <Card className="h-full border-border/60 transition-all hover:border-primary/50 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="rounded-md border bg-secondary/40 p-2 w-fit text-primary"><Icon className="h-4 w-4" /></div>
                    <div className="mt-4 text-base font-medium">{c.name}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                    <div className="mt-4 inline-flex items-center gap-1 text-xs text-primary group-hover:gap-2 transition-all">Explore <ArrowRight className="h-3 w-3" /></div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* Industries */}
      <Section eyebrow="Industries" title="Trusted across the precious metals value chain">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {INDUSTRIES.map((i) => (
            <div key={i} className="rounded-md border bg-card p-4 text-sm hover:border-primary/40 transition-colors" data-testid={`industry-${i.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Industry</div>
              <div className="mt-1 font-medium">{i}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Why */}
      <Section eyebrow="Why AurumTech" title="Built differently. Trusted globally.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(({ icon: Icon, t, d }) => (
            <Card key={t} className="border-border/60">
              <CardContent className="p-6">
                <div className="rounded-md border bg-primary/10 p-2 w-fit text-primary"><Icon className="h-4 w-4" /></div>
                <div className="mt-4 text-base font-medium">{t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Featured products */}
      <Section eyebrow="Flagships" title="Featured products">
        <div className="grid gap-5 lg:grid-cols-3">
          {featured.map((p) => (
            <Link to={`/products/${p.slug}`} key={p.id} className="group" data-testid={`featured-${p.slug}`}>
              <Card className="h-full overflow-hidden border-border/60 transition-all hover:border-primary/50 hover:-translate-y-1">
                <div className="aspect-[4/3] overflow-hidden bg-secondary">
                  <img src={resolveAssetUrl(p.image)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <CardContent className="p-5">
                  <div className="text-[10px] uppercase tracking-widest text-primary">{p.category?.replace(/-/g, " ")}</div>
                  <div className="mt-1 text-lg font-medium tracking-tight">{p.name}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs text-primary group-hover:gap-2 transition-all">View details <ArrowRight className="h-3 w-3" /></div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      {/* Testimonials */}
      <Section eyebrow="Voices" title="Customers who trust AurumTech">
        <div className="grid gap-4 lg:grid-cols-3">
          {testimonials.slice(0, 3).map((t) => (
            <Card key={t.id} className="border-border/60" data-testid={`testimonial-${t.id}`}>
              <CardContent className="p-6">
                <Quote className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm leading-relaxed">{t.quote}</p>
                <div className="mt-5 border-t pt-3">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.title}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Case studies / blogs */}
      <Section eyebrow="Resources" title="Case studies & insights">
        <div className="grid gap-5 lg:grid-cols-3">
          {[...caseStudies.slice(0, 1), ...blogs.slice(0, 2)].map((b, i) => (
            <Card key={i} className="overflow-hidden border-border/60" data-testid={`resource-${i}`}>
              {b.image && <div className="aspect-video bg-secondary"><img src={resolveAssetUrl(b.image)} alt="" className="h-full w-full object-cover" /></div>}
              <CardContent className="p-5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{b.industry || b.category || "Article"}</div>
                <div className="mt-1 text-base font-medium leading-tight">{b.title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{b.excerpt || b.challenge}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section className="border-t bg-secondary/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-16 text-center lg:flex-row lg:text-left lg:px-8">
          <div>
            <h3 className="font-display text-3xl font-medium tracking-tight text-balance lg:text-4xl">Ready to upgrade your testing workflow?</h3>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Talk to an application engineer or request a no-obligation on-site demo.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="rounded-sm" data-testid="cta-quote"><Link to="/request-quote">Request Quote</Link></Button>
            <Button asChild variant="outline" className="rounded-sm" data-testid="cta-demo"><Link to="/request-demo">Book Demo</Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({ eyebrow, title, sub, children }) {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
        <div className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
          <h2 className="mt-2 font-display text-3xl font-medium tracking-tight lg:text-4xl text-balance">{title}</h2>
          {sub && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{sub}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
