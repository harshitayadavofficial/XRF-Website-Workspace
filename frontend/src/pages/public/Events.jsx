import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, ArrowUpRight, PlayCircle, X, ChevronLeft, ChevronRight } from "lucide-react";

function getYouTubeId(url = "") {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return m ? m[1] : null;
}

function MediaThumb({ url, onClick }) {
  const yt = getYouTubeId(url);
  if (yt) {
    return (
      <button onClick={onClick} className="group relative aspect-video w-full overflow-hidden rounded-md border bg-secondary" data-testid={`video-thumb-${yt}`}>
        <img src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <PlayCircle className="h-10 w-10 text-white drop-shadow" />
        </div>
      </button>
    );
  }
  return (
    <button onClick={onClick} className="group relative aspect-video w-full overflow-hidden rounded-md border bg-secondary">
      <video src={url} className="h-full w-full object-cover" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <PlayCircle className="h-10 w-10 text-white" />
      </div>
    </button>
  );
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(null); // { type:'image'|'video', url }
  const [lightboxIdx, setLightboxIdx] = useState(0);

  useEffect(() => {
    api.get("/events").then((r) => setEvents(r.data || []));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => (e.published !== false) && (!e.date || e.date >= today));
  const past = events.filter((e) => (e.published !== false) && e.date && e.date < today);

  const render = (list) => list.length === 0 ? (
    <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">No events here yet.</div>
  ) : (
    <div className="grid gap-5 lg:grid-cols-2">
      {list.map((e) => <EventCard key={e.id} ev={e} onOpenImage={(idx) => { setOpen({ type: "images", ev: e }); setLightboxIdx(idx); }} onOpenVideo={(url) => setOpen({ type: "video", url })} />)}
    </div>
  );

  return (
    <div className="border-b" data-testid="events-page">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Events</div>
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight lg:text-5xl">Exhibitions, launches & training</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Meet our application engineers in person or join a live virtual session.</p>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">{render(upcoming)}</TabsContent>
          <TabsContent value="past">{render(past)}</TabsContent>
        </Tabs>
      </div>

      {open?.type === "video" && (
        <Dialog open onOpenChange={() => setOpen(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Watch</DialogTitle></DialogHeader>
            {getYouTubeId(open.url) ? (
              <iframe className="aspect-video w-full rounded-md" src={`https://www.youtube.com/embed/${getYouTubeId(open.url)}?autoplay=1`} title="video" allow="autoplay; encrypted-media" allowFullScreen />
            ) : (
              <video src={open.url} controls autoPlay className="aspect-video w-full rounded-md bg-black" />
            )}
          </DialogContent>
        </Dialog>
      )}

      {open?.type === "images" && (
        <ImageLightbox event={open.ev} index={lightboxIdx} setIndex={setLightboxIdx} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

function EventCard({ ev, onOpenImage, onOpenVideo }) {
  const images = [ev.image, ...(Array.isArray(ev.images) ? ev.images : [])].filter(Boolean);
  const videos = Array.isArray(ev.videos) ? ev.videos.filter(Boolean) : [];
  return (
    <Card className="overflow-hidden border-border/60 hover:border-primary/40 transition-colors" data-testid={`event-${ev.id}`}>
      {images[0] && (
        <button onClick={() => onOpenImage(0)} className="block aspect-[16/9] w-full overflow-hidden bg-secondary">
          <img src={images[0]} alt={ev.title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
        </button>
      )}
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          {ev.type && <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-primary">{ev.type}</Badge>}
          {ev.date && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> {ev.date}{ev.end_date ? ` → ${ev.end_date}` : ""}</span>}
          {ev.location && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {ev.location}</span>}
        </div>
        <div className="mt-3 text-lg font-medium tracking-tight">{ev.title}</div>
        {ev.description && <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{ev.description}</p>}

        {(images.length > 1 || videos.length > 0) && (
          <div className="mt-5 grid grid-cols-3 gap-2">
            {images.slice(1, 4).map((src, i) => (
              <button key={i} onClick={() => onOpenImage(i + 1)} className="aspect-square overflow-hidden rounded-md border bg-secondary">
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            {videos.slice(0, 3 - Math.max(0, images.length - 1)).map((v, i) => (
              <MediaThumb key={`v${i}`} url={v} onClick={() => onOpenVideo(v)} />
            ))}
          </div>
        )}

        {ev.register_url && (
          <Button asChild className="mt-5 rounded-sm" data-testid={`event-register-${ev.id}`}>
            <a href={ev.register_url} target="_blank" rel="noreferrer">Register / Details <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ImageLightbox({ event, index, setIndex, onClose }) {
  const images = [event.image, ...(Array.isArray(event.images) ? event.images : [])].filter(Boolean);
  const safeIdx = Math.max(0, Math.min(images.length - 1, index));
  if (images.length === 0) { onClose(); return null; }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <button className="absolute right-4 top-4 rounded-full border bg-background/80 p-2" onClick={onClose} data-testid="lightbox-close"><X className="h-4 w-4" /></button>
      <button className="absolute left-4 rounded-full border bg-background/80 p-2 disabled:opacity-30" disabled={safeIdx === 0} onClick={(e) => { e.stopPropagation(); setIndex(safeIdx - 1); }}><ChevronLeft className="h-5 w-5" /></button>
      <img src={images[safeIdx]} alt="" className="max-h-[85vh] max-w-[90vw] rounded-md object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
      <button className="absolute right-4 rounded-full border bg-background/80 p-2 disabled:opacity-30" disabled={safeIdx === images.length - 1} onClick={(e) => { e.stopPropagation(); setIndex(safeIdx + 1); }}><ChevronRight className="h-5 w-5" /></button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border bg-background/80 px-3 py-1 text-xs">{safeIdx + 1} / {images.length}</div>
    </div>
  );
}
