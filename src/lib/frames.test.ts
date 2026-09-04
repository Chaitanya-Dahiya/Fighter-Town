import { describe, expect, it } from "vitest";
import {
  frameForProgress,
  frameUrl,
  pickRendition,
  priorityIndices,
  type FrameManifest,
} from "./frames";

const manifest: FrameManifest = {
  basePath: "/frames/canopy",
  pattern: "frame_%04d",
  count: 180,
  width: 3840,
  height: 2160,
  formats: ["avif", "webp"],
  renditions: [
    { width: 960, height: 540, suffix: "@960" },
    { width: 1920, height: 1080, suffix: "@1920" },
    { width: 3840, height: 2160, suffix: "" },
  ],
};

describe("frame addressing", () => {
  it("builds a zero-padded url for the chosen rendition", () => {
    expect(frameUrl(manifest, 7, "avif", "@1920")).toBe(
      "/frames/canopy/frame_0007@1920.avif",
    );
  });

  it("clamps progress to the sequence at both ends", () => {
    expect(frameForProgress(0, 180)).toBe(0);
    expect(frameForProgress(1, 180)).toBe(179);
    // Overscroll (rubber-banding on iOS) must not index past the last frame.
    expect(frameForProgress(1.4, 180)).toBe(179);
    expect(frameForProgress(-0.2, 180)).toBe(0);
  });

  it("survives an empty sequence", () => {
    expect(frameForProgress(0.5, 0)).toBe(0);
  });
});

describe("pickRendition", () => {
  it("takes the narrowest rendition that covers the viewport", () => {
    expect(pickRendition(manifest, 390, 3).width).toBe(960); // dpr capped at 2
    expect(pickRendition(manifest, 1440, 1).width).toBe(1920);
  });

  it("falls back to the largest rather than returning nothing", () => {
    expect(pickRendition(manifest, 5120, 2).width).toBe(3840);
  });
});

describe("priorityIndices", () => {
  it("spreads the first fetch across the whole sequence", () => {
    const idx = priorityIndices(180, 12);
    expect(idx[0]).toBe(0);
    expect(idx.at(-1)).toBe(179);
    expect(idx).toHaveLength(12);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it("asks for every frame when the sequence is shorter than the budget", () => {
    expect(priorityIndices(5, 12)).toEqual([0, 1, 2, 3, 4]);
  });
});
