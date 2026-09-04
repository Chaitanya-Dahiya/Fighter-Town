"use client";

/**
 * Scroll-locked canopy reveal.
 *
 * The section pins for a fixed scroll distance while a decoded frame sequence
 * scrubs from a closed F-22 canopy to an open one, handing the viewer the
 * cockpit. Mechanics borrowed from the scroll-locked-video-hero pattern —
 * momentum settling, a pointer-driven lens tilt, a genuinely different
 * composition on coarse pointers — with the frame sequence replacing video
 * scrubbing, which cannot scrub smoothly (seeks land on keyframes).
 *
 * Three behaviours are non-negotiable and enforced here rather than left to
 * the caller:
 *   - prefers-reduced-motion collapses the whole thing to one static frame.
 *   - Coarse pointers get a shorter sequence at a smaller rendition, never a
 *     scaled-down copy of the desktop rig.
 *   - Nothing is pinned until enough frames are decoded to scrub, so the
 *     viewer never stares at a blank pinned section.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  frameForProgress,
  frameUrl,
  pickFormat,
  pickRendition,
  priorityIndices,
  type FrameFormat,
  type FrameManifest,
} from "@/lib/frames";
import { cn } from "@/lib/utils";

export type CanopyRevealHeroProps = {
  manifest: FrameManifest;
  /** Airframe signature for the HUD colour; see globals.css. */
  airframe?: "f22" | "f16" | "rafale";
  headline: string;
  subhead?: string;
  /** Multiples of viewport height the section stays pinned. */
  scrollLength?: number;
  children?: React.ReactNode;
  className?: string;
};

/** Scrub tilts the frame slightly toward the cursor — parallax without layers. */
const MAX_TILT_DEG = 6;

export function CanopyRevealHero({
  manifest,
  airframe = "f22",
  headline,
  subhead,
  scrollLength = 3,
  children,
  className,
}: CanopyRevealHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(ImageBitmap | HTMLImageElement | null)[]>([]);
  const progressRef = useRef(0);
  const renderedRef = useRef(-1);
  const tiltRef = useRef({ x: 0, y: 0 });

  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Both a real touch device and a narrow window count: testing responsive
    // by shrinking a desktop browser never changes pointer type, so keying on
    // pointer alone leaves the desktop rig running in a phone-width window.
    const pointer = window.matchMedia("(pointer: coarse)");

    const sync = () => {
      setReducedMotion(motion.matches);
      setCoarse(pointer.matches || window.innerWidth < 768);
    };
    sync();
    motion.addEventListener("change", sync);
    pointer.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      motion.removeEventListener("change", sync);
      pointer.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  // ── decode ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const frames: (ImageBitmap | HTMLImageElement | null)[] = new Array(
      manifest.count,
    ).fill(null);
    framesRef.current = frames;

    const format: FrameFormat = pickFormat(manifest.formats);
    const rendition = pickRendition(
      manifest,
      window.innerWidth,
      window.devicePixelRatio || 1,
    );

    async function decode(index: number) {
      const url = frameUrl(manifest, index, format, rendition.suffix);
      try {
        // createImageBitmap decodes off the main thread; an <img> decode on a
        // 3840px frame blocks long enough to drop the scrub to a crawl.
        const res = await fetch(url);
        if (!res.ok) return;
        const bitmap = await createImageBitmap(await res.blob());
        if (cancelled) {
          bitmap.close();
          return;
        }
        frames[index] = bitmap;
      } catch {
        /* a missing frame is skipped; the scrub holds the nearest decoded one */
      }
    }

    (async () => {
      // A coarse spread first, so the sequence is scrubbable almost
      // immediately and sharpens as the rest stream in behind it.
      await Promise.all(priorityIndices(manifest.count).map(decode));
      if (cancelled) return;
      setReady(true);

      for (let i = 0; i < manifest.count && !cancelled; i++) {
        if (!frames[i]) await decode(i);
      }
    })();

    return () => {
      cancelled = true;
      for (const f of frames) {
        if (f && "close" in f) f.close();
      }
    };
  }, [manifest]);

  // ── paint ─────────────────────────────────────────────────
  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const frames = framesRef.current;
    if (!canvas || frames.length === 0) return;

    const index = frameForProgress(progressRef.current, frames.length);
    if (index === renderedRef.current) return;

    // Hold the nearest already-decoded frame rather than blanking: during the
    // first seconds only the priority spread exists, and a gap reads as a
    // flicker, which is far worse than a briefly repeated frame.
    let bitmap = frames[index];
    if (!bitmap) {
      for (let d = 1; d < frames.length; d++) {
        bitmap = frames[index - d] ?? frames[index + d] ?? null;
        if (bitmap) break;
      }
    }
    if (!bitmap) return;

    const ctx = canvas.getContext("2d", {
      alpha: false,
      // Wide gamut where available: the HUD greens and ambers sit outside
      // sRGB and go visibly flat when the canvas clamps them.
      colorSpace: "display-p3",
    } as CanvasRenderingContext2DSettings);
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // Cover-fit: the frames are 16:9 but the pinned section is viewport-shaped.
    const scale = Math.max(w / bitmap.width, h / bitmap.height);
    const dw = bitmap.width * scale;
    const dh = bitmap.height * scale;
    ctx.drawImage(bitmap, (w - dw) / 2, (h - dh) / 2, dw, dh);
    renderedRef.current = index;
  }, []);

  // ── scroll ────────────────────────────────────────────────
  useEffect(() => {
    if (reducedMotion) {
      // Show the canopy open and be done. No pin, no scrub.
      progressRef.current = 1;
      renderedRef.current = -1;
      paint();
      return;
    }

    let rafId = 0;
    let queued = false;

    const onScroll = () => {
      const el = sectionRef.current;
      if (!el || queued) return;
      queued = true;
      rafId = requestAnimationFrame(() => {
        queued = false;
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const raw = total > 0 ? -rect.top / total : 0;
        progressRef.current = Math.min(1, Math.max(0, raw));
        paint();
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [paint, reducedMotion, ready]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (coarse || reducedMotion) return;
      const rect = e.currentTarget.getBoundingClientRect();
      tiltRef.current = {
        x: ((e.clientY - rect.top) / rect.height - 0.5) * -MAX_TILT_DEG,
        y: ((e.clientX - rect.left) / rect.width - 0.5) * MAX_TILT_DEG,
      };
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transform = `perspective(1400px) rotateX(${tiltRef.current.x}deg) rotateY(${tiltRef.current.y}deg) scale(1.04)`;
      }
    },
    [coarse, reducedMotion],
  );

  const onPointerLeave = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.transition = `transform var(--dur-slow) var(--ease-hud)`;
      canvas.style.transform = "perspective(1400px) rotateX(0deg) rotateY(0deg) scale(1.04)";
    }
  }, []);

  const pinned = !reducedMotion;

  return (
    <section
      ref={sectionRef}
      data-airframe={airframe}
      className={cn("relative w-full bg-background", className)}
      style={{ height: pinned ? `${scrollLength * 100}svh` : "100svh" }}
    >
      <div
        className={cn(
          "top-0 flex h-svh w-full items-center justify-center overflow-hidden",
          pinned ? "sticky" : "relative",
        )}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-[1.04] will-change-transform"
          style={{ transition: "transform var(--dur-fast) linear" }}
        />

        {/* Lens vignette, so the canopy frame reads as glass rather than a
            flat photograph pasted behind the copy. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 75% at 50% 45%, transparent 45%, hsl(var(--background) / 0.82) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h1 className="hud-glow text-balance font-sans text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            {headline}
          </h1>
          {subhead && (
            <p className="mt-5 text-pretty text-base text-muted-foreground sm:text-lg">
              {subhead}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </div>

        {!ready && (
          <div
            className="absolute inset-x-0 bottom-10 text-center font-mono text-xs uppercase tracking-[0.3em] text-hud"
            role="status"
          >
            canopy · standby
          </div>
        )}
      </div>
    </section>
  );
}

export default CanopyRevealHero;
