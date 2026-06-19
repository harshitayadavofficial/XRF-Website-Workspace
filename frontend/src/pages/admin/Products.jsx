import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import FileUpload from "@/components/FileUpload";

const EMPTY = {
  name: "", slug: "", category: "", tagline: "", summary: "", image: "",
  model_3d: "", price_from: 0, currency: "INR", featured: false, published: true,
  features: [], specs: [],
};

export default function Products() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([api.get("/products"), api.get("/categories")]);
    setItems(p); setCats(c);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await api.delete(`/products/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6" data-testid="products-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Catalog</div>
          <h1 className="text-3xl font-medium tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">{items.length} products · 3D model uploads supported</p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })} className="rounded-sm" data-testid="new-product-btn">
          <Plus className="h-4 w-4 mr-1.5" /> New Product
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tagline</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} data-testid={`product-row-${p.id}`}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><span className="rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-widest">{p.category}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.tagline}</TableCell>
                  <TableCell>{p.featured ? "★" : "—"}</TableCell>
                  <TableCell>{p.published ? "Live" : "Draft"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(p)} data-testid={`edit-product-${p.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)} data-testid={`delete-product-${p.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No products yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductEditDialog item={editing} cats={cats} onClose={() => setEditing(null)} onSaved={load} />
    </div>
  );
}

function ProductEditDialog({ item, cats, onClose, onSaved }) {
  const [form, setForm] = useState(item || EMPTY);
  useEffect(() => { setForm(item || EMPTY); }, [item]);
  if (!item) return null;

  const save = async () => {
    if (!form.name || !form.slug) return toast.error("Name and slug required");
    try {
      if (item.id) await api.patch(`/products/${item.id}`, form);
      else await api.post("/products", form);
      toast.success("Saved");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    }
  };

  const setF = (k, v) => setForm({ ...form, [k]: v });

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader><DialogTitle>{item?.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Name *" value={form.name} onChange={(v) => setF("name", v)} testid="pe-name" />
          <TextField label="Slug *" value={form.slug} onChange={(v) => setF("slug", v)} testid="pe-slug" />
          <div>
            <Label className="text-xs uppercase tracking-widest">Category</Label>
            <Select value={form.category || ""} onValueChange={(v) => setF("category", v)}>
              <SelectTrigger className="mt-1.5" data-testid="pe-category"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <TextField label="Tagline" value={form.tagline} onChange={(v) => setF("tagline", v)} testid="pe-tagline" />
          <div className="sm:col-span-2">
            <Label className="text-xs uppercase tracking-widest">Product Image</Label>
            <div className="mt-1.5">
              <FileUpload value={form.image || ""} onChange={(v) => setF("image", v)} mode="single" accept="image" testid="pe-image" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs uppercase tracking-widest">3D Model (.glb / .gltf) — optional</Label>
            <div className="mt-1.5">
              <FileUpload value={form.model_3d || ""} onChange={(v) => setF("model_3d", v)} mode="single" accept="model" testid="pe-3d" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs uppercase tracking-widest">Summary</Label>
            <Textarea className="mt-1.5" value={form.summary} onChange={(e) => setF("summary", e.target.value)} data-testid="pe-summary" />
          </div>
          <div className="flex items-center gap-2"><Switch checked={!!form.featured} onCheckedChange={(v) => setF("featured", v)} data-testid="pe-featured" /> <span className="text-sm">Featured</span></div>
          <div className="flex items-center gap-2"><Switch checked={form.published !== false} onCheckedChange={(v) => setF("published", v)} data-testid="pe-published" /> <span className="text-sm">Published</span></div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest">Key features (one per line)</Label>
          <Textarea
            rows={4}
            value={(form.features || []).join("\n")}
            onChange={(e) => setF("features", e.target.value.split("\n").filter(Boolean))}
            data-testid="pe-features"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest">Technical specs (one per line, key: value)</Label>
          <Textarea
            rows={5}
            value={(form.specs || []).map((s) => `${s.k}: ${s.v}`).join("\n")}
            onChange={(e) =>
              setF("specs", e.target.value.split("\n").filter(Boolean).map((line) => {
                const [k, ...rest] = line.split(":");
                return { k: k.trim(), v: rest.join(":").trim() };
              }))
            }
            data-testid="pe-specs"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} data-testid="pe-cancel">Cancel</Button>
          <Button onClick={save} data-testid="pe-save">Save product</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TextField({ label, value, onChange, testid }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest">{label}</Label>
      <Input className="mt-1.5" value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={testid} />
    </div>
  );
}
