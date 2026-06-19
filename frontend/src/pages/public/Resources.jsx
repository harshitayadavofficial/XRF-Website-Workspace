import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Newspaper, FileText, Download } from "lucide-react";

export default function Resources() {
  const [blogs, setBlogs] = useState([]);
  const [cases, setCases] = useState([]);
  useEffect(() => {
    Promise.all([api.get("/blogs"), api.get("/case_studies")]).then(([b, c]) => {
      setBlogs(b.data); setCases(c.data);
    });
  }, []);
  return (
    <div className="border-b" data-testid="resources-page">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Resource Center</div>
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight lg:text-5xl">Learn, decide & build with confidence</h1>
        </div>
        <Tabs defaultValue="blog">
          <TabsList>
            <TabsTrigger value="blog"><Newspaper className="h-3.5 w-3.5 mr-1.5" /> Blog</TabsTrigger>
            <TabsTrigger value="case"><FileText className="h-3.5 w-3.5 mr-1.5" /> Case Studies</TabsTrigger>
            <TabsTrigger value="downloads"><Download className="h-3.5 w-3.5 mr-1.5" /> Downloads</TabsTrigger>
          </TabsList>
          <TabsContent value="blog">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((b) => <ContentCard key={b.id} {...b} />)}
              {blogs.length === 0 && <Empty />}
            </div>
          </TabsContent>
          <TabsContent value="case">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cases.map((c) => <ContentCard key={c.id} title={c.title} excerpt={c.challenge} image={c.image} category={c.industry} />)}
              {cases.length === 0 && <Empty />}
            </div>
          </TabsContent>
          <TabsContent value="downloads">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {["Aurum XRF Pro 9000 Brochure", "GoldScan X1 Datasheet", "BIS Hallmarking White Paper", "Calibration Standards Catalogue"].map((d) => (
                <Card key={d} className="border-border/60"><CardContent className="p-5 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">PDF · 2.4 MB</div>
                    <div className="mt-1 text-sm font-medium">{d}</div>
                  </div>
                  <Download className="h-5 w-5 text-primary" />
                </CardContent></Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ContentCard({ title, excerpt, image, category }) {
  return (
    <Card className="overflow-hidden border-border/60">
      {image && <div className="aspect-video bg-secondary"><img src={image} alt="" className="h-full w-full object-cover" /></div>}
      <CardContent className="p-5">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{category}</div>
        <div className="mt-1 text-base font-medium">{title}</div>
        <p className="mt-2 text-sm text-muted-foreground">{excerpt}</p>
      </CardContent>
    </Card>
  );
}

function Empty() {
  return <div className="col-span-full rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">No items yet</div>;
}
