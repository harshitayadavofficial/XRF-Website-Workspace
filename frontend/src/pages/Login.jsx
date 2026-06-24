import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ScanLine, ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { usePublicSettings } from "@/context/SettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { resolveAssetUrl } from "@/components/FileUpload";

export default function Login() {
  const { login } = useAuth();
  const { settings } = usePublicSettings();
  const { theme } = useTheme();
  const brandName = settings?.company?.name || "ORNETOPS";
  const logoConfig = settings?.logo || { mode: "text", text: "ORNETOPS", image: "", image_light: "", image_dark: "" };

  // Theme-aware logo image for form side
  let formLogoImg = logoConfig.image;
  if (theme === "dark" && logoConfig.image_dark) {
    formLogoImg = logoConfig.image_dark;
  } else if (theme === "light" && logoConfig.image_light) {
    formLogoImg = logoConfig.image_light;
  } else if (logoConfig.image_light) {
    formLogoImg = logoConfig.image_light;
  }

  // Dark-theme logo image for left branding side (always dark background)
  const leftLogoImg = logoConfig.image_dark || logoConfig.image || logoConfig.image_light;
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/admin";

  useEffect(() => {
    document.title = `Admin Login | ${brandName}`;
  }, [brandName]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        <div className="relative z-10 flex items-center gap-2.5 text-sm font-semibold">
          {logoConfig.mode !== "text" && leftLogoImg ? (
            <img src={resolveAssetUrl(leftLogoImg)} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <ScanLine className="h-5 w-5 text-primary" />
          )}
          {logoConfig.mode !== "image" && <span>{logoConfig.text || brandName}</span>}
        </div>
        <div className="relative z-10 space-y-6">
          {logoConfig.mode !== "text" && leftLogoImg && (
            <img src={resolveAssetUrl(leftLogoImg)} alt="Logo" className="h-12 w-auto object-contain" />
          )}
          <div>
            <h1 className="font-display text-5xl font-medium leading-[0.95] tracking-tighter text-balance">
              Precision Engineered<br />
              for the world of <span className="text-primary">Precious Metals</span>.
            </h1>
            <p className="mt-4 max-w-md text-sm text-zinc-400">
              Enterprise console for managing your XRF analyzers, hallmarking workflow, leads, and global dealer network.
            </p>
          </div>
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
            <div className="mb-6 flex flex-col items-start gap-4">
              {logoConfig.mode !== "text" && formLogoImg ? (
                <img src={resolveAssetUrl(formLogoImg)} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <div className="rounded-md border bg-secondary p-2"><ScanLine className="h-4 w-4 text-primary" /></div>
              )}
              <div>
                <h2 className="text-2xl font-medium tracking-tight">Welcome back</h2>
                <p className="text-sm text-muted-foreground">Sign in to {brandName} Admin</p>
              </div>
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

            <div className="mt-6 text-center text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary">← Back to website</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
