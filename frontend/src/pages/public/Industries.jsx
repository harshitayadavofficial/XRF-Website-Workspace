import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const INDUSTRIES = [
  { slug: "jewellery", name: "Jewellery Stores", desc: "Karat-accurate XRF for daily store operations and POS integrations.", img: "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd" },
  { slug: "hallmarking", name: "Hallmarking Centers", desc: "BIS-compliant XRF + laser marking workflows.", img: "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd" },
  { slug: "refineries", name: "Refineries", desc: "High-throughput precious metal analysis & induction furnaces.", img: "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd" },
  { slug: "banks", name: "Banks · Gold Loan", desc: "Trusted, audit-ready karat verification for gold loans.", img: "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd" },
  { slug: "bullion", name: "Bullion Traders", desc: "Tamper-proof assays for every transaction.", img: "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd" },
  { slug: "pawn", name: "Pawn Shops", desc: "Affordable, portable testing for daily valuations.", img: "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd" },
  { slug: "labs", name: "Research Laboratories", desc: "Lab-grade XRF with multi-element capability.", img: "https://images.unsplash.com/photo-1742137587486-fdef8cdd25bd" },
];

export default function Industries() {
  return (
    <div className="border-b" data-testid="industries-page">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Industries</div>
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight lg:text-5xl">Built for every link in the precious metals chain</h1>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((ind) => (
            <Card key={ind.slug} className="overflow-hidden border-border/60 hover:border-primary/50 transition-all">
              <div className="aspect-[4/3] bg-secondary"><img src={ind.img} alt={ind.name} className="h-full w-full object-cover" /></div>
              <CardContent className="p-5">
                <div className="text-base font-medium">{ind.name}</div>
                <p className="mt-1 text-sm text-muted-foreground">{ind.desc}</p>
                <Button asChild variant="ghost" size="sm" className="mt-3 px-0 text-primary"><Link to="/contact">Talk to expert <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
