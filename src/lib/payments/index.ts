import { ManualPaymentProvider, MemoryIntentStore } from "./manual";
import type { PaymentProvider } from "./provider";

export * from "./provider";
export { ManualPaymentProvider, MemoryIntentStore } from "./manual";

let cached: PaymentProvider | null = null;

/**
 * The provider the app runs on. Selected by env so adding a gateway is a new
 * case here plus an adapter file — no change in booking code.
 */
export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;

  switch (process.env.PAYMENT_PROVIDER ?? "manual") {
    case "manual":
      // MemoryIntentStore is deliberate: until a gateway is chosen there is no
      // schema decision to freeze. The `payments` table already exists, so the
      // real store is a small adapter over it when the time comes.
      cached = new ManualPaymentProvider(new MemoryIntentStore());
      return cached;
    default:
      throw new Error(
        `Unknown PAYMENT_PROVIDER "${process.env.PAYMENT_PROVIDER}"`,
      );
  }
}
