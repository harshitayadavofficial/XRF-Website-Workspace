import { useEffect, useState } from "react";
import { api, downloadFile } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import ExportButton from "@/components/admin/ExportButton";

const formatBrowserTime = (utcString) => {
  if (!utcString) return "—";
  const isoStr = utcString.endsWith("Z") || utcString.includes("+") ? utcString : utcString + "Z";
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return utcString.slice(0, 19).replace("T", " ");
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  } catch (err) {
    return utcString.slice(0, 19).replace("T", " ");
  }
};

export default function Audit() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/audit-logs?limit=200").then((r) => setItems(r.data)); }, []);

  return (
    <div className="space-y-6" data-testid="audit-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">System</div>
          <h1 className="text-3xl font-medium tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Activity feed across all modules · {items.length} events</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-9 rounded-sm flex items-center gap-1.5" onClick={() => downloadFile('/system/logs/download', 'system_logs.txt')}>
            <FileText className="h-4 w-4" /> Download Logs
          </Button>
          <Button variant="outline" className="h-9 rounded-sm flex items-center gap-1.5" onClick={() => downloadFile('/system/logs/download?archive=true', 'system_logs_archive.zip')}>
            <FileText className="h-4 w-4" /> Download Log Archive (ZIP)
          </Button>
          <ExportButton resource="audit-logs" />
        </div>
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
                  <TableCell className="text-xs">{formatBrowserTime(l.created_at)}</TableCell>
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
