import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search } from "lucide-react";

export default function ProductsList() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [params, setParams] = useSearchParams();
  const cat = params.get("cat") || "all";
  const [q, setQ] = useState("");

  useEffect(() => {
    Promise.all([api.get("/products"), api.get("/categories")]).then(([p, c]) => {
      setItems(p.data); setCats(c.data);
    });
  }, []);

  const filtered = items.filter((p) => {
    if (cat !== "all" && p.category !== cat) return false;
    if (q && !(`${p.name} ${p.tagline} ${p.summary}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="border-b" data-testid="products-list-page">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Catalog</div>
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight lg:text-5xl">Products</h1>
          <p className="mt-2 text-sm text-muted-foreground">Explore the AurumTech portfolio of precision instruments.</p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Chip active={cat === "all"} onClick={() => setParams({})}>All</Chip>
            {cats.map((c) => (
              <Chip key={c.slug} active={cat === c.slug} onClick={() => setParams({ cat: c.slug })}>
                {c.name}
              </Chip>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="h-9 w-64 pl-8" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="products-search" />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link to={`/products/${p.slug}`} key={p.id} className="group" data-testid={`pcard-${p.slug}`}>
              <Card className="h-full overflow-hidden border-border/60 transition-all hover:border-primary/50 hover:-translate-y-1">
                <div className="aspect-[4/3] overflow-hidden bg-secondary">
                  <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <CardContent className="p-5">
                  <div className="text-[10px] uppercase tracking-widest text-primary">{p.category?.replace(/-/g, " ")}</div>
                  <div className="mt-1 text-lg font-medium tracking-tight">{p.name}</div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.tagline}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs text-primary group-hover:gap-2 transition-all">View details <ArrowRight className="h-3 w-3" /></div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">No products match your filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ children, active, ...p }) {
  return (
    <Button variant={active ? "default" : "outline"} size="sm" className="h-8 rounded-sm" {...p}>{children}</Button>
  );
}
