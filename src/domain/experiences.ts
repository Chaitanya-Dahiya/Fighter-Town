/**
 * The seven products Fightertown sells. Prices in AED fils (integer minor
 * units) so no float ever touches money.
 */

export const EXPERIENCE_SLUGS = [
  "free-flight",
  "virtual-pilot-lesson",
  "passenger-ride",
  "training",
  "super-carrier-qualification",
  "dogfight",
  "dcs-pilots",
] as const;

export type ExperienceSlug = (typeof EXPERIENCE_SLUGS)[number];

/** Which airframe drives the page's HUD treatment and parallax hero. */
export type Airframe = "f22" | "f16" | "rafale" | "f14" | "fa18";

export type Experience = {
  slug: ExperienceSlug;
  /** Minutes of rig time consumed by one session. */
  durationMin: number;
  /** Price per person, AED fils. */
  priceFils: number;
  /** Concurrent rigs a single party may occupy. */
  maxPilots: number;
  /** Blocks an instructor for the whole session. */
  requiresInstructor: boolean;
  /**
   * Sold as a block of credits redeemable across several visits rather than a
   * single fixed session (Super Carrier Qualification).
   */
  packageMinutes: number | null;
  airframe: Airframe;
};

export const EXPERIENCES: Record<ExperienceSlug, Experience> = {
  "free-flight": {
    slug: "free-flight",
    durationMin: 60,
    priceFils: 38_000,
    maxPilots: 3,
    requiresInstructor: false,
    packageMinutes: null,
    airframe: "f16",
  },
  "virtual-pilot-lesson": {
    slug: "virtual-pilot-lesson",
    durationMin: 60,
    priceFils: 38_000,
    // Student and instructor fly the same aircraft from two linked rigs, so a
    // lesson is never more than one paying pilot.
    maxPilots: 1,
    requiresInstructor: true,
    packageMinutes: null,
    airframe: "f16",
  },
  "passenger-ride": {
    slug: "passenger-ride",
    durationMin: 15,
    priceFils: 11_000,
    maxPilots: 1,
    requiresInstructor: false,
    packageMinutes: null,
    airframe: "f14",
  },
  training: {
    slug: "training",
    durationMin: 60,
    priceFils: 38_000,
    maxPilots: 1,
    requiresInstructor: true,
    packageMinutes: null,
    airframe: "fa18",
  },
  "super-carrier-qualification": {
    slug: "super-carrier-qualification",
    durationMin: 60,
    priceFils: 160_000,
    maxPilots: 1,
    requiresInstructor: true,
    // 4 hours, spendable over multiple days.
    packageMinutes: 240,
    airframe: "fa18",
  },
  dogfight: {
    slug: "dogfight",
    durationMin: 60,
    priceFils: 38_000,
    maxPilots: 3,
    requiresInstructor: false,
    packageMinutes: null,
    airframe: "f22",
  },
  "dcs-pilots": {
    slug: "dcs-pilots",
    durationMin: 60,
    priceFils: 38_000,
    maxPilots: 1,
    requiresInstructor: false,
    packageMinutes: null,
    airframe: "rafale",
  },
};

export function getExperience(slug: string): Experience | undefined {
  return EXPERIENCES[slug as ExperienceSlug];
}

/**
 * A package is charged once at purchase; each redeemed session then costs
 * nothing at the door.
 */
export function chargeableFils(exp: Experience, pilots: number): number {
  return exp.packageMinutes ? exp.priceFils : exp.priceFils * pilots;
}
