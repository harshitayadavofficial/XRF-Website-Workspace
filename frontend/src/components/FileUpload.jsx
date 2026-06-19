import { useRef, useState } from "react";
import axios from "axios";
import { api, API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image as ImgIcon, Video as VideoIcon, File as FileIcon, Loader2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/** Convert relative /api/files/... URLs to absolute for <img>/<video>. */
export function resolveAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) return `${BACKEND_URL}${url}`;
  return url;
}

/**
 * Reusable uploader.
 * mode = "single": value is a string URL; onChange(string).
 * mode = "multiple": value is string[] (URLs); onChange(string[]).
 * accept = "image" | "video" | "any" — UI filter & MIME hint.
 */
export default function FileUpload({
  value,
  onChange,
  mode = "single",
  accept = "image",
  label,
  testid = "file-upload",
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pasteUrl, setPasteUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const acceptAttr = accept === "image"
    ? "image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
    : accept === "video"
    ? "video/mp4,video/quicktime,video/webm,video/x-m4v"
    : accept === "model"
    ? ".glb,.gltf,model/gltf-binary,model/gltf+json"
    : "*/*";

  const urls = mode === "multiple" ? (Array.isArray(value) ? value : []) : (value ? [value] : []);

  const setUrls = (next) => {
    if (mode === "multiple") onChange(next);
    else onChange(next[next.length - 1] || "");
  };

  const upload = async (files) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    setUploading(true); setProgress(0);
    try {
      const { data } = await axios.post(`${API}/uploads`, fd, {
        withCredentials: true,
        onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      const newUrls = data.map((d) => d.url);
      if (mode === "multiple") setUrls([...urls, ...newUrls]);
      else setUrls(newUrls.slice(-1));
      toast.success(`${newUrls.length} file${newUrls.length > 1 ? "s" : ""} uploaded`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false); setProgress(0);
    }
  };

  const addPasted = () => {
    if (!pasteUrl.trim()) return;
    if (mode === "multiple") setUrls([...urls, pasteUrl.trim()]);
    else setUrls([pasteUrl.trim()]);
    setPasteUrl("");
  };

  const remove = async (url) => {
    setUrls(urls.filter((u) => u !== url));
    // soft-delete on backend if it's our stored file
    if (url && url.startsWith("/api/files/")) {
      try { await api.delete("/uploads/" + url.replace("/api/files/", "")); } catch {}
    }
  };

  return (
    <div className="space-y-3" data-testid={testid}>
      {label && <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</div>}

      {/* Previews */}
      {urls.length > 0 && (
        <div className={`grid gap-2 ${mode === "multiple" ? "sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}>
          {urls.map((url, i) => <PreviewTile key={url + i} url={url} accept={accept} onRemove={() => remove(url)} />)}
        </div>
      )}

      {/* Drop zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
        className={`group flex cursor-pointer items-center justify-center gap-3 rounded-md border border-dashed bg-secondary/30 px-4 py-5 text-sm transition-colors hover:border-primary/50 hover:bg-secondary/60 ${dragOver ? "border-primary bg-primary/5" : ""}`}
        data-testid={`${testid}-dropzone`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptAttr}
          multiple={mode === "multiple"}
          onChange={(e) => { upload(e.target.files); e.target.value = ""; }}
          data-testid={`${testid}-input`}
        />
        {uploading ? (
          <div className="flex w-full flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-primary"><Loader2 className="h-4 w-4 animate-spin" /> Uploading… {progress}%</div>
            <Progress value={progress} className="w-full max-w-md" />
          </div>
        ) : (
          <>
            <div className="rounded-md border bg-card p-2 text-primary"><Upload className="h-4 w-4" /></div>
            <div className="text-left">
              <div className="font-medium">{mode === "multiple" ? "Drop files here or click to browse" : "Drop a file here or click to browse"}</div>
              <div className="text-xs text-muted-foreground">
                {accept === "image" && "JPG, PNG, WebP, GIF, SVG · up to 10MB"}
                {accept === "video" && "MP4, MOV, WebM · up to 100MB"}
                {accept === "model" && "GLB or GLTF · up to 25MB"}
                {accept === "any" && "Images, videos, 3D models"}
              </div>
            </div>
          </>
        )}
      </label>

      {/* Paste external URL */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="…or paste an external URL (YouTube, CDN, etc.)"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPasted())}
            className="h-9 pl-7"
            data-testid={`${testid}-paste`}
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addPasted} data-testid={`${testid}-paste-add`}>Add</Button>
      </div>
    </div>
  );
}

function PreviewTile({ url, accept, onRemove }) {
  const resolved = resolveAssetUrl(url);
  const isVideo = accept === "video" || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
  const isYouTube = /(?:youtu\.be|youtube\.com)/i.test(url);
  const isModel = /\.(glb|gltf)(\?|$)/i.test(url);

  return (
    <div className="group relative overflow-hidden rounded-md border bg-card">
      <div className="aspect-square bg-secondary">
        {isYouTube ? (
          <div className="flex h-full w-full items-center justify-center">
            <VideoIcon className="h-8 w-8 text-primary" />
          </div>
        ) : isVideo ? (
          <video src={resolved} className="h-full w-full object-cover" muted />
        ) : isModel ? (
          <div className="flex h-full w-full items-center justify-center"><FileIcon className="h-8 w-8 text-primary" /></div>
        ) : (
          <img src={resolved} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] text-white">
        <span className="truncate" title={url}>
          {url.startsWith("/api/files/") ? "uploaded" : (isYouTube ? "youtube" : "external")}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full bg-white/20 p-1 hover:bg-white/40"
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
