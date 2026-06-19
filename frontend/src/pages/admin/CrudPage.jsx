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

  const load = async () => {
    const { data } = await api.get(`/${resource}`);
    setItems(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [resource]);

  const remove = async (id) => {
    if (!window.confirm("Delete this item?")) return;
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
        <Button onClick={() => setEditing({})} className="rounded-sm" data-testid={`${testidPrefix}-new-btn`}>
          <Plus className="h-4 w-4 mr-1.5" /> New
        </Button>
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
                    <Button size="icon" variant="ghost" onClick={() => remove(it.id)} data-testid={`${testidPrefix}-delete-${it.id}`}><Trash2 className="h-4 w-4" /></Button>
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
    </div>
  );
}

function EditDialog({ item, fields, resource, onClose, onSaved, testidPrefix }) {
  const [form, setForm] = useState(item);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(item); }, [item]);

  const save = async () => {
    setSaving(true);
    try {
      if (item.id) await api.patch(`/${resource}/${item.id}`, form);
      else await api.post(`/${resource}`, form);
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
              ) : f.type === "switch" ? (
                <div className="mt-1.5"><Switch checked={!!form[f.key]} onCheckedChange={(v) => setForm({ ...form, [f.key]: v })} data-testid={`${testidPrefix}-field-${f.key}`} /></div>
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
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} data-testid={`${testidPrefix}-save`}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
