import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadFile } from "@/lib/api";

export default function ExportButton({ resource }) {
  const displayNames = {
    leads: "leads",
    "demo-requests": "demo_requests",
    "quote-requests": "quote_requests",
    tickets: "tickets",
    "audit-logs": "audit_logs"
  };
  const name = displayNames[resource] || resource;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 rounded-sm flex items-center gap-1.5" data-testid={`export-btn-${resource}`}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 bg-card border rounded-sm shadow-md p-1">
        <DropdownMenuItem 
          onClick={() => downloadFile(`/export/${resource}?format=csv`, `${name}_export.csv`)}
          className="cursor-pointer hover:bg-secondary text-sm px-3 py-2 rounded-sm"
        >
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => downloadFile(`/export/${resource}?format=xlsx`, `${name}_export.xlsx`)}
          className="cursor-pointer hover:bg-secondary text-sm px-3 py-2 rounded-sm"
        >
          Export Excel
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => downloadFile(`/export/${resource}?format=pdf`, `${name}_export.pdf`)}
          className="cursor-pointer hover:bg-secondary text-sm px-3 py-2 rounded-sm"
        >
          Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
