/**
 * Slot availability is *derived*, never stored.
 *
 * Pre-generating slot rows rots the moment opening hours or rig count change,
 * and it forces a backfill for every schedule edit. Instead we compute open
 * slots on demand from three inputs: the opening window, the resources that
 * physically exist, and the intervals in which each resource is already busy.
 *
 * This module is deliberately pure — no database, no clock of its own — so the
 * concurrency and edge-case rules below are testable without Postgres.
 * The database still owns the final word on double-booking via an exclusion
 * constraint (see drizzle/0000_init.sql); this engine is what users see, not
 * what guarantees correctness.
 */

import { addMinutes, overlaps, type Interval } from "./time";
import type { Experience } from "./experiences";

export type ResourceId = string;

export type Resources = {
  /** Physical 6-DOF rigs, e.g. three at DIP-1. */
  rigs: ResourceId[];
  instructors: ResourceId[];
};

/** Intervals in which a given resource cannot be used, keyed by resource id. */
export type BusyMap = Record<ResourceId, Interval[]>;

export type AvailabilityInput = {
  /** Opening windows for the requested day, already resolved to UTC. */
  windows: Interval[];
  experience: Experience;
  /** How many rigs the party wants to fly at once. */
  pilots: number;
  resources: Resources;
  busy: BusyMap;
  /** Candidate start times step by this many minutes. */
  stepMin?: number;
  /** Current time; slots starting before now + leadTimeMin are hidden. */
  now: Date;
  /** Minimum notice before a session may start. */
  leadTimeMin?: number;
};

export type Slot = {
  start: Date;
  end: Date;
  /** Rigs free for the whole slot — always >= the requested pilot count. */
  rigsAvailable: number;
};

function isFree(resource: ResourceId, slot: Interval, busy: BusyMap): boolean {
  const intervals = busy[resource];
  if (!intervals) return true;
  return !intervals.some((b) => overlaps(slot, b));
}

function countFree(
  resources: ResourceId[],
  slot: Interval,
  busy: BusyMap,
): number {
  return resources.reduce((n, r) => (isFree(r, slot, busy) ? n + 1 : n), 0);
}

export function computeSlots(input: AvailabilityInput): Slot[] {
  const {
    windows,
    experience,
    pilots,
    resources,
    busy,
    stepMin = 15,
    now,
    leadTimeMin = 120,
  } = input;

  if (pilots < 1 || pilots > experience.maxPilots) return [];
  if (resources.rigs.length < pilots) return [];

  const earliestStart = addMinutes(now, leadTimeMin);
  const slots: Slot[] = [];

  for (const window of windows) {
    for (
      let start = window.start;
      addMinutes(start, experience.durationMin) <= window.end;
      start = addMinutes(start, stepMin)
    ) {
      if (start < earliestStart) continue;

      const slot: Interval = {
        start,
        end: addMinutes(start, experience.durationMin),
      };

      const rigsAvailable = countFree(resources.rigs, slot, busy);
      if (rigsAvailable < pilots) continue;

      // An instructor-led session that no instructor can staff is not
      // bookable, however many rigs are idle. Confirming these is how a
      // schedule ends up owing lessons nobody can teach.
      if (experience.requiresInstructor) {
        if (countFree(resources.instructors, slot, busy) < 1) continue;
      }

      slots.push({ start: slot.start, end: slot.end, rigsAvailable });
    }
  }

  return slots;
}

/**
 * Resources to lock for a confirmed booking. The instructor is held for the
 * full session, so it must appear in the same reservation as the rigs.
 */
export function assignResources(
  input: Omit<AvailabilityInput, "windows" | "stepMin" | "now" | "leadTimeMin">,
  slot: Interval,
): { rigs: ResourceId[]; instructor: ResourceId | null } | null {
  const { experience, pilots, resources, busy } = input;

  const rigs = resources.rigs.filter((r) => isFree(r, slot, busy)).slice(0, pilots);
  if (rigs.length < pilots) return null;

  let instructor: ResourceId | null = null;
  if (experience.requiresInstructor) {
    instructor = resources.instructors.find((i) => isFree(i, slot, busy)) ?? null;
    if (!instructor) return null;
  }

  return { rigs, instructor };
}
