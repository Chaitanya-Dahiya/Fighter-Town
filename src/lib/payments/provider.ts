/**
 * Payment provider seam.
 *
 * The gateway is not chosen yet — Stripe, Telr and Network International are
 * all live options, and a UAE acquirer usually wins on AED rates. So nothing
 * outside this folder may import a gateway SDK: booking code talks to this
 * interface, and choosing a provider later means writing one adapter, not
 * unpicking checkout.
 *
 * Amounts are integer fils throughout. Money never touches a float.
 */

export type PaymentIntentStatus =
  | "requires_payment"
  | "paid"
  | "refunded"
  | "partially_refunded"
  | "failed";

export type PaymentIntent = {
  /** Our id, stable across providers. */
  id: string;
  bookingId: string;
  amountFils: number;
  refundedFils: number;
  status: PaymentIntentStatus;
  /** The provider's own id, for reconciliation against their dashboard. */
  providerRef: string | null;
  /**
   * Where to send the customer to pay, when the provider is hosted. Null for
   * providers settled off-site (cash or card at the desk).
   */
  checkoutUrl: string | null;
};

export type CreateIntentInput = {
  bookingId: string;
  amountFils: number;
  currency: "AED";
  customerEmail: string;
  description: string;
  /** Where the provider returns the customer after payment. */
  returnUrl: string;
};

export type RefundInput = {
  intentId: string;
  /** Omit to refund the full remaining amount. */
  amountFils?: number;
  reason?: string;
};

/**
 * A provider callback. Adapters normalise their own webhook payload into this
 * before the booking layer sees it, so booking code never learns a gateway's
 * event vocabulary.
 */
export type ProviderEvent = {
  providerRef: string;
  status: PaymentIntentStatus;
  amountFils: number;
  refundedFils: number;
};

export interface PaymentProvider {
  readonly name: string;
  /** False when payment is collected off-site; checkout skips the redirect. */
  readonly isHosted: boolean;

  createIntent(input: CreateIntentInput): Promise<PaymentIntent>;
  getIntent(id: string): Promise<PaymentIntent | null>;
  refund(input: RefundInput): Promise<PaymentIntent>;

  /**
   * Verify and parse a webhook. Returns null when the signature does not
   * check out — an unverified callback must never move a booking to paid.
   */
  parseWebhook(
    rawBody: string,
    signature: string | null,
  ): Promise<ProviderEvent | null>;
}

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly code:
      | "amount_invalid"
      | "intent_not_found"
      | "refund_exceeds_amount"
      | "provider_error",
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

/** Shared validation every adapter should run before calling out. */
export function assertRefundable(
  intent: PaymentIntent,
  amountFils: number,
): void {
  if (amountFils <= 0) {
    throw new PaymentError("Refund amount must be positive", "amount_invalid");
  }
  if (intent.refundedFils + amountFils > intent.amountFils) {
    throw new PaymentError(
      "Refund exceeds the amount captured",
      "refund_exceeds_amount",
    );
  }
}
