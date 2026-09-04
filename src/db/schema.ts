import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** All timestamps are stored UTC and rendered in Asia/Dubai at the edges. */
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const resourceKind = pgEnum("resource_kind", ["rig", "instructor"]);
export const bookingStatus = pgEnum("booking_status", [
  "pending", // held while the guest pays; expires
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);
export const paymentStatus = pgEnum("payment_status", [
  "requires_payment",
  "paid",
  "refunded",
  "partially_refunded",
  "failed",
]);
export const creditSource = pgEnum("credit_source", [
  "package_purchase",
  "gift_voucher",
  "goodwill",
]);

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: resourceKind("kind").notNull(),
  label: text("label").notNull(), // "Rig 2", "Capt. Farid"
  active: boolean("active").notNull().default(true),
});

/** Recurring weekly opening hours, in Dubai local minutes-from-midnight. */
export const openingHours = pgTable("opening_hours", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekday: smallint("weekday").notNull(), // 0 = Sunday
  opensMin: smallint("opens_min").notNull(),
  closesMin: smallint("closes_min").notNull(),
});

/** Maintenance, private hire, holidays — subtracted from the opening window. */
export const blackouts = pgTable(
  "blackouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id").references(() => resources.id),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    reason: text("reason"),
  },
  (t) => [index("blackouts_window_idx").on(t.startsAt, t.endsAt)],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    locale: text("locale").notNull().default("en"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customers_email_idx").on(t.email)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull(), // human-quotable, e.g. FT-7QK2M
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    experienceSlug: text("experience_slug").notNull(),
    pilots: smallint("pilots").notNull(),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    status: bookingStatus("status").notNull().default("pending"),
    /** Pending holds past this instant are swept and their slots released. */
    holdExpiresAt: ts("hold_expires_at"),
    /** Per-pilot age/height/weight attestations captured at booking time. */
    eligibility: jsonb("eligibility").notNull(),
    notes: text("notes"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bookings_reference_idx").on(t.reference),
    index("bookings_window_idx").on(t.startsAt, t.endsAt),
    index("bookings_status_idx").on(t.status),
  ],
);

/**
 * One row per resource occupied by a booking. The exclusion constraint that
 * actually prevents double-booking lives on this table — see
 * drizzle/0000_init.sql; Drizzle cannot express EXCLUDE.
 */
export const bookingResources = pgTable(
  "booking_resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    /** Denormalised from bookings so the constraint can ignore dead holds. */
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("booking_resources_lookup_idx").on(t.resourceId, t.startsAt)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    provider: text("provider").notNull().default("stripe"),
    providerRef: text("provider_ref"), // PaymentIntent id
    /** AED fils. Integers only — money never touches a float. */
    amountFils: integer("amount_fils").notNull(),
    refundedFils: integer("refunded_fils").notNull().default(0),
    status: paymentStatus("status").notNull().default("requires_payment"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payments_provider_ref_idx").on(t.provider, t.providerRef)],
);

/** Append-only ledger backing package credits and gift vouchers. */
export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    minutes: integer("minutes").notNull(), // + grants, - consumes
    source: creditSource("source").notNull(),
    bookingId: uuid("booking_id").references(() => bookings.id),
    voucherId: uuid("voucher_id"),
    expiresAt: ts("expires_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("credit_tx_customer_idx").on(t.customerId)],
);

export const vouchers = pgTable(
  "vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    minutes: integer("minutes").notNull(),
    purchaserId: uuid("purchaser_id").references(() => customers.id),
    redeemedById: uuid("redeemed_by_id").references(() => customers.id),
    redeemedAt: ts("redeemed_at"),
    expiresAt: ts("expires_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("vouchers_code_idx").on(t.code)],
);
