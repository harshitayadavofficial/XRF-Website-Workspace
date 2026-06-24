import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, X, ArrowRight } from "lucide-react";

/**
 * Reusable announcement bar.
 * config = { enabled: bool, interval: number(seconds), items: [{ text, link?, link_label?, badge? }] }
 * variant: "top" (slim, full-width banner) | "section" (card-style strip with eyebrow)
 */
export default function AnnouncementBar({ config, variant = "top", testid = "announcement-bar" }) {
  const items = useMemo(
    () => (config?.items || []).filter((x) => x && (typeof x === "string" ? x.trim() : (x.text || "").trim())),
    [config]
  );
  const [idx, setIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => { setIdx(0); }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = Math.max(2, Number(config?.interval) || 6) * 1000;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), interval);
    return () => clearInterval(t);
  }, [items.length, config?.interval]);

  if (!config?.enabled || items.length === 0 || dismissed) return null;

  const current = typeof items[idx] === "string" ? { text: items[idx] } : items[idx] || {};

  if (variant === "top") {
    return (
      <div
        className="relative z-50 border-b bg-secondary text-foreground"
        data-testid={testid}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 lg:px-8">
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="flex min-w-0 items-center gap-2 overflow-hidden text-center text-xs">
            {current.badge && (
              <span className="hidden rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary sm:inline">
                {current.badge}
              </span>
            )}
            <span key={idx} className="animate-[fadeIn_0.4s_ease-in] truncate" data-testid={`${testid}-text`}>
              {current.text}
            </span>
            {current.link && (
              <Link
                to={current.link}
                className="ml-1 inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary hover:underline"
                data-testid={`${testid}-link`}
              >
                {current.link_label || "Learn more"} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          {items.length > 1 && (
            <div className="hidden items-center gap-1 sm:flex" aria-label="slide indicators">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Show announcement ${i + 1}`}
                  className={`h-1 rounded-full transition-all ${i === idx ? "w-4 bg-primary" : "w-1 bg-foreground/20 hover:bg-foreground/50"}`}
                />
              ))}
            </div>
          )}
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-1 text-foreground/50 transition-colors hover:bg-foreground/10 hover:text-foreground"
            data-testid={`${testid}-dismiss`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // section variant — inline strip on the homepage
  return (
    <section className="border-y bg-secondary/30" data-testid={testid}>
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-5 lg:flex-row lg:items-center lg:px-8">
        <div className="flex items-start gap-3">
          <div className="rounded-md border bg-primary/10 p-2 text-primary"><Megaphone className="h-4 w-4" /></div>
          <div>
            {current.badge && (
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{current.badge}</div>
            )}
            <div key={idx} className="animate-[fadeIn_0.4s_ease-in] text-sm font-medium" data-testid={`${testid}-text`}>
              {current.text}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {items.length > 1 && (
            <div className="flex items-center gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`}
                />
              ))}
            </div>
          )}
          {current.link && (
            <Link
              to={current.link}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              data-testid={`${testid}-link`}
            >
              {current.link_label || "Learn more"} <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
