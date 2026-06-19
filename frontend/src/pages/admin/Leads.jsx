import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Phone, Mail, MoveRight, MoveLeft, Plus, Search, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const STATUSES = [
  { key: "new", label: "New", color: "bg-blue-500/15 text-blue-500" },
  { key: "contacted", label: "Contacted", color: "bg-amber-500/15 text-amber-500" },
  { key: "qualified", label: "Qualified", color: "bg-violet-500/15 text-violet-500" },
  { key: "proposal_sent", label: "Proposal", color: "bg-cyan-500/15 text-cyan-500" },
  { key: "negotiation", label: "Negotiation", color: "bg-yellow-500/15 text-yellow-600" },
  { key: "won", label: "Won", color: "bg-emerald-500/15 text-emerald-500" },
  { key: "lost", label: "Lost", color: "bg-rose-500/15 text-rose-500" },
];

const SOURCES = ["contact", "demo_request", "quote_request", "product_inquiry", "dealer_inquiry", "support"];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    const { data } = await api.get("/leads");
    setLeads(data);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterSource !== "all" && l.source !== filterSource) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return [l.name, l.email, l.phone, l.company, l.product_interest, l.message]
        .filter(Boolean).join(" ").toLowerCase().includes(s);
    });
  }, [leads, search, filterSource]);

  const byStatus = useMemo(() => {
    const map = {};
    STATUSES.forEach((s) => (map[s.key] = []));
    filtered.forEach((l) => { (map[l.status] || (map[l.status] = [])).push(l); });
    return map;
  }, [filtered]);

  const moveStatus = async (lead, dir) => {
    const idx = STATUSES.findIndex((s) => s.key === lead.status);
    const next = STATUSES[Math.max(0, Math.min(STATUSES.length - 1, idx + dir))];
    if (!next || next.key === lead.status) return;
    await api.patch(`/leads/${lead.id}`, { status: next.key });
    toast.success(`Moved to ${next.label}`);
    load();
  };

  const setStatus = async (lead, status) => {
    await api.patch(`/leads/${lead.id}`, { status });
    toast.success("Status updated");
    load();
  };

  const remove = async (lead) => {
    if (!window.confirm("Delete this lead?")) return;
    await api.delete(`/leads/${lead.id}`);
    toast.success("Lead deleted");
    setSelected(null);
    load();
  };

  const addNote = async (lead, text) => {
    if (!text.trim()) return;
    await api.post(`/leads/${lead.id}/notes`, { text });
    const { data } = await api.get("/leads");
    setLeads(data);
    setSelected(data.find((l) => l.id === lead.id));
  };

  return (
    <div className="space-y-6" data-testid="leads-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">CRM</div>
          <h1 className="text-3xl font-medium tracking-tight">Leads Pipeline</h1>
          <p className="text-sm text-muted-foreground">Drag through the funnel · {filtered.length} leads</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="leads-search"
              className="h-9 w-64 pl-8"
              placeholder="Search name, company, product…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="h-9 w-44" data-testid="leads-source-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <NewLeadDialog open={createOpen} setOpen={setCreateOpen} onCreated={load} />
        </div>
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban" data-testid="tab-kanban">Kanban</TabsTrigger>
          <TabsTrigger value="table" data-testid="tab-table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-3">
            {STATUSES.map((s) => (
              <div key={s.key} className="w-72 flex-shrink-0" data-testid={`column-${s.key}`}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${s.color}`}>{s.label}</span>
                    <span className="text-xs text-muted-foreground">{byStatus[s.key]?.length || 0}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {(byStatus[s.key] || []).map((l) => (
                    <Card key={l.id} className="cursor-pointer border-border/60 hover:border-primary/50 transition-colors" onClick={() => setSelected(l)} data-testid={`lead-card-${l.id}`}>
                      <CardContent className="p-3 text-sm">
                        <div className="font-medium leading-tight">{l.name}</div>
                        <div className="text-xs text-muted-foreground">{l.company || "—"}</div>
                        {l.product_interest && (
                          <div className="mt-2 text-[10px] uppercase tracking-widest text-primary">{l.product_interest}</div>
                        )}
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <Badge variant="outline" className="text-[10px]">{l.source?.replace(/_/g, " ")}</Badge>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveStatus(l, -1); }} data-testid={`lead-${l.id}-back`}>
                              <MoveLeft className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveStatus(l, 1); }} data-testid={`lead-${l.id}-forward`}>
                              <MoveRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!byStatus[s.key] || byStatus[s.key].length === 0) && (
                    <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">No leads</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Product Interest</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelected(l)} data-testid={`row-lead-${l.id}`}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell>{l.company || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span>{l.email || ""}</span>
                          <span className="text-muted-foreground">{l.phone || ""}</span>
                        </div>
                      </TableCell>
                      <TableCell>{l.product_interest || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{l.source?.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell>
                        <StatusBadge status={l.status} />
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{l.created_at?.slice(0, 10)}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">No leads yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LeadDetailDialog
        lead={selected}
        onClose={() => setSelected(null)}
        onStatusChange={setStatus}
        onAddNote={addNote}
        onDelete={remove}
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUSES.find((x) => x.key === status) || STATUSES[0];
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${s.color}`}>{s.label}</span>;
}

function NewLeadDialog({ open, setOpen, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", product_interest: "", message: "", source: "contact" });
  const submit = async () => {
    if (!form.name) return toast.error("Name is required");
    await api.post("/leads", form);
    toast.success("Lead created");
    setOpen(false);
    setForm({ name: "", email: "", phone: "", company: "", product_interest: "", message: "", source: "contact" });
    onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 rounded-sm" data-testid="new-lead-btn"><Plus className="h-4 w-4 mr-1.5" /> New Lead</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create lead</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="new-lead-name" />
          <Field label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} testid="new-lead-company" />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} testid="new-lead-email" />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} testid="new-lead-phone" />
          <Field label="Product interest" value={form.product_interest} onChange={(v) => setForm({ ...form, product_interest: v })} testid="new-lead-product" />
          <div>
            <Label className="text-xs uppercase tracking-widest">Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs uppercase tracking-widest">Message</Label>
            <Textarea className="mt-1.5" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="new-lead-message" />
          </div>
        </div>
        <Button onClick={submit} data-testid="new-lead-submit">Create lead</Button>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, testid }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest">{label}</Label>
      <Input className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} />
    </div>
  );
}

function LeadDetailDialog({ lead, onClose, onStatusChange, onAddNote, onDelete }) {
  const [note, setNote] = useState("");
  useEffect(() => { setNote(""); }, [lead?.id]);
  if (!lead) return null;
  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="lead-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{lead.name}</span>
            <StatusBadge status={lead.status} />
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Info label="Company" value={lead.company} />
          <Info label="Source" value={lead.source} />
          <Info label="Email" value={lead.email} icon={Mail} />
          <Info label="Phone" value={lead.phone} icon={Phone} />
          <Info label="City" value={lead.city} />
          <Info label="Product" value={lead.product_interest} />
        </div>
        {lead.message && (
          <div className="rounded-md border bg-secondary/40 p-3 text-sm">{lead.message}</div>
        )}
        <div>
          <Label className="text-xs uppercase tracking-widest">Move to</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <Button key={s.key} variant={lead.status === s.key ? "default" : "outline"} size="sm"
                      onClick={() => onStatusChange(lead, s.key)} className="rounded-sm h-7 text-xs"
                      data-testid={`set-status-${s.key}`}>{s.label}</Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Follow-up notes ({lead.notes?.length || 0})</Label>
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {(lead.notes || []).map((n) => (
              <div key={n.id} className="rounded-md border bg-secondary/30 p-2 text-xs">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{n.by} · {n.at?.slice(0, 16).replace("T", " ")}</div>
                <div className="mt-1">{n.text}</div>
              </div>
            ))}
            {(!lead.notes || lead.notes.length === 0) && (
              <div className="text-xs text-muted-foreground">No notes yet</div>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a follow-up note…" data-testid="lead-note-input" />
            <Button onClick={() => { onAddNote(lead, note); setNote(""); }} data-testid="lead-note-add">Add</Button>
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="destructive" size="sm" onClick={() => onDelete(lead)} data-testid="lead-delete-btn"><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
          <Button variant="outline" size="sm" onClick={onClose} data-testid="lead-close-btn">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-sm">{Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}{value || "—"}</div>
    </div>
  );
}
