# Canopy reveal frames

The hero scrubs this sequence against scroll position. Frames are generated,
never hand-placed.

## Real frames

Extract your frame export somewhere, then:

    node scripts/prepare-frames.mjs --in /path/to/extracted/frames --name canopy --keep 180

That writes `frame_0000@960.avif`, `frame_0000@1920.avif`, … plus
`manifest.json`, and the hero picks up the new sequence with no code change.

A 60fps export gives far more frames than a scroll animation can use — the
sequence is scrubbed by scroll position, not played at a frame rate, and a
viewer drags through the whole reveal in about two seconds of wheel travel.
`--keep 180` subsamples evenly; past roughly 180 frames the extra ones cost
bandwidth and decode time without being distinguishable.

## Placeholders

`scripts/generate-placeholder-frames.mjs` renders a schematic stand-in so the
hero runs before the real art exists. Its manifest carries `"placeholder": true`.
Delete these once real frames land — they are the correct shape, not the
correct look.

## What makes a good source sequence

- **16:9, 3840px wide or better.** The hero cover-fits to the viewport, so
  anything narrower gets cropped on ultrawide displays.
- **Locked camera.** Scrubbing amplifies camera drift into a wobble; the canopy
  should move, not the frame.
- **Even motion.** Scroll maps linearly to frame index, so pacing must live in
  the frames themselves. The placeholder generator eases the canopy open for
  exactly this reason.
- **Dark, low-noise background.** Grain does not compress and it shimmers
  between frames under scrubbing.
