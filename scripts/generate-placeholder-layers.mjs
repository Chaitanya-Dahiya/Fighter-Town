#!/usr/bin/env node
/**
 * Placeholder parallax layers, one set per airframe. Same role as the
 * placeholder frames: correct dimensions and layer split so real cockpit
 * photography drops in without touching component code.
 *
 * The layer split is the part worth keeping when the real shots arrive:
 *   sky    — travels furthest, sells the pitch change
 *   panel  — barely moves, anchors the viewer in the cockpit
 *   canopy — pinned at depth 0, the frame you are sitting behind
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const W = 1920;
const H = 1200;

const AIRFRAMES = {
  f22: { hud: "#12ffa0", sky: ["#0a1a2e", "#16324f"], ground: "#0d1117" },
  f16: { hud: "#ffb020", sky: ["#241a10", "#4a3418"], ground: "#14100a" },
  rafale: { hud: "#3fb8ff", sky: ["#0b1a2c", "#1b3a5c"], ground: "#0a1018" },
};

function sky(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c.sky[0]}"/><stop offset="100%" stop-color="${c.sky[1]}"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect x="0" y="${H * 0.58}" width="${W}" height="3" fill="${c.hud}" opacity="0.25"/>
    ${Array.from({ length: 7 }, (_, i) =>
      `<rect x="${(i * W) / 7 + 40}" y="${H * 0.62 + (i % 3) * 30}" width="${W / 12}" height="4" fill="#ffffff" opacity="0.06"/>`,
    ).join("")}
  </svg>`;
}

function panel(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="none"/>
    <path d="M0,${H} L0,${H * 0.66} Q${W / 2},${H * 0.54} ${W},${H * 0.66} L${W},${H} Z" fill="${c.ground}"/>
    ${[0.24, 0.42, 0.58, 0.76]
      .map(
        (x) =>
          `<rect x="${W * x - 70}" y="${H * 0.74}" width="140" height="110" rx="8" fill="#000" opacity="0.55" stroke="${c.hud}" stroke-opacity="0.28"/>`,
      )
      .join("")}
  </svg>`;
}

function canopy(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <path d="M0,0 L0,${H} L${W * 0.1},${H} Q${W * 0.16},${H * 0.34} ${W * 0.42},${H * 0.06} L${W * 0.58},${H * 0.06} Q${W * 0.84},${H * 0.34} ${W * 0.9},${H} L${W},${H} L${W},0 Z"
      fill="#05070c" opacity="0.96"/>
    <line x1="${W * 0.5}" y1="${H * 0.06}" x2="${W * 0.5}" y2="${H}" stroke="#05070c" stroke-width="18" opacity="0.85"/>
    <circle cx="${W * 0.5}" cy="${H * 0.4}" r="${H * 0.09}" fill="none" stroke="${c.hud}" stroke-width="2" opacity="0.5"/>
  </svg>`;
}

for (const [name, c] of Object.entries(AIRFRAMES)) {
  const dir = path.join("public", "layers", name);
  await mkdir(dir, { recursive: true });
  for (const [layer, svg] of [
    ["sky", sky(c)],
    ["panel", panel(c)],
    ["canopy", canopy(c)],
  ]) {
    await sharp(Buffer.from(svg))
      .avif({ quality: 66, effort: 4, chromaSubsampling: "4:4:4" })
      .toFile(path.join(dir, `${layer}.avif`));
  }
  await writeFile(path.join(dir, "README.md"), `# ${name} layers (placeholder)\n\nReplace with real photography at ${W}x${H} or larger.\n\n- \`sky.avif\` — background, travels furthest\n- \`panel.avif\` — instrument panel, transparent above the coaming\n- \`canopy.avif\` — canopy frame, transparent through the glass, pinned at depth 0\n`);
}

console.log("placeholder layers -> public/layers/{f22,f16,rafale}");
