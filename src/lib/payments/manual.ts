/**
 * Pay-at-the-desk adapter.
 *
 * This is the honest default until a gateway is chosen, and it is not a stub:
 * it is exactly how Fightertown takes money today — the guest books online and
 * pays on arrival. Staff mark the booking paid from /admin, which calls
 * `settle`. Swapping in a real gateway later changes one line of wiring.
 */

import {
  assertRefundable,
  PaymentError,
  type CreateIntentInput,
  type PaymentIntent,
  type PaymentProvider,
  type ProviderEvent,
  type RefundInput,
} from "./provider";

export interface IntentStore {
  put(intent: PaymentIntent): Promise<void>;
  get(id: string): Promise<PaymentIntent | null>;
}

/** In-memory store, for tests and local development only. */
export class MemoryIntentStore implements IntentStore {
  private readonly rows = new Map<string, PaymentIntent>();
  async put(intent: PaymentIntent) {
    this.rows.set(intent.id, { ...intent });
  }
  async get(id: string) {
    const row = this.rows.get(id);
    return row ? { ...row } : null;
  }
}

export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual";
  readonly isHosted = false;

  constructor(
    private readonly store: IntentStore,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  async createIntent(input: CreateIntentInput): Promise<PaymentIntent> {
    if (!Number.isInteger(input.amountFils) || input.amountFils <= 0) {
      throw new PaymentError(
        "Amount must be a positive integer in fils",
        "amount_invalid",
      );
    }
    const intent: PaymentIntent = {
      id: this.newId(),
      bookingId: input.bookingId,
      amountFils: input.amountFils,
      refundedFils: 0,
      status: "requires_payment",
      providerRef: null,
      checkoutUrl: null,
    };
    await this.store.put(intent);
    return intent;
  }

  async getIntent(id: string): Promise<PaymentIntent | null> {
    return this.store.get(id);
  }

  /** Staff action: money changed hands at the desk. */
  async settle(id: string, reference: string): Promise<PaymentIntent> {
    const intent = await this.require(id);
    const settled: PaymentIntent = {
      ...intent,
      status: "paid",
      providerRef: reference,
    };
    await this.store.put(settled);
    return settled;
  }

  async refund({ intentId, amountFils }: RefundInput): Promise<PaymentIntent> {
    const intent = await this.require(intentId);
    if (intent.status === "requires_payment") {
      throw new PaymentError("Nothing captured to refund", "provider_error");
    }
    const amount = amountFils ?? intent.amountFils - intent.refundedFils;
    assertRefundable(intent, amount);

    const refundedFils = intent.refundedFils + amount;
    const refunded: PaymentIntent = {
      ...intent,
      refundedFils,
      status: refundedFils >= intent.amountFils ? "refunded" : "partially_refunded",
    };
    await this.store.put(refunded);
    return refunded;
  }

  /** No callbacks exist for desk payments. */
  async parseWebhook(): Promise<ProviderEvent | null> {
    return null;
  }

  private async require(id: string): Promise<PaymentIntent> {
    const intent = await this.store.get(id);
    if (!intent) {
      throw new PaymentError(`No payment intent ${id}`, "intent_not_found");
    }
    return intent;
  }
}
