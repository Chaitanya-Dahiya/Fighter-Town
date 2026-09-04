/** Interval arithmetic shared by the availability engine. All Dates are UTC. */

export type Interval = { start: Date; end: Date };

export const DUBAI_TZ = "Asia/Dubai";

export function overlaps(a: Interval, b: Interval): boolean {
  // Half-open [start, end): a booking ending at 14:00 does not collide with
  // one starting at 14:00.
  return a.start < b.end && b.start < a.end;
}

export function contains(outer: Interval, inner: Interval): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

export function durationMinutes(i: Interval): number {
  return (i.end.getTime() - i.start.getTime()) / 60_000;
}

/** Subtract a set of intervals from a window, returning the remaining gaps. */
export function subtractIntervals(window: Interval, cuts: Interval[]): Interval[] {
  const relevant = cuts
    .filter((c) => overlaps(window, c))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const gaps: Interval[] = [];
  let cursor = window.start;

  for (const cut of relevant) {
    if (cut.start > cursor) gaps.push({ start: cursor, end: cut.start });
    if (cut.end > cursor) cursor = cut.end;
    if (cursor >= window.end) break;
  }
  if (cursor < window.end) gaps.push({ start: cursor, end: window.end });

  return gaps;
}
