import { describe, expect, it } from "vitest";
import { ManualPaymentProvider, MemoryIntentStore } from "./manual";
import { PaymentError } from "./provider";

function provider() {
  return new ManualPaymentProvider(new MemoryIntentStore());
}
const input = {
  bookingId: "b1",
  amountFils: 38_000,
  currency: "AED" as const,
  customerEmail: "pilot@example.com",
  description: "Dogfight",
  returnUrl: "https://example.com/done",
};

describe("manual payment provider", () => {
  it("opens an unpaid intent with no checkout redirect", async () => {
    const intent = await provider().createIntent(input);
    expect(intent.status).toBe("requires_payment");
    expect(intent.checkoutUrl).toBeNull();
  });

  it("rejects a non-integer amount rather than rounding it", async () => {
    await expect(provider().createIntent({ ...input, amountFils: 380.5 }))
      .rejects.toThrow(PaymentError);
  });

  it("settles at the desk against a staff reference", async () => {
    const p = provider();
    const intent = await p.createIntent(input);
    const settled = await p.settle(intent.id, "DESK-0042");
    expect(settled.status).toBe("paid");
    expect(settled.providerRef).toBe("DESK-0042");
  });

  it("refuses to refund money never captured", async () => {
    const p = provider();
    const intent = await p.createIntent(input);
    await expect(p.refund({ intentId: intent.id })).rejects.toThrow(
      /Nothing captured/,
    );
  });

  it("tracks partial refunds and closes out at the full amount", async () => {
    const p = provider();
    const intent = await p.createIntent(input);
    await p.settle(intent.id, "DESK-1");

    const partial = await p.refund({ intentId: intent.id, amountFils: 10_000 });
    expect(partial.status).toBe("partially_refunded");
    expect(partial.refundedFils).toBe(10_000);

    const rest = await p.refund({ intentId: intent.id });
    expect(rest.status).toBe("refunded");
    expect(rest.refundedFils).toBe(38_000);
  });

  it("never lets cumulative refunds exceed the capture", async () => {
    const p = provider();
    const intent = await p.createIntent(input);
    await p.settle(intent.id, "DESK-2");
    await p.refund({ intentId: intent.id, amountFils: 30_000 });
    // 30k already back; a second 10k would over-refund by 2k.
    await expect(
      p.refund({ intentId: intent.id, amountFils: 10_000 }),
    ).rejects.toThrow(/exceeds/);
  });

  it("reports a missing intent instead of inventing one", async () => {
    await expect(provider().refund({ intentId: "nope" })).rejects.toThrow(
      /No payment intent/,
    );
  });
});
