/** Prices live as integer fils; this is the only place they become text. */

const AED = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatAed(fils: number): string {
  // Fils are hundredths. Sessions are priced in whole dirhams, so a fractional
  // result means a bad price constant rather than something to round away.
  return AED.format(fils / 100);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} hr` : `${hours.toFixed(1)} hr`;
}
