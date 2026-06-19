import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, FileCheck2 } from "lucide-react";
import { toast } from "sonner";

export default function RequestQuote() {
  const [search] = useSearchParams();
  const initialProduct = search.get("product") || "";
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", product: initialProduct, quantity: 1, message: "" });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const setF = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error("Name is required");
    setLoading(true);
    try {
      await api.post("/quote-requests/public", { ...form, quantity: Number(form.quantity) || 1 });
      setDone(true);
      toast.success("Quote request submitted");
    } catch {
      toast.error("Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b" data-testid="request-quote-page">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 lg:grid-cols-2 lg:px-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Pricing</div>
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight lg:text-5xl">Request a Quote</h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">Get a tailored quote with volume pricing, AMC options and warranty details.</p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Best-in-class pricing", "Custom AMC bundles", "Lease & EMI options", "Pan-India / global delivery"].map((b) => (
              <li key={b} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> {b}</li>
            ))}
          </ul>
        </div>
        <Card>
          <CardContent className="p-6">
            {done ? (
              <div className="py-16 text-center">
                <FileCheck2 className="mx-auto h-10 w-10 text-emerald-500" />
                <div className="mt-3 text-lg font-medium">Quote request submitted</div>
                <p className="mt-1 text-sm text-muted-foreground">Our team will revert with pricing within 1 business day.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
                <F label="Name *" v={form.name} on={(v) => setF("name", v)} testid="rq-name" />
                <F label="Company" v={form.company} on={(v) => setF("company", v)} testid="rq-company" />
                <F label="Email" v={form.email} on={(v) => setF("email", v)} type="email" testid="rq-email" />
                <F label="Phone" v={form.phone} on={(v) => setF("phone", v)} testid="rq-phone" />
                <F label="Product" v={form.product} on={(v) => setF("product", v)} testid="rq-product" />
                <F label="Quantity" v={form.quantity} on={(v) => setF("quantity", v)} type="number" testid="rq-qty" />
                <div className="sm:col-span-2">
                  <Label className="text-xs uppercase tracking-widest">Additional Requirements</Label>
                  <Textarea className="mt-1.5" value={form.message} onChange={(e) => setF("message", e.target.value)} data-testid="rq-message" />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={loading} className="rounded-sm" data-testid="rq-submit">{loading ? "Submitting…" : "Request Quote"}</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function F({ label, v, on, testid, type = "text" }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest">{label}</Label>
      <Input type={type} className="mt-1.5" value={v} onChange={(e) => on(e.target.value)} data-testid={testid} />
    </div>
  );
}
