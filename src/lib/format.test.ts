import { describe, expect, it } from "vitest";
import { formatAed, formatDuration } from "./format";
import { EXPERIENCES } from "@/domain/experiences";

describe("formatAed", () => {
  it("renders fils as whole dirhams", () => {
    expect(formatAed(38_000)).toMatch(/380/);
    expect(formatAed(160_000)).toMatch(/1,600/);
  });

  it("matches the prices published on the current site", () => {
    expect(formatAed(EXPERIENCES["passenger-ride"].priceFils)).toMatch(/110/);
    expect(formatAed(EXPERIENCES.dogfight.priceFils)).toMatch(/380/);
    expect(
      formatAed(EXPERIENCES["super-carrier-qualification"].priceFils),
    ).toMatch(/1,600/);
  });
});

describe("formatDuration", () => {
  it("keeps short sessions in minutes", () => {
    expect(formatDuration(15)).toBe("15 min");
  });

  it("switches to hours on the hour", () => {
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(240)).toBe("4 hr");
  });

  it("keeps a half hour readable rather than rounding it away", () => {
    expect(formatDuration(90)).toBe("1.5 hr");
  });
});
