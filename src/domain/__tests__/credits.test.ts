import { describe, expect, it } from "vitest";
import { balanceMinutes, canRedeem, type CreditTransaction } from "../credits";
import { checkEligibility, isEligible } from "../eligibility";

const t = (
  minutes: number,
  extra: Partial<CreditTransaction> = {},
): CreditTransaction => ({
  id: crypto.randomUUID(),
  accountId: "acct-1",
  minutes,
  source: "package_purchase",
  bookingId: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  expiresAt: null,
  ...extra,
});

const now = new Date("2026-06-01T00:00:00Z");

describe("credit ledger", () => {
  it("nets grants against redemptions", () => {
    expect(balanceMinutes([t(240), t(-60), t(-60)], now)).toBe(120);
  });

  it("stops counting an expired grant but keeps its redemptions", () => {
    const expired = t(240, { expiresAt: new Date("2026-03-01T00:00:00Z") });
    // 240 lapsed, 60 of it was already flown: the guest is not owed 180 back.
    expect(balanceMinutes([expired, t(-60)], now)).toBe(-60);
  });

  it("refuses a redemption larger than the balance", () => {
    const ledger = [t(240), t(-180)];
    expect(canRedeem(ledger, 60, now)).toBe(true);
    expect(canRedeem(ledger, 120, now)).toBe(false);
    expect(canRedeem(ledger, 0, now)).toBe(false);
  });
});

describe("eligibility", () => {
  const ok = {
    ageYears: 30,
    heightCm: 175,
    weightKg: 80,
    acknowledgedSafetyBriefing: true as const,
  };

  it("passes a guest inside every limit", () => {
    expect(isEligible(ok)).toBe(true);
  });

  it("reports every breached limit at once", () => {
    expect(checkEligibility({ ...ok, ageYears: 12, heightCm: 140, weightKg: 120 }))
      .toEqual([
        "under_minimum_age",
        "under_minimum_height",
        "over_maximum_weight",
      ]);
  });

  it("treats the published limits as inclusive bounds", () => {
    expect(isEligible({ ...ok, ageYears: 15, heightCm: 160, weightKg: 100 })).toBe(true);
  });
});
