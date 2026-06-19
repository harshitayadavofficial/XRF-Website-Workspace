import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Audit() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/audit-logs?limit=200").then((r) => setItems(r.data)); }, []);

  return (
    <div className="space-y-6" data-testid="audit-page">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">System</div>
        <h1 className="text-3xl font-medium tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Activity feed across all modules · {items.length} events</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((l) => (
                <TableRow key={l.id} data-testid={`audit-row-${l.id}`}>
                  <TableCell className="text-xs">{l.created_at?.slice(0, 19).replace("T", " ")}</TableCell>
                  <TableCell className="text-sm">{l.user_email}</TableCell>
                  <TableCell className="text-xs uppercase tracking-widest text-primary">{l.role?.replace(/_/g, " ")}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] uppercase tracking-widest">{l.action}</Badge></TableCell>
                  <TableCell className="text-sm">{l.module}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{l.entity_id?.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.ip || "—"}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">No events yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
