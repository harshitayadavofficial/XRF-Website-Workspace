import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

const ROLES = [
  "super_admin", "admin", "sales_manager", "sales_executive",
  "service_manager", "service_executive", "content_manager", "dealer_manager",
];

export default function Users() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { user } = useAuth();

  const load = async () => {
    const { data } = await api.get("/users");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  return (
    <div className="space-y-6" data-testid="users-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">System</div>
          <h1 className="text-3xl font-medium tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">{items.length} users · RBAC-enabled</p>
        </div>
        <Button onClick={() => setEditing({})} className="rounded-sm" data-testid="new-user-btn">
          <Plus className="h-4 w-4 mr-1.5" /> Invite User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((u) => (
                <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><span className="rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">{u.role?.replace(/_/g, " ")}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.created_at?.slice(0, 10)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(u)} data-testid={`edit-user-${u.id}`}><Pencil className="h-4 w-4" /></Button>
                    {user.role === "super_admin" && u.id !== user.id && (
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(u.id)} data-testid={`delete-user-${u.id}`}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && <UserDialog item={editing} onClose={() => setEditing(null)} onSaved={load} />}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await remove(deleteId);
            setDeleteId(null);
          }
        }}
        title="Delete this user?"
        description="Are you sure you want to permanently delete this user account? Their access to the administration panel will be immediately revoked."
      />
    </div>
  );
}

function UserDialog({ item, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", role: "sales_executive", password: "", phone: "", ...item });

  const save = async () => {
    try {
      if (item.id) {
        const upd = { name: form.name, role: form.role, phone: form.phone };
        if (form.password) upd.password = form.password;
        await api.patch(`/users/${item.id}`, upd);
      } else {
        if (!form.email || !form.name || !form.password) return toast.error("Name, email, password required");
        await api.post("/users", { name: form.name, email: form.email, role: form.role, password: form.password, phone: form.phone });
      }
      toast.success("Saved");
      onSaved(); onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item.id ? "Edit user" : "Invite user"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs uppercase tracking-widest">Name</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" data-testid="user-name" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Email {item.id && <span className="text-muted-foreground">(immutable)</span>}</Label>
            <Input value={form.email || ""} disabled={!!item.id} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" data-testid="user-email" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Phone</Label>
            <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" data-testid="user-phone" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger className="mt-1.5" data-testid="user-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">{item.id ? "New Password (optional)" : "Password *"}</Label>
            <Input type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5" data-testid="user-password" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} data-testid="user-save">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
