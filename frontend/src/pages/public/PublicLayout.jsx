import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ScanLine, Menu, X, Phone, MessageCircleMore, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/products", label: "Products" },
  { to: "/industries", label: "Industries" },
  { to: "/technology", label: "Technology" },
  { to: "/services", label: "Services" },
  { to: "/resources", label: "Resources" },
  { to: "/contact", label: "Contact" },
];

export default function PublicLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header open={open} setOpen={setOpen} />
      <main className="min-h-[calc(100vh-4rem)]"><Outlet /></main>
      <Footer />
      <FloatingActions />
    </div>
  );
}

function Header({ open, setOpen }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
          <ScanLine className="h-5 w-5 text-primary" />
          <span className="font-display text-base font-bold tracking-tight">AurumTech<span className="text-primary">.</span></span>
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
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <span className="font-display text-base font-bold">AurumTech<span className="text-primary">.</span></span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">Precision XRF, gold testing, hallmarking and laser marking systems trusted by jewellers, refineries & labs worldwide.</p>
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
          ["Become a Dealer", "/dealers"], ["Support Ticket", "/support"],
          ["Admin", "/admin/login"],
        ]} />
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground lg:flex-row lg:px-8">
          <div>© {new Date().getFullYear()} AurumTech Instruments · All rights reserved.</div>
          <div className="uppercase tracking-[0.18em]">Engineered with precision · ISO • BIS • NABL</div>
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
  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2" data-testid="floating-actions">
      <a href="https://wa.me/919999999999?text=Hi%20AurumTech" target="_blank" rel="noreferrer"
         className="group flex items-center gap-2 rounded-full border bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-600"
         data-testid="float-whatsapp">
        <MessageCircleMore className="h-4 w-4" /> WhatsApp
      </a>
      <a href="tel:+919999999999" className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs font-semibold shadow-lg hover:bg-secondary" data-testid="float-call">
        <Phone className="h-4 w-4" /> Call
      </a>
    </div>
  );
}
