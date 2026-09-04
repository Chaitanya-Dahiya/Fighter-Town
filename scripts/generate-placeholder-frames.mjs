#!/usr/bin/env node
/**
 * Renders a stand-in canopy-opening sequence so the hero is runnable before
 * the real frames exist. Deliberately schematic — nobody should mistake this
 * for the finished art — but it is the correct length, aspect and manifest
 * shape, so dropping in real frames changes no code.
 *
 *   node scripts/generate-placeholder-frames.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const COUNT = 60;
const OUT = path.join("public", "frames", "canopy");
const RENDITIONS = [
  { width: 960, height: 540, suffix: "@960" },
  { width: 1920, height: 1080, suffix: "@1920" },
];

// Ease-out: the canopy breaks its seal slowly, then swings clear.
const ease = (t) => 1 - Math.pow(1 - t, 2.4);

function svg(t, w, h) {
  const open = ease(t);
  const lift = open * h * 0.62;
  const tilt = open * -22;
  const hudOpacity = Math.max(0, (open - 0.45) / 0.55);
  const glare = 0.25 + (1 - open) * 0.35;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1730"/>
      <stop offset="55%" stop-color="#123055"/>
      <stop offset="100%" stop-color="#2a1a10"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cfe6ff" stop-opacity="${glare}"/>
      <stop offset="60%" stop-color="#8fb6d8" stop-opacity="${glare * 0.5}"/>
      <stop offset="100%" stop-color="#d9c48a" stop-opacity="${glare * 0.8}"/>
    </linearGradient>
    <radialGradient id="vig" cx="50%" cy="45%" r="70%">
      <stop offset="45%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.85"/>
    </radialGradient>
  </defs>

  <rect width="${w}" height="${h}" fill="url(#sky)"/>

  <!-- horizon, drifting as the canopy clears -->
  <rect x="0" y="${h * (0.52 + open * 0.04)}" width="${w}" height="2" fill="#5a7ea8" opacity="0.5"/>

  <!-- instrument coaming, fixed -->
  <path d="M0,${h} L0,${h * 0.72} Q${w / 2},${h * 0.6} ${w},${h * 0.72} L${w},${h} Z" fill="#0b0e14"/>
  <rect x="${w * 0.3}" y="${h * 0.78}" width="${w * 0.4}" height="${h * 0.12}" rx="6" fill="#121722"/>

  <!-- HUD symbology, fading up as the cockpit is revealed -->
  <g opacity="${hudOpacity}" stroke="#12ffa0" fill="none" stroke-width="2">
    <circle cx="${w / 2}" cy="${h * 0.44}" r="${h * 0.09}"/>
    <line x1="${w / 2 - h * 0.13}" y1="${h * 0.44}" x2="${w / 2 - h * 0.1}" y2="${h * 0.44}"/>
    <line x1="${w / 2 + h * 0.1}" y1="${h * 0.44}" x2="${w / 2 + h * 0.13}" y2="${h * 0.44}"/>
    <line x1="${w / 2}" y1="${h * 0.3}" x2="${w / 2}" y2="${h * 0.34}"/>
    <rect x="${w * 0.14}" y="${h * 0.38}" width="${w * 0.05}" height="${h * 0.12}"/>
    <rect x="${w * 0.81}" y="${h * 0.38}" width="${w * 0.05}" height="${h * 0.12}"/>
  </g>

  <!-- the canopy itself: lifts and tilts back on its rear hinge -->
  <g transform="translate(0,${-lift}) rotate(${tilt} ${w / 2} ${h})">
    <path d="M${w * 0.16},${h * 0.98} Q${w * 0.5},${h * -0.06} ${w * 0.84},${h * 0.98} Z" fill="url(#glass)"/>
    <path d="M${w * 0.16},${h * 0.98} Q${w * 0.5},${h * -0.06} ${w * 0.84},${h * 0.98}"
          fill="none" stroke="#8aa0b8" stroke-width="7" opacity="0.75"/>
    <line x1="${w * 0.5}" y1="${h * 0.02}" x2="${w * 0.5}" y2="${h * 0.98}"
          stroke="#7d92a8" stroke-width="4" opacity="0.5"/>
  </g>

  <rect width="${w}" height="${h}" fill="url(#vig)"/>
</svg>`;
}

await mkdir(OUT, { recursive: true });

for (let i = 0; i < COUNT; i++) {
  const t = i / (COUNT - 1);
  const stem = `frame_${String(i).padStart(4, "0")}`;
  for (const r of RENDITIONS) {
    const buf = Buffer.from(svg(t, r.width, r.height));
    await Promise.all([
      sharp(buf).avif({ quality: 62, effort: 4, chromaSubsampling: "4:4:4" })
        .toFile(path.join(OUT, `${stem}${r.suffix}.avif`)),
      sharp(buf).webp({ quality: 78 }).toFile(path.join(OUT, `${stem}${r.suffix}.webp`)),
    ]);
  }
}

await writeFile(
  path.join(OUT, "manifest.json"),
  JSON.stringify(
    {
      basePath: "/frames/canopy",
      pattern: "frame_%04d",
      count: COUNT,
      width: 1920,
      height: 1080,
      formats: ["avif", "webp"],
      renditions: RENDITIONS,
      placeholder: true,
    },
    null,
    2,
  ) + "\n",
);

console.log(`${COUNT} placeholder frames -> ${OUT}`);
