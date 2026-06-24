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
import { useTheme } from "@/context/ThemeContext";
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
  const { settings, dataVersion } = usePublicSettings();
  const { theme } = useTheme();

  useEffect(() => {
    Promise.all([
      api.get("/products"), api.get("/categories"),
      api.get("/testimonials"), api.get("/case_studies"), api.get("/blogs"),
    ]).then(([p, c, t, cs, b]) => {
      setProducts(p.data); setCats(c.data); setTestimonials(t.data);
      setCaseStudies(cs.data); setBlogs(b.data);
    });
  }, [dataVersion]);

  const featured = products.filter((p) => p.featured).slice(0, 6);
  const flagship = featured[0] || products[0];
  // ── Hero slide engine ────────────────────────────────────────────
  const heroSlides = settings?.hero?.slides || [];
  const heroInterval = (settings?.hero?.interval || 6) * 1000;

  const DEFAULT_SLIDES = [
    {
      type: "image",
      src: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1600&q=80",
      label: "PRECIOUS METALS",
      sublabel: "Gold & Silver Analysis",
      desc: "Industry-standard precision for bullion and refineries."
    },
    {
      type: "video",
      src: "https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-laser-cutting-metal-41584-large.mp4",
      label: "LASER TECHNOLOGY",
      sublabel: "Advanced Marking Systems",
      desc: "High-speed precision marking and engraving."
    }
  ];

  // Build effective slide list: admin slides OR default slides + flagship 3D
  const effectiveSlides = heroSlides.length > 0
    ? heroSlides
    : flagship && flagship.model_3d
      ? [
          ...DEFAULT_SLIDES,
          { type: "3d", src: flagship.model_3d, label: "3D MODEL", sublabel: flagship.name || "", desc: flagship.tagline || "" }
        ]
      : DEFAULT_SLIDES;

  const [slideIdx, setSlideIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (effectiveSlides.length <= 1) return;
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setSlideIdx((i) => (i + 1) % effectiveSlides.length);
        setFading(false);
      }, 400);
    }, heroInterval);
    return () => clearInterval(t);
  }, [effectiveSlides.length, heroInterval]);

  const goTo = (idx) => {
    if (idx === slideIdx) return;
    setFading(true);
    setTimeout(() => { setSlideIdx(idx); setFading(false); }, 400);
  };

  const currentSlide = effectiveSlides[slideIdx] || effectiveSlides[0];

  return (
    <div data-testid="home-page">
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b bg-background" data-testid="hero-section">
        {/* ambient glow */}
        <div
          className="pointer-events-none absolute -right-40 top-0 h-[700px] w-[700px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle at center, hsl(var(--primary)) 0%, transparent 60%)" }}
        />
        <div className="pointer-events-none absolute inset-0 grain opacity-[0.04]" />

        {/* ── Slideshow background layer (Full Bleed) ── */}
        <div className="absolute inset-0 z-0 bg-muted">
          {/* Media layer */}
          <div
            className="h-full w-full transition-opacity duration-400"
            style={{ opacity: fading ? 0 : 1 }}
          >
            {currentSlide?.type === "image" && currentSlide.src && currentSlide.src.trim() !== "" && (
              <img
                src={resolveAssetUrl(currentSlide.src)}
                alt={currentSlide.label || ""}
                className="h-full w-full object-cover dark:brightness-[0.4] transition-all duration-300"
              />
            )}
            {currentSlide?.type === "video" && currentSlide.src && (
              <video
                key={currentSlide.src}
                src={resolveAssetUrl(currentSlide.src)}
                poster={currentSlide.poster ? resolveAssetUrl(currentSlide.poster) : undefined}
                className="h-full w-full object-cover dark:brightness-[0.4] transition-all duration-300"
                autoPlay
                muted
                loop
                playsInline
              />
            )}
            {(currentSlide?.type === "3d" || !currentSlide?.type) && (
              <ThreeViewer
                key={currentSlide?.src || "fallback"}
                src={currentSlide?.src}
                transparent
                height="100%"
                className="absolute inset-0"
              />
            )}
          </div>

          {/* Theme-aware overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/45 to-transparent dark:from-background/90 dark:via-background/55 dark:to-transparent" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl lg:grid-cols-2" style={{ minHeight: 600 }}>
          {/* ── LEFT: copy ── */}
          <div className="flex flex-col justify-center px-4 py-20 lg:px-8 lg:py-28">
            <div className="w-fit border border-border/40 bg-background/10 dark:bg-card/10 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 font-medium">
              <span className="text-muted-foreground">Precision</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-primary font-bold">BIS Hallmark</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-muted-foreground">NABL Certified</span>
            </div>
            <h1 className="mt-6 font-display text-4xl font-medium leading-[0.95] tracking-tighter text-balance sm:text-5xl lg:text-6xl">
              Precision Engineered{" "}
              <span className="text-muted-foreground font-normal">for the world of</span>{" "}
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
          </div>

          {/* ── RIGHT: empty spacer to let background show ── */}
          <div className="relative pointer-events-none lg:block hidden" />
        </div>

        {/* Slide label HUD */}
        {(currentSlide?.label || currentSlide?.sublabel) && (
          <div
            className="absolute right-4 top-4 z-20 max-w-[240px] rounded-md border border-border bg-card/85 backdrop-blur px-3 py-2 text-xs text-card-foreground shadow-sm transition-opacity duration-400"
            style={{ opacity: fading ? 0 : 1 }}
          >
            {currentSlide.label && (
              <div className="text-[10px] uppercase tracking-widest text-primary font-semibold">{currentSlide.label}</div>
            )}
            {currentSlide.sublabel && <div className="font-semibold mt-0.5">{currentSlide.sublabel}</div>}
            {currentSlide.desc && <div className="text-muted-foreground text-[11px] mt-0.5">{currentSlide.desc}</div>}
          </div>
        )}

        {/* Dot navigation */}
        {effectiveSlides.length > 1 && (
          <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
            {effectiveSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === slideIdx ? "w-6 bg-primary" : "w-1.5 bg-foreground/30 hover:bg-foreground/60"}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Arrow nav */}
        {effectiveSlides.length > 1 && (
          <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2">
            <button
              onClick={() => goTo((slideIdx - 1 + effectiveSlides.length) % effectiveSlides.length)}
              className="rounded-sm border border-border bg-card/85 p-2 text-card-foreground backdrop-blur hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
              aria-label="Previous slide"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={() => goTo((slideIdx + 1) % effectiveSlides.length)}
              className="rounded-sm border border-border bg-card/85 p-2 text-card-foreground backdrop-blur hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
              aria-label="Next slide"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
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

      {/* Trusted by Industry Leaders logo band */}
      {settings?.trust_logos_cfg?.enabled !== false && settings?.trust_logos && settings.trust_logos.length > 0 && (
        <section className="border-b bg-card py-12" data-testid="trust-logos-section">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="text-center mb-8">
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
                {settings?.trust_logos_cfg?.eyebrow || "Partnerships"}
              </span>
              <h2 className="mt-1.5 font-display text-sm font-medium tracking-wider text-muted-foreground uppercase">
                {settings?.trust_logos_cfg?.title || "Trusted by Industry Leaders"}
              </h2>
            </div>
            
            <div className="relative w-full overflow-hidden">
              {/* Left/Right fading gradients only for marquee scrolling mode */}
              {settings.trust_logos.length > 2 && (
                <>
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-card to-transparent z-10" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-card to-transparent z-10" />
                </>
              )}

              {settings.trust_logos.length <= 2 ? (
                // 1 or 2 logos: Static centered layout
                <div className="flex justify-center gap-16 py-2 items-center flex-wrap">
                  {settings.trust_logos.map((logo, idx) => {
                    const logoImg = theme === "dark" && logo.image_dark ? logo.image_dark : (logo.image_light || logo.image);
                    const isInverted = theme === "dark" && !logo.image_dark;
                    const logoHeight = settings?.trust_logos_cfg?.height || 40;
                    return (
                      <div key={idx} className="flex flex-col items-center justify-center min-w-[140px] select-none">
                        <div className="flex items-center justify-center" style={{ height: `${logoHeight + 8}px` }}>
                          {logoImg && (
                            <img
                              src={resolveAssetUrl(logoImg)}
                              alt={logo.name || "Partner Logo"}
                              style={{ height: `${logoHeight}px` }}
                              className={`max-w-[140px] w-auto object-contain opacity-60 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-300 ${isInverted ? "invert brightness-200" : ""}`}
                              loading="lazy"
                            />
                          )}
                        </div>
                        {logo.name && (
                          <span className="mt-2 text-[9px] font-medium tracking-widest text-muted-foreground/60 uppercase">
                            {logo.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                // 3 or more logos: Infinite marquee scrolling
                <div className="animate-marquee flex gap-16 py-2 items-center">
                  {(settings.trust_logos.length < 6
                    ? [...settings.trust_logos, ...settings.trust_logos, ...settings.trust_logos, ...settings.trust_logos]
                    : [...settings.trust_logos, ...settings.trust_logos]
                  ).map((logo, idx) => {
                    const logoImg = theme === "dark" && logo.image_dark ? logo.image_dark : (logo.image_light || logo.image);
                    const isInverted = theme === "dark" && !logo.image_dark;
                    const logoHeight = settings?.trust_logos_cfg?.height || 40;
                    return (
                      <div key={idx} className="flex flex-col items-center justify-center min-w-[140px] select-none">
                        <div className="flex items-center justify-center" style={{ height: `${logoHeight + 8}px` }}>
                          {logoImg && (
                            <img
                              src={resolveAssetUrl(logoImg)}
                              alt={logo.name || "Partner Logo"}
                              style={{ height: `${logoHeight}px` }}
                              className={`max-w-[140px] w-auto object-contain opacity-60 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-300 ${isInverted ? "invert brightness-200" : ""}`}
                              loading="lazy"
                            />
                          )}
                        </div>
                        {logo.name && (
                          <span className="mt-2 text-[9px] font-medium tracking-widest text-muted-foreground/60 uppercase">
                            {logo.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

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
      <Section eyebrow={`Why ${settings?.company?.name || "ORNETOPS"}`} title="Built differently. Trusted globally.">
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
      <Section eyebrow="Flagships" title="Featured products" sub="Explore our leading XRF analyzers and precious metal testing equipment.">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <Card key={p.id} className="group flex flex-col overflow-hidden border border-border bg-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/5" data-testid={`featured-${p.slug}`}>
              {/* Image Container */}
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <img
                  src={resolveAssetUrl(p.image)}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute left-4 top-4">
                  <Badge className="border border-primary/20 bg-background/90 text-primary backdrop-blur-sm text-[10px] font-semibold uppercase tracking-wider">
                    {p.category?.replace(/-/g, " ")}
                  </Badge>
                </div>
              </div>

              {/* Card Content */}
              <CardContent className="flex flex-1 flex-col p-6">
                <div className="flex-1">
                  <h3 className="font-display text-xl font-medium tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {p.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {p.tagline}
                  </p>

                  {/* Bullet features list */}
                  {p.features && p.features.length > 0 && (
                    <ul className="mt-4 space-y-2 border-t pt-4">
                      {p.features.slice(0, 3).map((f, idx) => (
                        <li key={idx} className="flex items-start text-xs text-muted-foreground">
                          <span className="mr-2 mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Card CTAs */}
                <div className="mt-6 grid grid-cols-2 gap-3 border-t pt-4">
                  <Button asChild size="sm" className="rounded-sm" data-testid={`featured-view-${p.slug}`}>
                    <Link to={`/products/${p.slug}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-sm" data-testid={`featured-quote-${p.slug}`}>
                    <Link to={`/request-quote?product=${encodeURIComponent(p.name)}`}>
                      Get Quote
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Testimonials */}
      <Section eyebrow="Voices" title={`Customers who trust ${settings?.company?.name || "ORNETOPS"}`}>
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
