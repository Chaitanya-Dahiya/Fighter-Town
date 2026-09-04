-- The rule that makes double-booking impossible.
--
-- Application-level "is this slot free?" checks always lose the race: two
-- checkouts read the same empty slot microseconds apart and both insert. The
-- only reliable place to enforce it is the database, so we let Postgres refuse
-- the second write outright.
--
-- Run this after the generated schema migration.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A resource may hold at most one *active* reservation over any instant.
-- Cancelled bookings and swept holds set active = false and drop out of the
-- constraint, freeing the slot without deleting the audit trail.
ALTER TABLE booking_resources
  ADD CONSTRAINT booking_resources_no_overlap
  EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (active);

-- Half-open ranges above mean a session ending at 14:00 and one starting at
-- 14:00 do not collide, matching the availability engine's overlap rule.

ALTER TABLE booking_resources
  ADD CONSTRAINT booking_resources_positive_duration
  CHECK (ends_at > starts_at);

ALTER TABLE bookings
  ADD CONSTRAINT bookings_positive_duration CHECK (ends_at > starts_at);

-- A pending booking must carry an expiry, or an abandoned checkout would hold
-- a rig forever.
ALTER TABLE bookings
  ADD CONSTRAINT bookings_pending_has_hold
  CHECK (status <> 'pending' OR hold_expires_at IS NOT NULL);

ALTER TABLE payments
  ADD CONSTRAINT payments_refund_within_amount
  CHECK (refunded_fils >= 0 AND refunded_fils <= amount_fils);

-- Sweeping expired holds (cron, every minute):
--   UPDATE booking_resources br SET active = false
--     FROM bookings b
--    WHERE br.booking_id = b.id
--      AND b.status = 'pending'
--      AND b.hold_expires_at < now();
--   UPDATE bookings SET status = 'cancelled'
--    WHERE status = 'pending' AND hold_expires_at < now();
