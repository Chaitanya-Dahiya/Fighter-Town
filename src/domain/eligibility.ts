/**
 * Safety limits for a 6-DOF motion platform. These are a hard gate, not
 * advisory copy — the check runs server-side on every booking and the guest's
 * attestation is stored with it.
 */

import { z } from "zod";

export const MIN_AGE_YEARS = 15;
export const MIN_HEIGHT_CM = 160;
export const MAX_WEIGHT_KG = 100;

export const eligibilitySchema = z.object({
  ageYears: z.number().int().min(0).max(120),
  heightCm: z.number().int().min(50).max(260),
  weightKg: z.number().int().min(20).max(400),
  acknowledgedSafetyBriefing: z.literal(true),
});

export type EligibilityInput = z.infer<typeof eligibilitySchema>;

export type EligibilityFailure =
  | "under_minimum_age"
  | "under_minimum_height"
  | "over_maximum_weight";

export function checkEligibility(input: EligibilityInput): EligibilityFailure[] {
  const failures: EligibilityFailure[] = [];
  if (input.ageYears < MIN_AGE_YEARS) failures.push("under_minimum_age");
  if (input.heightCm < MIN_HEIGHT_CM) failures.push("under_minimum_height");
  if (input.weightKg > MAX_WEIGHT_KG) failures.push("over_maximum_weight");
  return failures;
}

export function isEligible(input: EligibilityInput): boolean {
  return checkEligibility(input).length === 0;
}
