import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import FileUpload from "@/components/FileUpload";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import ExportButton from "@/components/admin/ExportButton";

/**
 * Generic CRUD page used by lightweight CMS modules.
 * fields: [{key, label, type: 'text'|'textarea'|'switch'|'image'|'url', placeholder?}]
 */
export default function CrudPage({
  title,
  subtitle,
  resource,
  testidPrefix = "cms",
  fields = [
    { key: "title", label: "Title *", type: "text" },
    { key: "slug", label: "Slug", type: "text" },
    { key: "excerpt", label: "Excerpt", type: "textarea" },
    { key: "content", label: "Content", type: "textarea" },
    { key: "image", label: "Image URL", type: "url" },
    { key: "published", label: "Published", type: "switch" },
  ],
  displayCols = ["title", "category", "created_at"],
}) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    const { data } = await api.get(`/${resource}`);
    setItems(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [resource]);

  const remove = async (id) => {
    await api.delete(`/${resource}/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6" data-testid={`${testidPrefix}-page`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">CMS</div>
          <h1 className="text-3xl font-medium tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle || `${items.length} entries`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setEditing({})} className="rounded-sm" data-testid={`${testidPrefix}-new-btn`}>
            <Plus className="h-4 w-4 mr-1.5" /> New
          </Button>
          <ExportButton resource={resource} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {displayCols.map((c) => <TableHead key={c}>{c.replace(/_/g, " ")}</TableHead>)}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id} data-testid={`${testidPrefix}-row-${it.id}`}>
                  {displayCols.map((c) => (
                    <TableCell key={c} className="max-w-xs truncate text-sm">
                      {c === "created_at" ? (it[c] || "").slice(0, 10) : (typeof it[c] === "boolean" ? (it[c] ? "Yes" : "No") : (it[c] || "—"))}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(it)} data-testid={`${testidPrefix}-edit-${it.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(it.id)} data-testid={`${testidPrefix}-delete-${it.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={displayCols.length + 1} className="py-12 text-center text-muted-foreground">No entries yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <EditDialog
          item={editing}
          fields={fields}
          resource={resource}
          testidPrefix={testidPrefix}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await remove(deleteId);
            setDeleteId(null);
          }
        }}
        title="Delete this item?"
        description="Are you sure you want to permanently delete this item? This action cannot be undone."
      />
    </div>
  );
}

function EditDialog({ item, fields, resource, onClose, onSaved, testidPrefix }) {
  const [form, setForm] = useState(item);
  const [saving, setSaving] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [recipientMode, setRecipientMode] = useState("all");
  const [leads, setLeads] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);

  useEffect(() => { setForm(item); }, [item]);

  useEffect(() => {
    if (resource === "blogs") {
      api.get("/leads")
        .then((r) => {
          setLeads(r.data.filter((l) => l.email));
        })
        .catch((err) => console.error("Error loading leads for newsletter:", err));
    }
  }, [resource]);

  const save = async () => {
    let finalForm = { ...form };
    if (resource === "blogs" && sendNotification) {
      const recipientList = recipientMode === "all" ? "all" : selectedEmails;
      if (recipientMode === "selected" && selectedEmails.length === 0) {
        toast.error("Please select at least one customer to notify.");
        return;
      }
      
      const recipientLabel = recipientMode === "all" ? "all" : `${selectedEmails.length} selected`;
      const confirmed = window.confirm(`Are you sure you want to save this post and dispatch email notifications to ${recipientLabel} customers?`);
      if (!confirmed) return;

      finalForm.email_notification = {
        enabled: true,
        recipients: recipientList
      };
    }

    setSaving(true);
    try {
      if (item.id) await api.patch(`/${resource}/${item.id}`, finalForm);
      else await api.post(`/${resource}`, finalForm);
      toast.success("Saved");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader><DialogTitle>{item?.id ? "Edit" : "New"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <Label className="text-xs uppercase tracking-widest">{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  rows={f.rows || 4}
                  value={form[f.key] || ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="mt-1.5"
                  placeholder={f.placeholder}
                  data-testid={`${testidPrefix}-field-${f.key}`}
                />
              ) : f.type === "date" ? (
                <Input
                  type="date"
                  value={form[f.key] || ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="mt-1.5 [color-scheme:light] dark:[color-scheme:dark]"
                  data-testid={`${testidPrefix}-field-${f.key}`}
                />
              ) : f.type === "switch" ? (
                <div className="mt-1.5"><Switch checked={!!form[f.key]} onCheckedChange={(v) => setForm({ ...form, [f.key]: v })} data-testid={`${testidPrefix}-field-${f.key}`} /></div>
              ) : f.type === "upload" ? (
                <div className="mt-1.5">
                  <FileUpload
                    value={form[f.key] || ""}
                    onChange={(v) => setForm({ ...form, [f.key]: v })}
                    mode="single"
                    accept={f.accept || "image"}
                    testid={`${testidPrefix}-field-${f.key}`}
                  />
                </div>
              ) : f.type === "upload_multi" ? (
                <div className="mt-1.5">
                  <FileUpload
                    value={Array.isArray(form[f.key]) ? form[f.key] : []}
                    onChange={(v) => setForm({ ...form, [f.key]: v })}
                    mode="multiple"
                    accept={f.accept || "image"}
                    testid={`${testidPrefix}-field-${f.key}`}
                  />
                </div>
              ) : f.type === "list" ? (
                <Textarea
                  rows={f.rows || 4}
                  value={Array.isArray(form[f.key]) ? form[f.key].join("\n") : (form[f.key] || "")}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
                  className="mt-1.5 font-mono text-xs"
                  placeholder={f.placeholder || "Paste one URL per line"}
                  data-testid={`${testidPrefix}-field-${f.key}`}
                />
              ) : (
                <Input
                  value={form[f.key] || ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="mt-1.5"
                  placeholder={f.placeholder}
                  data-testid={`${testidPrefix}-field-${f.key}`}
                />
              )}
            </div>
          ))}

          {resource === "blogs" && (
            <div className="border-t pt-4 mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="send-email-notif"
                  checked={sendNotification}
                  onCheckedChange={setSendNotification}
                  data-testid="send-email-notification-switch"
                />
                <Label htmlFor="send-email-notif" className="text-xs uppercase tracking-widest cursor-pointer select-none">Send Email Notification to Customers</Label>
              </div>

              {sendNotification && (
                <div className="space-y-3 pl-2 border-l border-primary/30">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Recipients</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="recipient-mode"
                          checked={recipientMode === "all"}
                          onChange={() => setRecipientMode("all")}
                          className="text-primary focus:ring-primary"
                        />
                        All Customers ({leads.length})
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="recipient-mode"
                          checked={recipientMode === "selected"}
                          onChange={() => setRecipientMode("selected")}
                          className="text-primary focus:ring-primary"
                        />
                        Selected Customers
                      </label>
                    </div>
                  </div>

                  {recipientMode === "selected" && (
                    <div className="mt-2 max-h-48 overflow-y-auto border rounded p-3 space-y-2 bg-secondary/15">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Select Customer Contacts</Label>
                      {leads.map((l) => (
                        <div key={l.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`lead-${l.id}`}
                            checked={selectedEmails.includes(l.email)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmails([...selectedEmails, l.email]);
                              } else {
                                setSelectedEmails(selectedEmails.filter((x) => x !== l.email));
                              }
                            }}
                            className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                          />
                          <label htmlFor={`lead-${l.id}`} className="text-xs cursor-pointer select-none">
                            {l.name} <span className="text-muted-foreground">({l.email})</span>
                          </label>
                        </div>
                      ))}
                      {leads.length === 0 && (
                        <div className="text-xs text-muted-foreground py-2 text-center">No leads with email found.</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} data-testid={`${testidPrefix}-save`}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
