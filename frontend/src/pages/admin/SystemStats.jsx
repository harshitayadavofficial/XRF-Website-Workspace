import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Cpu, HardDrive, ShieldAlert, Layers, RefreshCw, Clock, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function SystemStats() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/system/stats");
      setStats(data);
      setHistory(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cpu: data.cpu.percent,
          memory: data.memory.percent
        };
        const next = [...prev, newPoint];
        if (next.length > 20) next.shift(); // keep last 20
        return next;
      });
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch system statistics. Please verify backend connection and permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(fetchStats, 5000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh]);

  if (error) {
    return (
      <div className="space-y-6" data-testid="system-stats-error-page">
        <h1 className="text-3xl font-medium tracking-tight">System Statistics</h1>
        <Card className="border-destructive/30 bg-destructive/5 text-destructive p-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading system metrics...
      </div>
    );
  }

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatUptime = (seconds) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  return (
    <div className="space-y-6" data-testid="system-stats-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Console</div>
          <h1 className="text-3xl font-medium tracking-tight">System Statistics</h1>
          <p className="text-sm text-muted-foreground">Real-time health monitoring of local server resource usage</p>
        </div>
        <div className="flex items-center gap-4 rounded-md border bg-card px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-xs cursor-pointer select-none uppercase tracking-wider text-muted-foreground">Auto-refresh (5s)</Label>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            title="Refresh now"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Memory Usage */}
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Memory Usage</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-semibold tracking-tight">{stats.memory.percent}%</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}
              </p>
            </div>
            <div className="relative w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                style={{ width: `${stats.memory.percent}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground">
              Available: <span className="font-semibold">{formatBytes(stats.memory.available)}</span>
            </div>
          </CardContent>
        </Card>

        {/* CPU Load */}
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CPU Load</CardTitle>
            <Cpu className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-semibold tracking-tight">{stats.cpu.percent}%</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Logical: {stats.cpu.count_logical} cores | Physical: {stats.cpu.count_physical} cores
              </p>
            </div>
            <div className="relative w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                style={{ width: `${stats.cpu.percent}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground">
              Core Threading: Active
            </div>
          </CardContent>
        </Card>

        {/* Disk Allocation */}
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Disk Allocation</CardTitle>
            <HardDrive className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-semibold tracking-tight">{stats.disk.percent}%</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
              </p>
            </div>
            <div className="relative w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                style={{ width: `${stats.disk.percent}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground">
              Free: <span className="font-semibold">{formatBytes(stats.disk.free)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Python Process Uptime & Memory */}
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Python Runtime</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-semibold tracking-tight">{formatUptime(stats.process.uptime)}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Process RSS Memory: {formatBytes(stats.process.memory)}
              </p>
            </div>
            <div className="text-[10px] text-muted-foreground pt-6">
              Python Version: <span className="font-mono">{stats.os.python_version}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Utilization Graph */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Resource Utilization</CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#888888' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#888888' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ padding: 0 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  name="CPU %" 
                  stroke="#eab308" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  name="Memory %" 
                  stroke="#18181b" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* OS & Host Details */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">OS / Platform Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-sm font-medium">
          <div className="rounded-md border p-3.5 bg-card/45">
            <div className="text-xs text-muted-foreground font-normal">Operating System</div>
            <div className="mt-1 text-foreground">{stats.os.system}</div>
          </div>
          <div className="rounded-md border p-3.5 bg-card/45">
            <div className="text-xs text-muted-foreground font-normal">OS Release</div>
            <div className="mt-1 text-foreground">{stats.os.release}</div>
          </div>
          <div className="rounded-md border p-3.5 bg-card/45">
            <div className="text-xs text-muted-foreground font-normal">OS Version</div>
            <div className="mt-1 text-foreground truncate" title={stats.os.version}>{stats.os.version}</div>
          </div>
          <div className="rounded-md border p-3.5 bg-card/45">
            <div className="text-xs text-muted-foreground font-normal">Active Threads</div>
            <div className="mt-1 text-foreground">Operational</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
