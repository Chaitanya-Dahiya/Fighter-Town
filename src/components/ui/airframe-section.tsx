/**
 * A parallax band for one airframe.
 *
 * Layers are declared back-to-front with a depth in pixels: the sky moves
 * furthest, the instrument panel barely at all, and the canopy frame not at
 * all — which is what makes the section read as the nose pitching down rather
 * than as images sliding past each other.
 *
 * This is a server component. All of the motion is CSS scroll-driven
 * animation, so nothing here needs to ship JavaScript to the client.
 */

import Image from "next/image";
import { cn } from "@/lib/utils";

export type ParallaxLayer = {
  src: string;
  alt?: string;
  /**
   * Pixels the layer travels across the section's full scroll range. Positive
   * moves against the scroll (further away), negative moves with it. Zero
   * pins the layer — use it for the canopy frame the viewer sits behind.
   */
  depth: number;
  /** Scale up slightly to keep a drifting layer from exposing its edges. */
  scale?: number;
  className?: string;
  priority?: boolean;
};

export type AirframeSectionProps = {
  airframe: "f22" | "f16" | "rafale";
  eyebrow: string;
  headline: string;
  body: string;
  layers: ParallaxLayer[];
  children?: React.ReactNode;
  className?: string;
};

export function AirframeSection({
  airframe,
  eyebrow,
  headline,
  body,
  layers,
  children,
  className,
}: AirframeSectionProps) {
  return (
    <section
      data-airframe={airframe}
      className={cn(
        "relative isolate flex min-h-svh w-full items-center overflow-hidden bg-background",
        className,
      )}
    >
      {layers.map((layer, i) => (
        <div
          key={layer.src}
          aria-hidden={layer.alt ? undefined : "true"}
          className={cn("parallax-layer absolute inset-0", layer.className)}
          style={
            {
              "--parallax-depth": layer.depth,
              "--parallax-scale": layer.scale ?? 1,
              zIndex: i,
            } as React.CSSProperties
          }
        >
          <Image
            src={layer.src}
            alt={layer.alt ?? ""}
            fill
            sizes="100vw"
            priority={layer.priority}
            className="object-cover"
          />
        </div>
      ))}

      {/* Keeps body copy legible over whatever the photography turns out to
          be, without darkening the aircraft into a silhouette. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(90deg, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / 0.6) 45%, transparent 75%)",
        }}
      />

      <div className="relative z-20 mx-auto w-full max-w-6xl px-6 py-24">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-hud">
            {eyebrow}
          </p>
          <h2 className="hud-glow mt-4 text-balance font-sans text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {headline}
          </h2>
          <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">
            {body}
          </p>
          {children && <div className="mt-8">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export default AirframeSection;
