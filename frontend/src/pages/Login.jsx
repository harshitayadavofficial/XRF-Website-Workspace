import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ScanLine, ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/admin";
  const [email, setEmail] = useState("admin@aurumtech.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-admin relative grid min-h-screen lg:grid-cols-2">
      {/* Branding side */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-zinc-950 p-12 text-white">
        <div className="absolute inset-0 grain opacity-30" />
        <div
          className="absolute -right-20 -top-20 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle at center, #D4AF37 0%, transparent 60%)" }}
        />
        <div className="relative z-10 flex items-center gap-2 text-sm font-semibold">
          <ScanLine className="h-5 w-5 text-primary" /> AurumTech Instruments
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-5xl font-medium leading-[0.95] tracking-tighter text-balance">
            Precision Engineered<br />
            for the world of <span className="text-primary">Precious Metals</span>.
          </h1>
          <p className="mt-4 max-w-md text-sm text-zinc-400">
            Enterprise console for managing your XRF analyzers, hallmarking workflow, leads, and global dealer network.
          </p>
        </div>
        <div className="relative z-10 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          © {new Date().getFullYear()} · Enterprise CMS + CRM
        </div>
      </div>

      {/* Form side */}
      <div className="relative flex items-center justify-center bg-background p-6">
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        <Card className="w-full max-w-sm border-border/60">
          <CardContent className="p-8">
            <div className="mb-6 flex flex-col items-start">
              <div className="rounded-md border bg-secondary p-2"><ScanLine className="h-4 w-4 text-primary" /></div>
              <h2 className="mt-4 text-2xl font-medium tracking-tight">Welcome back</h2>
              <p className="text-sm text-muted-foreground">Sign in to AurumTech Admin</p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-xs uppercase tracking-widest">Email</Label>
                <Input
                  id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="login-email-input"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-xs uppercase tracking-widest">Password</Label>
                <Input
                  id="password" type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="login-password-input"
                  className="mt-1.5"
                />
              </div>
              {error && <p className="text-sm text-destructive" data-testid="login-error">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full rounded-sm" data-testid="login-submit-btn">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>)}
              </Button>
            </form>
            <div className="mt-6 rounded-md border border-dashed border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
              <div className="mb-1 font-semibold text-foreground">Demo credentials</div>
              <div>admin@aurumtech.com / Admin@123</div>
              <div>sales@aurumtech.com / Sales@123</div>
              <div>content@aurumtech.com / Content@123</div>
            </div>
            <div className="mt-6 text-center text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary">← Back to website</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
