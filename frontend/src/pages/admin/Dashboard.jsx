import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell,
} from "recharts";
import {
  Briefcase, Calendar, FileText, LifeBuoy, Package, BookOpen, TrendingUp, CheckCircle2,
} from "lucide-react";

const STAT_CARDS = [
  { key: "total_leads", label: "Total Leads", icon: Briefcase, accent: "text-primary" },
  { key: "new_leads", label: "New Leads", icon: TrendingUp, accent: "text-blue-500" },
  { key: "won_leads", label: "Won Deals", icon: CheckCircle2, accent: "text-emerald-500" },
  { key: "demo_requests", label: "Demo Requests", icon: Calendar, accent: "text-amber-500" },
  { key: "quote_requests", label: "Quote Requests", icon: FileText, accent: "text-purple-500" },
  { key: "tickets_open", label: "Open Tickets", icon: LifeBuoy, accent: "text-rose-500" },
  { key: "products", label: "Products", icon: Package, accent: "text-foreground" },
  { key: "blogs", label: "Blog Posts", icon: BookOpen, accent: "text-foreground" },
];

const STATUS_COLORS = {
  new: "#3B82F6", contacted: "#F59E0B", qualified: "#8B5CF6",
  proposal_sent: "#06B6D4", negotiation: "#EAB308", won: "#10B981", lost: "#EF4444",
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/dashboard/stats").then((r) => setStats(r.data)); }, []);

  const statusData = stats
    ? Object.entries(stats.status_breakdown).map(([k, v]) => ({ name: k.replace(/_/g, " "), value: v, color: STATUS_COLORS[k] }))
    : [];

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Overview</div>
        <h1 className="mt-1 text-3xl font-medium tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live performance across leads, products, and support.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, accent }) => (
          <Card key={key} className="border-border/60" data-testid={`stat-${key}`}>
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
                <div className="mt-2 font-display text-3xl font-medium tabular-nums">
                  {stats?.[key] ?? "—"}
                </div>
              </div>
              <div className={`rounded-md border bg-secondary p-2 ${accent}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Leads · last 14 days</div>
                <div className="text-base font-medium">Daily lead volume</div>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest">Realtime</Badge>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.daily_leads || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pipeline</div>
              <div className="text-base font-medium">Leads by status</div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
