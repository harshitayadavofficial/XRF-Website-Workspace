import { usePublicSettings } from "@/context/SettingsContext";
import { resolveAssetUrl } from "@/components/FileUpload";
import { ShieldCheck, Compass, Sparkles } from "lucide-react";

export default function About() {
  const { settings } = usePublicSettings();
  const a = settings?.about || {};

  const title = a.title || "About ORNETOPS";
  const tagline = a.tagline || "Pioneering XRF & Gold Testing Technology";
  const story = a.story || "ORNETOPS is a leading developer and manufacturer of high-precision X-ray Fluorescence (XRF) spectrometers for precious metal analysis. Our systems are trusted by refiners, jewellers, hallmarking centers, and testing labs worldwide. We are dedicated to providing the highest standards of accuracy, reliability, and BIS compliance.";
  const mission = a.mission || "To deliver robust, BIS-compliant gold testing systems with unmatched accuracy and speed, fostering transparency and trust in the global jewelry and refining industries.";
  const vision = a.vision || "To be the global benchmark for gold and precious metal analysis technologies, continuously pushing the boundaries of precision and reliability.";
  const bannerImage = a.banner_image || "";

  return (
    <div className="border-b bg-background" data-testid="about-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b bg-secondary/20 py-20 lg:py-28">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />
        {bannerImage && (
          <img
            src={resolveAssetUrl(bannerImage)}
            alt="ORNETOPS Factory"
            className="absolute inset-0 h-full w-full object-cover opacity-35 dark:opacity-20"
          />
        )}
        <div className="relative z-20 mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary font-bold">Who We Are</div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            {tagline}
          </p>
        </div>
      </div>

      {/* Story & Image Section */}
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">Our Story</h2>
            <div className="text-muted-foreground text-base leading-relaxed space-y-4 whitespace-pre-line">
              {story}
            </div>
          </div>
          
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-secondary shadow-lg">
            {bannerImage ? (
              <img
                src={resolveAssetUrl(bannerImage)}
                alt="ORNETOPS Lab"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/10 to-secondary/30 text-center">
                <span className="font-display text-2xl font-bold tracking-tight text-primary">ORNETOPS</span>
                <span className="text-xs text-muted-foreground mt-2 font-mono uppercase tracking-widest">Precision engineered instruments</span>
              </div>
            )}
            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Mission & Vision & Values Cards */}
      <div className="bg-secondary/15 border-t py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Mission */}
            <div className="rounded-xl border bg-card p-8 shadow-sm hover:border-primary/30 transition-all duration-300">
              <div className="rounded-lg border bg-secondary p-2.5 w-fit text-primary">
                <Compass className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-medium tracking-tight text-foreground">Our Mission</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {mission}
              </p>
            </div>

            {/* Card 2: Vision */}
            <div className="rounded-xl border bg-card p-8 shadow-sm hover:border-primary/30 transition-all duration-300">
              <div className="rounded-lg border bg-secondary p-2.5 w-fit text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-medium tracking-tight text-foreground">Our Vision</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {vision}
              </p>
            </div>

            {/* Card 3: Quality standards */}
            <div className="rounded-xl border bg-card p-8 shadow-sm hover:border-primary/30 transition-all duration-300 sm:col-span-2 lg:col-span-1">
              <div className="rounded-lg border bg-secondary p-2.5 w-fit text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-medium tracking-tight text-foreground">Accreditations</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Our spectrometers are built and calibrated according to ISO 9001 quality systems and are fully compliant with BIS (Bureau of Indian Standards) guidelines for hallmarking centers. We offer certified reference materials and training for NABL accreditation labs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
