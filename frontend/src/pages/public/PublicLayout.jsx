import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ScanLine, Menu, X, Phone, MessageCircleMore, ArrowRight, Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import AnnouncementBar from "@/components/AnnouncementBar";
import { usePublicSettings } from "@/context/SettingsContext";
import { resolveAssetUrl } from "@/components/FileUpload";
import { useTheme } from "@/context/ThemeContext";


const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About" },
  { to: "/products", label: "Products" },
  { to: "/industries", label: "Industries" },
  { to: "/technology", label: "Technology" },
  { to: "/services", label: "Services" },
  { to: "/events", label: "Events" },
  { to: "/resources", label: "Resources" },
  { to: "/contact", label: "Contact" },
];

export default function PublicLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { settings } = usePublicSettings();

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });

    const companyName = settings?.company?.name || "ORNETOPS";
    const seoTitle = settings?.seo?.title || `${companyName} — XRF Analyzers, Gold Testing, Hallmarking`;

    if (pathname === "/") {
      document.title = seoTitle;
    } else {
      const matched = NAV.find(n => n.to === pathname);
      let pageLabel = matched ? matched.label : "";
      if (!pageLabel && pathname.startsWith("/products/")) {
        pageLabel = "Product Details";
      } else if (!pageLabel) {
        const pathSegments = pathname.split("/").filter(Boolean);
        if (pathSegments.length > 0) {
          const rawSegment = pathSegments[pathSegments.length - 1];
          pageLabel = rawSegment.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        }
      }
      document.title = pageLabel ? `${pageLabel} | ${companyName}` : seoTitle;
    }
  }, [pathname, settings]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnnouncementBar config={settings?.announcements?.top} variant="top" testid="top-announcement" />
      <Header open={open} setOpen={setOpen} />
      <main className="min-h-[calc(100vh-4rem)]"><Outlet /></main>
      <Footer />
      <FloatingActions />
    </div>
  );
}

function Header({ open, setOpen }) {
  const { settings } = usePublicSettings();
  const { theme } = useTheme();
  
  const logo = settings?.logo || { mode: "text", text: "ORNETOPS", image: "", image_light: "", image_dark: "" };
  const logoText = logo.text || settings?.company?.name || "ORNETOPS";
  const hasText = (logo.mode === "text" || logo.mode === "both");
  
  // Resolve theme-specific logo image
  let logoImg = logo.image;
  if (theme === "dark" && logo.image_dark) {
    logoImg = logo.image_dark;
  } else if (theme === "light" && logo.image_light) {
    logoImg = logo.image_light;
  } else if (logo.image_light) {
    logoImg = logo.image_light;
  }
  
  const hasImage = (logo.mode === "image" || logo.mode === "both") && logoImg;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" data-testid="logo-link">
          {hasImage ? (
            <img
              src={resolveAssetUrl(logoImg)}
              alt="Logo"
              className="h-8 w-auto object-contain max-w-[150px]"
            />
          ) : (
            <ScanLine className="h-5 w-5 text-primary" />
          )}
          {hasText && (
            <span className="font-display text-base font-bold tracking-tight">
              {logoText}
              <span className="text-primary">.</span>
            </span>
          )}
        </Link>

        <nav className="hidden gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              data-testid={`nav-${n.label.toLowerCase()}`}
              className={({ isActive }) =>
                `relative rounded-md px-3 py-1.5 text-sm transition-colors hover:text-primary ${isActive ? "text-primary" : "text-foreground/70"}`
              }>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild className="hidden h-9 rounded-sm sm:inline-flex" data-testid="header-quote-btn">
            <Link to="/request-quote">Request Quote <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="hidden xl:inline-flex" data-testid="header-admin-link">
            <Link to="/admin/login">Admin</Link>
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)} data-testid="mobile-menu-btn">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t bg-background">
          <div className="space-y-1 px-4 py-3">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => `block rounded-md px-3 py-2 text-sm ${isActive ? "bg-secondary text-primary" : "text-foreground/80"}`}>
                {n.label}
              </NavLink>
            ))}
            <Link to="/admin/login" className="block rounded-md px-3 py-2 text-sm text-muted-foreground">Admin Console</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const { settings } = usePublicSettings();
  const { theme } = useTheme();
  
  const headerLogo = settings?.logo || { mode: "text", text: "ORNETOPS", image: "", image_light: "", image_dark: "" };
  const footerConfig = settings?.footer_logo || { mode: "inherit", text: "", image: "", image_light: "", image_dark: "" };
  
  // Resolve config for footer
  const logo = footerConfig.mode === "inherit" ? headerLogo : footerConfig;
  
  const logoText = logo.text || settings?.company?.name || "ORNETOPS";
  const hasText = (logo.mode === "text" || logo.mode === "both");
  
  // Resolve theme-specific logo image
  let logoImg = logo.image;
  if (theme === "dark" && logo.image_dark) {
    logoImg = logo.image_dark;
  } else if (theme === "light" && logo.image_light) {
    logoImg = logo.image_light;
  } else if (logo.image_light) {
    logoImg = logo.image_light;
  }
  
  const logoHeight = footerConfig.height || 32;
  const logoWidth = footerConfig.width ? `${footerConfig.width}px` : "auto";
  
  const hasImage = (logo.mode === "image" || logo.mode === "both") && logoImg;

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            {hasImage ? (
              <img
                src={resolveAssetUrl(logoImg)}
                alt="Logo"
                style={{ height: `${logoHeight}px`, width: logoWidth }}
                className="object-contain"
              />
            ) : (
              <ScanLine className="h-5 w-5 text-primary" />
            )}
            {hasText && (
              <span className="font-display text-base font-bold">
                {logoText}
                <span className="text-primary">.</span>
              </span>
            )}
          </div>

          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{settings?.footer_logo?.description || "Precision XRF, gold testing, hallmarking and laser marking systems trusted by jewellers, refineries & labs worldwide."}</p>
          {settings?.social && (() => {
            const socialColor = settings.social.color || "#D4AF37";
            return (
              <div className="mt-4 flex gap-3">
                {settings.social.facebook && <a href={settings.social.facebook} target="_blank" rel="noreferrer" style={{ color: socialColor }} className="hover:opacity-85 transition-opacity" aria-label="Facebook"><Facebook className="h-4 w-4" /></a>}
                {settings.social.instagram && <a href={settings.social.instagram} target="_blank" rel="noreferrer" style={{ color: socialColor }} className="hover:opacity-85 transition-opacity" aria-label="Instagram"><Instagram className="h-4 w-4" /></a>}
                {settings.social.linkedin && <a href={settings.social.linkedin} target="_blank" rel="noreferrer" style={{ color: socialColor }} className="hover:opacity-85 transition-opacity" aria-label="LinkedIn"><Linkedin className="h-4 w-4" /></a>}
                {settings.social.twitter && <a href={settings.social.twitter} target="_blank" rel="noreferrer" style={{ color: socialColor }} className="hover:opacity-85 transition-opacity" aria-label="Twitter"><Twitter className="h-4 w-4" /></a>}
                {settings.social.youtube && <a href={settings.social.youtube} target="_blank" rel="noreferrer" style={{ color: socialColor }} className="hover:opacity-85 transition-opacity" aria-label="YouTube"><Youtube className="h-4 w-4" /></a>}
              </div>
            );
          })()}
        </div>
        <FooterCol title="Products" links={[
          ["XRF Analyzers", "/products?cat=xrf-analyzers"],
          ["Gold Testing", "/products?cat=gold-testing"],
          ["Hallmarking", "/products?cat=hallmarking"],
          ["Laser Marking", "/products?cat=laser-marking"],
          ["Furnaces", "/products?cat=furnaces"],
        ]} />
        <FooterCol title="Company" links={[
          ["About", "/about"], ["Industries", "/industries"],
          ["Technology", "/technology"], ["Resources", "/resources"],
          ["Contact", "/contact"],
        ]} />
        <FooterCol title="Engage" links={[
          ["Request Demo", "/request-demo"], ["Request Quote", "/request-quote"],
          ["Events", "/events"],
          ["Become a Dealer", "/dealers"], ["Support Ticket", "/support"],
          ["Admin", "/admin/login"],
        ]} />
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground lg:flex-row lg:px-8">
          <div>© {new Date().getFullYear()} {settings?.company?.name || "ORNETOPS"} · All rights reserved.</div>
          <div className="uppercase tracking-[0.18em]">{settings?.company?.footer_bottom_text || "Engineered with precision · ISO • BIS • NABL"}</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</div>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([l, h]) => <li key={l}><Link to={h} className="hover:text-primary">{l}</Link></li>)}
      </ul>
    </div>
  );
}

function FloatingActions() {
  const { settings } = usePublicSettings();
  const phone = settings?.company?.phone || settings?.company?.whatsapp || "+919999999999";
  const waNumber = (settings?.company?.whatsapp || settings?.whatsapp_cfg?.number || "919999999999").replace(/[^0-9]/g, "");
  const waMsg = settings?.whatsapp_cfg?.default_msg || `Hi, I'd like to know more about ${settings?.company?.name || "ORNETOPS"} products.`;
  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2" data-testid="floating-actions">
      <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noreferrer"
         className="group flex items-center gap-2 rounded-full border bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-600"
         data-testid="float-whatsapp">
        <MessageCircleMore className="h-4 w-4" /> WhatsApp
      </a>
      <a href={`tel:${phone}`} className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs font-semibold shadow-lg hover:bg-secondary" data-testid="float-call">
        <Phone className="h-4 w-4" /> Call
      </a>
    </div>
  );
}
