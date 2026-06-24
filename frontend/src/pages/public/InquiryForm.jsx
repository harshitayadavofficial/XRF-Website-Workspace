import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export default function InquiryForm({ productInterest = "", source = "contact", title = "Talk to a product specialist" }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", city: "", message: "", product_interest: productInterest });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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
      await api.post("/leads/public", { ...form, source });
      setDone(true);
      toast.success("Your inquiry has been received");
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === "string" ? msg : "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-md border bg-secondary/40 p-6 text-center" data-testid="inquiry-success">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
        <div className="mt-3 text-lg font-medium">Inquiry submitted</div>
        <p className="mt-1 text-sm text-muted-foreground">An application engineer will reach out within 4 business hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2" data-testid="inquiry-form">
      <Field label="Full Name *" v={form.name} on={(v) => setF("name", v)} testid="inq-name" error={errors.name} />
      <Field label="Company" v={form.company} on={(v) => setF("company", v)} testid="inq-company" />
      <Field label="Email *" v={form.email} on={(v) => setF("email", v)} type="email" testid="inq-email" error={errors.email} />
      <Field label="Phone *" v={form.phone} on={(v) => setF("phone", v)} testid="inq-phone" error={errors.phone} />
      <Field label="City" v={form.city} on={(v) => setF("city", v)} testid="inq-city" />
      <Field label="Product interest" v={form.product_interest} on={(v) => setF("product_interest", v)} testid="inq-product" />
      <div className="sm:col-span-2">
        <Label className="text-xs uppercase tracking-widest">How can we help?</Label>
        <Textarea className="mt-1.5" value={form.message} onChange={(e) => setF("message", e.target.value)} data-testid="inq-message" rows={4} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={loading} className="rounded-sm" data-testid="inq-submit">{loading ? "Sending…" : "Submit inquiry"}</Button>
      </div>
    </form>
  );
}

function Field({ label, v, on, testid, type = "text", error }) {
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
