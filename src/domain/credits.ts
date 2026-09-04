/**
 * Package credits (Super Carrier Qualification) and gift vouchers share one
 * append-only ledger. Balance is a sum over transactions rather than a mutable
 * column, so every grant, redemption and refund stays auditable and a partial
 * refund is a new row instead of a destructive update.
 */

export type CreditSource = "package_purchase" | "gift_voucher" | "goodwill";

export type CreditTransaction = {
  id: string;
  accountId: string;
  /** Positive grants minutes, negative consumes them. */
  minutes: number;
  source: CreditSource;
  bookingId: string | null;
  createdAt: Date;
  expiresAt: Date | null;
};

export function balanceMinutes(
  transactions: CreditTransaction[],
  asOf: Date,
): number {
  return transactions.reduce((total, t) => {
    // An expired grant stops counting; a redemption against it already
    // happened and must still be subtracted.
    if (t.minutes > 0 && t.expiresAt && t.expiresAt <= asOf) return total;
    return total + t.minutes;
  }, 0);
}

export function canRedeem(
  transactions: CreditTransaction[],
  minutes: number,
  asOf: Date,
): boolean {
  return minutes > 0 && balanceMinutes(transactions, asOf) >= minutes;
}
