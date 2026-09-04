/**
 * Scroll-scrubbed frame sequences.
 *
 * The canopy reveal is a decoded image sequence painted to a canvas, not a
 * <video> scrubbed by currentTime. Video seeks land on keyframes, so scrubbing
 * one against scroll position stutters badly on Safari and mid-range Android —
 * the exact devices that carry most of this site's traffic. A frame sequence
 * scrubs deterministically: scroll progress maps to an array index, and the
 * frame is either decoded or it isn't.
 *
 * `scripts/prepare-frames.mjs` produces the manifest from a folder of PNGs.
 */

export type FrameManifest = {
  /** Directory under /public, e.g. "/frames/canopy". */
  basePath: string;
  /** Filename pattern with a zero-padded index, e.g. "frame_%04d". */
  pattern: string;
  count: number;
  width: number;
  height: number;
  /** Encoded variants, best first. The loader picks the first the browser can decode. */
  formats: FrameFormat[];
  /** Responsive renditions, ascending by width. */
  renditions: { width: number; height: number; suffix: string }[];
};

export type FrameFormat = "avif" | "webp" | "jpg";

const MIME: Record<FrameFormat, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpg: "image/jpeg",
};

export function frameUrl(
  manifest: FrameManifest,
  index: number,
  format: FrameFormat,
  suffix = "",
): string {
  const padded = String(index).padStart(padWidth(manifest.pattern), "0");
  const name = manifest.pattern.replace(/%0(\d)d/, padded);
  return `${manifest.basePath}/${name}${suffix}.${format}`;
}

function padWidth(pattern: string): number {
  const m = pattern.match(/%0(\d)d/);
  return m ? Number(m[1]) : 4;
}

/** Map 0..1 scroll progress onto a frame index, clamped to the sequence. */
export function frameForProgress(progress: number, count: number): number {
  if (count <= 0) return 0;
  const i = Math.round(progress * (count - 1));
  return Math.min(count - 1, Math.max(0, i));
}

/**
 * Pick the narrowest rendition that still covers the viewport at this DPR.
 * Serving the 3840px sequence to a phone is the fastest way to blow both the
 * data budget and the decode budget.
 */
export function pickRendition(
  manifest: FrameManifest,
  viewportWidth: number,
  dpr: number,
): { width: number; height: number; suffix: string } {
  const needed = viewportWidth * Math.min(dpr, 2);
  return (
    manifest.renditions.find((r) => r.width >= needed) ??
    manifest.renditions[manifest.renditions.length - 1]
  );
}

/** First format the browser can actually decode, tested once. */
export function pickFormat(formats: FrameFormat[]): FrameFormat {
  if (typeof document === "undefined") return formats[formats.length - 1];
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  for (const f of formats) {
    if (canvas.toDataURL(MIME[f]).startsWith(`data:${MIME[f]}`)) return f;
  }
  return formats[formats.length - 1];
}

/**
 * Frames to fetch before the hero is considered ready. Loading all ~300 up
 * front delays first paint for seconds; loading only frame 0 means the first
 * flick of the wheel shows nothing. A coarse spread lets the sequence be
 * scrubbable immediately and sharpen as the rest stream in.
 */
export function priorityIndices(count: number, budget = 12): number[] {
  if (count <= budget) return Array.from({ length: count }, (_, i) => i);
  const step = (count - 1) / (budget - 1);
  return Array.from({ length: budget }, (_, i) => Math.round(i * step));
}
