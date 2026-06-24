import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, CalendarCheck } from "lucide-react";
import { toast } from "sonner";

export default function RequestDemo() {
  const [search] = useSearchParams();
  const initialProduct = search.get("product") || "";
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", city: "", product_interest: initialProduct, preferred_date: "", message: "" });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const setF = (k, v) => {
    setForm({ ...form, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: "" });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Enter a valid email address";
    }
    if (!form.phone.trim()) {
      e.phone = "Phone is required";
    } else if (!/^\+?[\d\s\-()]{7,15}$/.test(form.phone.trim())) {
      e.phone = "Enter a valid phone number";
    }
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      await api.post("/demo-requests/public", form);
      setDone(true);
      toast.success("Demo request submitted");
    } catch {
      toast.error("Failed to submit. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b" data-testid="request-demo-page">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 lg:grid-cols-2 lg:px-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Schedule</div>
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight lg:text-5xl">Request a Demo</h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">Book a 30-minute on-site or virtual demonstration with an application engineer.</p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Hands-on testing with your samples", "Custom workflow walk-through", "Karat-level accuracy comparison", "Pricing & commercial options"].map((b) => (
              <li key={b} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> {b}</li>
            ))}
          </ul>
        </div>
        <Card>
          <CardContent className="p-6">
            {done ? (
              <div className="py-16 text-center">
                <CalendarCheck className="mx-auto h-10 w-10 text-emerald-500" />
                <div className="mt-3 text-lg font-medium">Demo request submitted</div>
                <p className="mt-1 text-sm text-muted-foreground">We'll confirm a slot within 4 business hours.</p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
                <F label="Name *" v={form.name} on={(v) => setF("name", v)} testid="rd-name" error={errors.name} />
                <F label="Company" v={form.company} on={(v) => setF("company", v)} testid="rd-company" />
                <F label="Email *" v={form.email} on={(v) => setF("email", v)} type="email" testid="rd-email" error={errors.email} />
                <F label="Phone *" v={form.phone} on={(v) => setF("phone", v)} testid="rd-phone" error={errors.phone} />
                <F label="City" v={form.city} on={(v) => setF("city", v)} testid="rd-city" />
                <F label="Product" v={form.product_interest} on={(v) => setF("product_interest", v)} testid="rd-product" />
                <F label="Preferred Date" v={form.preferred_date} on={(v) => setF("preferred_date", v)} type="date" testid="rd-date" />
                <div className="sm:col-span-2">
                  <Label className="text-xs uppercase tracking-widest">Notes</Label>
                  <Textarea className="mt-1.5" value={form.message} onChange={(e) => setF("message", e.target.value)} data-testid="rd-message" />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={loading} className="rounded-sm" data-testid="rd-submit">{loading ? "Submitting…" : "Book Demo"}</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function F({ label, v, on, testid, type = "text", error }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest">{label}</Label>
      <Input
        type={type}
        className={`mt-1.5 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
        value={v}
        onChange={(e) => on(e.target.value)}
        data-testid={testid}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
