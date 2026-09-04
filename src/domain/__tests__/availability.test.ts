import { describe, expect, it } from "vitest";
import { computeSlots, assignResources, type BusyMap } from "../availability";
import { EXPERIENCES } from "../experiences";
import { subtractIntervals, type Interval } from "../time";

const at = (hhmm: string) => new Date(`2026-10-01T${hhmm}:00.000Z`);
const day: Interval = { start: at("06:00"), end: at("14:00") }; // 10:00–18:00 Dubai

const RIGS = ["rig-1", "rig-2", "rig-3"];
const base = {
  windows: [day],
  resources: { rigs: RIGS, instructors: ["inst-1"] },
  busy: {} as BusyMap,
  now: at("00:00"),
};

describe("computeSlots", () => {
  it("generates slots on the step grid and never past closing", () => {
    const slots = computeSlots({
      ...base,
      experience: EXPERIENCES["free-flight"],
      pilots: 1,
    });
    expect(slots[0].start).toEqual(at("06:00"));
    expect(slots.at(-1)!.end).toEqual(at("14:00"));
    expect(slots.every((s) => s.end <= day.end)).toBe(true);
  });

  it("hides slots inside the lead time", () => {
    const slots = computeSlots({
      ...base,
      experience: EXPERIENCES["free-flight"],
      pilots: 1,
      now: at("06:00"),
      leadTimeMin: 120,
    });
    expect(slots[0].start).toEqual(at("08:00"));
  });

  it("treats booking boundaries as half-open", () => {
    const slots = computeSlots({
      ...base,
      experience: EXPERIENCES["free-flight"],
      pilots: 3,
      busy: Object.fromEntries(
        RIGS.map((r) => [r, [{ start: at("06:00"), end: at("07:00") }]]),
      ),
    });
    // A rig freed at 07:00 is bookable at 07:00, not 07:15.
    expect(slots[0].start).toEqual(at("07:00"));
  });

  it("requires one rig per pilot for the whole slot", () => {
    const busy: BusyMap = {
      "rig-1": [{ start: at("08:00"), end: at("09:00") }],
      "rig-2": [{ start: at("08:30"), end: at("09:30") }],
    };
    const slots = computeSlots({
      ...base,
      experience: EXPERIENCES.dogfight,
      pilots: 3,
      busy,
    });
    const starts = slots.map((s) => s.start.toISOString());
    // 07:15 would overlap rig-1's 08:00 booking part-way through the hour.
    expect(starts).not.toContain(at("07:15").toISOString());
    expect(starts).toContain(at("09:30").toISOString());
  });

  it("will not offer an instructor-led session with no free instructor", () => {
    const busy: BusyMap = { "inst-1": [day] };
    expect(
      computeSlots({
        ...base,
        experience: EXPERIENCES["virtual-pilot-lesson"],
        pilots: 1,
        busy,
      }),
    ).toHaveLength(0);
    // ...while the same idle rigs still sell an unstaffed experience.
    expect(
      computeSlots({ ...base, experience: EXPERIENCES["free-flight"], pilots: 1, busy }),
    ).not.toHaveLength(0);
  });

  it("rejects parties larger than the experience allows", () => {
    expect(
      computeSlots({ ...base, experience: EXPERIENCES["passenger-ride"], pilots: 2 }),
    ).toHaveLength(0);
  });
});

describe("assignResources", () => {
  const slot: Interval = { start: at("08:00"), end: at("09:00") };

  it("hands out distinct rigs plus an instructor", () => {
    const a = assignResources(
      {
        experience: EXPERIENCES["virtual-pilot-lesson"],
        pilots: 1,
        resources: base.resources,
        busy: {},
      },
      slot,
    );
    expect(a).toEqual({ rigs: ["rig-1"], instructor: "inst-1" });
  });

  it("returns null rather than overbooking a contended slot", () => {
    // Two parties race for the last rig: the second assignment must fail
    // once the first is recorded. The DB exclusion constraint is what makes
    // this hold under true concurrency; this is the in-process half.
    const busy: BusyMap = {
      "rig-1": [slot],
      "rig-2": [slot],
    };
    const args = {
      experience: EXPERIENCES.dogfight,
      pilots: 2,
      resources: base.resources,
      busy,
    };
    expect(assignResources(args, slot)).toBeNull();
  });
});

describe("subtractIntervals", () => {
  it("returns the gaps left by overlapping cuts", () => {
    const gaps = subtractIntervals(day, [
      { start: at("07:00"), end: at("08:00") },
      { start: at("07:30"), end: at("09:00") },
    ]);
    expect(gaps).toEqual([
      { start: at("06:00"), end: at("07:00") },
      { start: at("09:00"), end: at("14:00") },
    ]);
  });
});
