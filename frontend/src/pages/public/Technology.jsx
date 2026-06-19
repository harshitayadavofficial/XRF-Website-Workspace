import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { resolveAssetUrl } from "@/components/FileUpload";

const SECTIONS = [
  { title: "X-Ray Fluorescence (XRF)", body: "XRF uses primary X-rays to excite atoms within a sample. As atoms relax, they emit characteristic secondary X-rays whose energies identify each element and intensities reveal concentration — all without damaging the sample." },
  { title: "Gold Purity Testing", body: "Karat measurement combines XRF with intelligent calibration to determine the exact ratio of gold to alloying elements (silver, copper, nickel) in just seconds." },
  { title: "Coating & Thickness", body: "Multi-layer thickness gauging measures coatings (Au, Ni, Pd) on substrates in microns – essential for plating quality control." },
  { title: "Hallmarking Process", body: "BIS-aligned hallmarking workflow with XRF verification + laser marking ensures every piece carries traceable authenticity." },
];

export default function Technology() {
  const [blogs, setBlogs] = useState([]);
  useEffect(() => { api.get("/blogs").then((r) => setBlogs(r.data)); }, []);
  return (
    <div className="border-b" data-testid="technology-page">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Technology</div>
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight lg:text-5xl">The science behind every assay</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <Card key={s.title} className="border-border/60">
              <CardContent className="p-6">
                <div className="text-base font-medium">{s.title}</div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {blogs.length > 0 && (
          <div className="mt-14">
            <h3 className="font-display text-2xl font-medium tracking-tight">Deep dives & guides</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((b) => (
                <Card key={b.id} className="overflow-hidden border-border/60">
                  {b.image && <div className="aspect-video bg-secondary"><img src={resolveAssetUrl(b.image)} alt="" className="h-full w-full object-cover" /></div>}
                  <CardContent className="p-5">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{b.category}</div>
                    <div className="mt-1 text-base font-medium">{b.title}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{b.excerpt}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
