import { useEffect, useState } from "react";
import { usePublicSettings } from "@/context/SettingsContext";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ThreeViewer from "@/components/ThreeViewer";
import { resolveAssetUrl } from "@/components/FileUpload";
import { ArrowRight, Check, Download, MessageCircleMore } from "lucide-react";
import InquiryForm from "@/pages/public/InquiryForm";

export default function ProductDetail() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [related, setRelated] = useState([]);
  const { dataVersion } = usePublicSettings();
  
  const images = p ? (Array.isArray(p.images) ? p.images : (p.image ? [p.image] : [])) : [];
  const [selectedMedia, setSelectedMedia] = useState(null);

  useEffect(() => {
    if (p) {
      const imgs = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []);
      if (p.model_3d) {
        setSelectedMedia({ type: "3d", src: p.model_3d });
      } else if (imgs.length > 0) {
        setSelectedMedia({ type: "image", src: imgs[0] });
      } else {
        setSelectedMedia(null);
      }
    }
  }, [p]);

  useEffect(() => {
    api.get("/products").then(({ data }) => {
      const item = data.find((x) => x.slug === slug);
      setP(item);
      setRelated(data.filter((x) => x.category === item?.category && x.slug !== slug).slice(0, 3));
    });
  }, [slug, dataVersion]);

  if (!p) return <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div data-testid="product-detail-page">
      <section className="border-b">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-16">
          <div>
            {selectedMedia?.type === "3d" ? (
              <ThreeViewer src={resolveAssetUrl(selectedMedia.src)} height={480} />
            ) : selectedMedia?.type === "image" ? (
              <div className="aspect-[4/3] w-full overflow-hidden rounded-md border bg-muted flex items-center justify-center relative shadow-sm h-[480px]">
                <img
                  src={resolveAssetUrl(selectedMedia.src)}
                  alt={p.name}
                  className="h-full w-full object-cover transition-all duration-300"
                />
              </div>
            ) : (
              <div className="aspect-[4/3] w-full overflow-hidden rounded-md border bg-muted flex items-center justify-center h-[480px] text-muted-foreground text-sm">
                No media preview available
              </div>
            )}

            {/* Thumbnail Gallery */}
            {(p.model_3d || images.length > 1 || (images.length === 1 && p.model_3d)) && (
              <div className="mt-4 flex flex-wrap gap-2.5">
                {p.model_3d && (
                  <button
                    onClick={() => setSelectedMedia({ type: "3d", src: p.model_3d })}
                    className={`h-16 w-16 overflow-hidden rounded-md border bg-secondary flex flex-col items-center justify-center transition-all ${
                      selectedMedia?.type === "3d" ? "border-primary ring-2 ring-primary/20 opacity-100" : "border-border/60 opacity-60 hover:opacity-100"
                    }`}
                    title="View 3D Model"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary font-admin">3D</span>
                  </button>
                )}
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedMedia({ type: "image", src: imgUrl })}
                    className={`h-16 w-16 overflow-hidden rounded-md border bg-secondary transition-all ${
                      selectedMedia?.type === "image" && selectedMedia?.src === imgUrl
                        ? "border-primary ring-2 ring-primary/20 opacity-100"
                        : "border-border/60 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={resolveAssetUrl(imgUrl)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] uppercase tracking-[0.2em] text-primary">
              {p.category?.replace(/-/g, " ")}
            </Badge>
            <h1 className="mt-4 font-display text-4xl font-medium tracking-tight lg:text-5xl text-balance">{p.name}</h1>
            <p className="mt-2 text-base text-muted-foreground">{p.tagline}</p>
            <p className="mt-4 text-sm leading-relaxed">{p.summary}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild className="rounded-sm" data-testid="pd-quote-btn"><Link to={`/request-quote?product=${p.slug}`}>Request Quote</Link></Button>
              <Button asChild variant="outline" className="rounded-sm" data-testid="pd-demo-btn"><Link to={`/request-demo?product=${p.slug}`}>Book Demo</Link></Button>
              {p.brochure_url && (
                <Button asChild variant="ghost" className="rounded-sm" data-testid="pd-brochure-btn">
                  <a href={resolveAssetUrl(p.brochure_url)} target="_blank" rel="noreferrer" download>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Download Brochure
                  </a>
                </Button>
              )}
            </div>

            {p.features?.length > 0 && (
              <div className="mt-8 grid gap-1.5 sm:grid-cols-2">
                {p.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> {f}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <Tabs defaultValue="specs">
            <TabsList>
              <TabsTrigger value="specs">Specifications</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="inquiry">Inquiry</TabsTrigger>
            </TabsList>
            <TabsContent value="specs">
              <Card><CardContent className="p-6">
                {(p.specs || []).length === 0 && <div className="text-sm text-muted-foreground">No specs added yet.</div>}
                <div className="grid divide-y">
                  {(p.specs || []).map((s, i) => (
                    <div key={i} className="grid grid-cols-2 py-3 text-sm">
                      <div className="text-muted-foreground">{s.k}</div>
                      <div className="font-medium">{s.v}</div>
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="applications">
              <Card><CardContent className="p-6 grid gap-2 sm:grid-cols-2">
                {["Jewellery retail", "Hallmarking centers", "Refineries", "Banks & loan gold valuation", "Bullion trading", "Research labs"].map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm"><Check className="h-3.5 w-3.5 text-primary" /> {a}</div>
                ))}
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="inquiry">
              <Card><CardContent className="p-6"><InquiryForm productInterest={p.name} source="product_inquiry" /></CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-b bg-secondary/20">
          <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
            <h3 className="font-display text-2xl font-medium tracking-tight">Related products</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link to={`/products/${r.slug}`} key={r.id} className="group">
                  <Card className="overflow-hidden border-border/60 hover:border-primary/50 transition-all">
                    <div className="aspect-[4/3] bg-secondary"><img src={resolveAssetUrl(r.image)} alt="" className="h-full w-full object-cover" /></div>
                    <CardContent className="p-5">
                      <div className="text-lg font-medium">{r.name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{r.tagline}</div>
                      <div className="mt-3 text-xs text-primary inline-flex items-center gap-1">View details <ArrowRight className="h-3 w-3" /></div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
