# Fightertown Dubai — rebuild architecture

Replaces the Wix site at fightertownsimulators.com. Two goals: a marketing
front end that sells the sensation of the product, and a booking backend that
models the business the Wix calendar could not.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Postgres (Neon) · Drizzle ·
Stripe · Resend · deployed on Vercel.

One app rather than a split front end and API: there are ~10 pages and one real
transaction, so server actions keep booking logic, admin and marketing in a
single deploy while Vercel's edge cache protects the LCP budget that a
heavy-animation site needs.

## Domain

Three physical 6-DOF rigs and a pool of instructors are the constrained
resources. Seven products (`src/domain/experiences.ts`) consume them:

| Product | Duration | Price (AED) | Max pilots | Instructor |
| --- | --- | --- | --- | --- |
| Free Flight | 60m | 380 pp | 3 | — |
| Virtual Pilot Lesson | 60m | 380 | 1 | yes |
| Passenger Ride | 15m | 110 | 1 | — |
| Training | 60m | 380 | 1 | yes |
| Super Carrier Qualification | 4h package | 1600 | 1 | yes |
| Dogfight | 60m | 380 pp | 3 | — |
| DCS Pilots | 60m | 380 | 1 | — |

### Decisions that shape the schema

**Availability is derived, never stored.** Open slots are computed per request
from opening hours minus blackouts minus existing bookings
(`src/domain/availability.ts`, a pure function with no DB or clock of its own).
Pre-generated slot rows rot the moment hours or rig count change.

**Overbooking is prevented in Postgres, not in application code.** An
`EXCLUDE USING gist` constraint on `(resource_id, tstzrange(starts_at, ends_at))`
(`drizzle/0001_overbooking_guard.sql`) makes two concurrent checkouts for the
same rig physically impossible. An app-level "is it free?" check always loses
that race.

**Instructors are resources too.** Lesson, Training and Carrier Qualification
need one, so availability intersects free rigs with free instructors. Skipping
this confirms lessons nobody can teach.

**Hold, then confirm.** Checkout takes a 10-minute `pending` reservation, swept
by cron. Prevents "the slot vanished while I typed my email"; the constraint's
`WHERE (active)` clause releases swept holds without deleting the audit trail.

**Money is integer fils.** No float touches a price. Refunds are bounded by a
check constraint.

**Credits are an append-only ledger.** The 4-hour package and gift vouchers both
grant minutes; sessions consume them. Balance is a sum, so it stays auditable
and a partial refund is a new row rather than a destructive update. An expired
grant stops counting but its past redemptions still subtract.

**Eligibility is a server-side gate.** 15 years / 160cm / 100kg are hard safety
limits on a motion platform, validated on every booking and stored as the
guest's attestation.

**UTC everywhere, `Asia/Dubai` at the edges.**

**Payments behind a `PaymentProvider` interface.** Stripe first; swapping to a
UAE acquirer (Telr, Network International) is one adapter.

## Front end

Layered cockpit parallax: canopy frame and HUD glass fixed, instrument panel on
a slow layer, sky on a fast one, so scrolling reads as the nose pitching down.
F-22 → F-16 → Rafale hand off down the page, each with its own HUD signature
(green / amber / blue).

Constraints that outrank the concept:

- Scroll-driven animation via CSS `animation-timeline: view()` where supported,
  GSAP ScrollTrigger only as fallback — native runs off the main thread and
  holds 60fps on mid-range Android, which JS parallax does not.
- `prefers-reduced-motion` collapses every parallax to a static composite.
- Mobile ships a different hero (single still, subtle gyro tilt), not a scaled
  down version of the desktop rig.
- Hard budget: LCP < 2.5s. AVIF layers, `priority` on the hero only.
- EN/AR routing and RTL-safe layouts from day one via `next-intl`.

Cockpit photography is supplied by the client; layers are named and sized in
`public/heroes/README.md` so real shots drop in without code changes.

## Pages

`/` · `/experiences` · `/experiences/[slug]` · `/book` · `/gift-vouchers` ·
`/contact` · `/admin` (day view across rigs, walk-ins, blackouts, vouchers)

## Build order

1. Schema, availability engine, overbooking constraint, tests ← **done**
2. Design system: HUD tokens, typography, motion primitives
3. Marketing pages and the parallax system
4. Booking flow, payments, admin, vouchers
5. Performance, accessibility, SEO, real content
