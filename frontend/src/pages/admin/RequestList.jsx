import { useEffect, useState } from "react";
import { usePublicSettings } from "@/context/SettingsContext";
import { api } from "@/lib/api";
import ExportButton from "@/components/admin/ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUSES = {
  demo: ["new", "scheduled", "completed", "cancelled"],
  quote: ["new", "in_review", "sent", "won", "lost"],
  ticket: ["open", "in_progress", "waiting_customer", "resolved", "closed"],
};

const COLORS = {
  new: "bg-blue-500/15 text-blue-500",
  scheduled: "bg-violet-500/15 text-violet-500",
  completed: "bg-emerald-500/15 text-emerald-500",
  cancelled: "bg-zinc-500/15 text-zinc-400",
  in_review: "bg-amber-500/15 text-amber-500",
  sent: "bg-cyan-500/15 text-cyan-500",
  won: "bg-emerald-500/15 text-emerald-500",
  lost: "bg-rose-500/15 text-rose-500",
  open: "bg-blue-500/15 text-blue-500",
  in_progress: "bg-amber-500/15 text-amber-500",
  waiting_customer: "bg-violet-500/15 text-violet-500",
  resolved: "bg-emerald-500/15 text-emerald-500",
  closed: "bg-zinc-500/15 text-zinc-400",
};

export default function RequestList({ kind }) {
  // kind: "demo" | "quote" | "ticket"
  const endpoint = kind === "demo" ? "demo-requests" : kind === "quote" ? "quote-requests" : "tickets";
  const [items, setItems] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sendingId, setSendingId] = useState(null);
  const { dataVersion } = usePublicSettings();

  const load = async () => {
    const { data } = await api.get(`/${endpoint}`);
    setItems(data);
  };
  useEffect(() => { load(); }, [kind, refreshKey, dataVersion]);

  const updateStatus = async (id, status) => {
    await api.patch(`/${endpoint}/${id}`, { status });
    setRefreshKey((k) => k + 1);
  };

  const sendQuotePdf = async (id) => {
    setSendingId(id);
    try {
      const { data } = await api.post(`/quote-requests/${id}/send-quote-pdf`);
      if (data.ok) {
        toast.success("Quote PDF & Brochure sent successfully via email!");
        load();
      } else {
        toast.error("Failed to send: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      toast.error("Error: " + (err.response?.data?.detail || err.message));
    } finally {
      setSendingId(null);
    }
  };

  const titleMap = { demo: "Demo Requests", quote: "Quote Requests", ticket: "Support Tickets" };

  return (
    <div className="space-y-6" data-testid={`${kind}-requests-page`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Inbox</div>
          <h1 className="text-3xl font-medium tracking-tight">{titleMap[kind]}</h1>
          <p className="text-sm text-muted-foreground">{items.length} entries</p>
        </div>
        <ExportButton resource={endpoint} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email / Phone</TableHead>
                {kind !== "ticket" && <TableHead>Company</TableHead>}
                {kind === "demo" && <TableHead>Preferred Date</TableHead>}
                {kind === "quote" && <TableHead>Product / Qty</TableHead>}
                {kind === "ticket" && <TableHead>Subject</TableHead>}
                <TableHead>Status</TableHead>
                {kind === "quote" && <TableHead>Actions</TableHead>}
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id} data-testid={`req-row-${it.id}`}>
                  <TableCell className="font-medium">{it.name || it.email}</TableCell>
                  <TableCell><div className="text-xs"><div>{it.email}</div><div className="text-muted-foreground">{it.phone}</div></div></TableCell>
                  {kind !== "ticket" && <TableCell>{it.company || "—"}</TableCell>}
                  {kind === "demo" && <TableCell className="text-sm">{it.preferred_date || "—"}</TableCell>}
                  {kind === "quote" && <TableCell className="text-sm">{it.product || "—"} {it.quantity ? `× ${it.quantity}` : ""}</TableCell>}
                  {kind === "ticket" && <TableCell className="text-sm">{it.subject}</TableCell>}
                  <TableCell>
                    <Select value={it.status} onValueChange={(v) => updateStatus(it.id, v)}>
                      <SelectTrigger className="h-7 w-36" data-testid={`status-select-${it.id}`}>
                        <SelectValue>
                          <Badge className={`${COLORS[it.status] || ""} text-[10px] uppercase tracking-widest`} variant="outline">{it.status?.replace(/_/g, " ") || "—"}</Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES[kind].map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {kind === "quote" && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-primary text-primary hover:bg-primary/10 rounded-sm"
                        onClick={() => sendQuotePdf(it.id)}
                        disabled={sendingId === it.id}
                        data-testid={`send-quote-pdf-${it.id}`}
                      >
                        {sendingId === it.id ? "Sending..." : "Send Quote PDF"}
                      </Button>
                    </TableCell>
                  )}
                  <TableCell className="text-right text-xs text-muted-foreground">{it.created_at?.slice(0, 10)}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={kind === "quote" ? 9 : 8} className="py-12 text-center text-muted-foreground">Nothing here yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
