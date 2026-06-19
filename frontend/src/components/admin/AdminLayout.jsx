import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, ShoppingBag, Newspaper, FileText,
  MessageSquare, LifeBuoy, Calendar, Building2, Star, Settings, Activity,
  LogOut, Menu, X, ScanLine, Layers, Tag, Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/leads", label: "Leads (CRM)", icon: Briefcase },
  { to: "/admin/demo-requests", label: "Demo Requests", icon: Calendar },
  { to: "/admin/quote-requests", label: "Quote Requests", icon: FileText },
  { to: "/admin/tickets", label: "Support Tickets", icon: LifeBuoy },
  { type: "divider", label: "Catalog" },
  { to: "/admin/products", label: "Products", icon: ShoppingBag },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/industries", label: "Industries", icon: Layers },
  { to: "/admin/services", label: "Services", icon: Wrench },
  { type: "divider", label: "Content" },
  { to: "/admin/blogs", label: "Blogs", icon: Newspaper },
  { to: "/admin/case-studies", label: "Case Studies", icon: FileText },
  { to: "/admin/testimonials", label: "Testimonials", icon: Star },
  { to: "/admin/events", label: "Events", icon: Calendar },
  { to: "/admin/dealers", label: "Dealers", icon: Building2 },
  { type: "divider", label: "System" },
  { to: "/admin/users", label: "Users & Roles", icon: Users, roles: ["super_admin", "admin"] },
  { to: "/admin/audit", label: "Audit Log", icon: Activity, roles: ["super_admin", "admin"] },
  { to: "/admin/settings", label: "Settings", icon: Settings, roles: ["super_admin", "admin"] },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => {
    if (n.type === "divider") return true;
    if (!n.roles) return true;
    return n.roles.includes(user?.role) || user?.role === "super_admin";
  });

  const handleLogout = async () => { await logout(); navigate("/admin/login"); };

  return (
    <div className="font-admin flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-card transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="admin-sidebar"
      >
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <ScanLine className="h-5 w-5 text-primary" />
          <Link to="/admin" className="text-sm font-bold tracking-tight">
            AurumTech<span className="text-primary">.</span>Admin
          </Link>
        </div>
        <nav className="scrollbar-thin h-[calc(100vh-4rem)] overflow-y-auto p-3 text-sm">
          {items.map((item, idx) => {
            if (item.type === "divider") {
              return (
                <div key={`d-${idx}`} className="mt-4 mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {item.label}
                </div>
              );
            }
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className={({ isActive }) =>
                  `mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-secondary ${
                    isActive ? "bg-secondary text-primary font-medium" : "text-foreground/70"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
          <Separator className="my-3" />
          <Link to="/" className="mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-foreground/60 hover:bg-secondary" data-testid="nav-view-website">
            <ShoppingBag className="h-4 w-4" /> View Website
          </Link>
        </nav>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)} data-testid="sidebar-toggle">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Enterprise Console</div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-xs font-semibold">{user?.name}</span>
              <span className="text-[10px] uppercase tracking-widest text-primary">{user?.role?.replace(/_/g, " ")}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
