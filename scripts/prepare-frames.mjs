#!/usr/bin/env node
/**
 * Turn a folder of extracted PNG frames into web-ready renditions plus the
 * manifest the hero reads.
 *
 *   node scripts/prepare-frames.mjs \
 *     --in ~/Downloads/frames_.../ \
 *     --name canopy \
 *     --keep 180
 *
 * A 60fps export is far more frames than a scroll animation can use: the
 * sequence is scrubbed by scroll position, not played at a frame rate, and a
 * user drags through the whole reveal in roughly two seconds of wheel travel.
 * ~120-180 frames is the point past which extra frames cost bandwidth and
 * decode time without being distinguishable, so --keep subsamples evenly.
 */

import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

const inDir = args.in;
const name = args.name ?? "canopy";
const keep = Number(args.keep ?? 180);
const outDir = path.join("public", "frames", name);

if (!inDir) {
  console.error("usage: prepare-frames.mjs --in <dir of PNGs> [--name canopy] [--keep 180]");
  process.exit(1);
}

// Widths cover phone, laptop and 5K. The hero picks one at runtime; shipping
// the 3840 sequence to a phone blows the data and decode budget at once.
const RENDITIONS = [
  { width: 960, suffix: "@960" },
  { width: 1920, suffix: "@1920" },
  { width: 3840, suffix: "" },
];

const files = (await readdir(inDir))
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (files.length === 0) {
  console.error(`no image frames found in ${inDir}`);
  process.exit(1);
}

// Even subsample, always keeping the first and last frame — dropping either
// leaves the reveal starting or ending mid-motion.
const step = (files.length - 1) / (Math.min(keep, files.length) - 1);
const chosen =
  files.length <= keep
    ? files
    : Array.from({ length: keep }, (_, i) => files[Math.round(i * step)]);

await mkdir(outDir, { recursive: true });

const probe = await sharp(path.join(inDir, chosen[0])).metadata();
const aspect = probe.height / probe.width;

const renditions = [];
for (const r of RENDITIONS) {
  if (r.width > probe.width) continue; // never upscale
  renditions.push({
    width: r.width,
    height: Math.round(r.width * aspect),
    suffix: r.suffix,
  });
}
if (renditions.length === 0) {
  renditions.push({ width: probe.width, height: probe.height, suffix: "" });
}

let done = 0;
for (const [i, file] of chosen.entries()) {
  const src = path.join(inDir, file);
  const stem = `frame_${String(i).padStart(4, "0")}`;

  for (const r of renditions) {
    const pipeline = sharp(src).resize(r.width, r.height, { fit: "cover" });

    await Promise.all([
      // AVIF carries the wide-gamut, high-bit-depth detail; chromaSubsampling
      // 4:4:4 keeps the thin HUD reticle lines from smearing, which 4:2:0
      // visibly destroys on saturated green-on-dark.
      pipeline
        .clone()
        .avif({ quality: 62, effort: 6, chromaSubsampling: "4:4:4" })
        .toFile(path.join(outDir, `${stem}${r.suffix}.avif`)),
      pipeline
        .clone()
        .webp({ quality: 78 })
        .toFile(path.join(outDir, `${stem}${r.suffix}.webp`)),
    ]);
  }
  done++;
  if (done % 20 === 0) process.stdout.write(`  ${done}/${chosen.length}\n`);
}

const manifest = {
  basePath: `/frames/${name}`,
  pattern: "frame_%04d",
  count: chosen.length,
  width: probe.width,
  height: probe.height,
  formats: ["avif", "webp"],
  renditions,
};

await writeFile(
  path.join(outDir, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);

console.log(
  `\n${chosen.length} frames from ${files.length} source images -> ${outDir}`,
);
console.log(`renditions: ${renditions.map((r) => r.width).join(", ")}`);
