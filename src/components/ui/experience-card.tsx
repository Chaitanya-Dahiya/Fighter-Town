import Link from "next/link";
import { EXPERIENCE_CONTENT } from "@/content/experiences";
import { chargeableFils, type Experience } from "@/domain/experiences";
import { formatAed, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One product on the grid. The card carries its airframe signature, so a row of
 * cards reads as a row of different aircraft rather than a uniform list.
 */
export function ExperienceCard({
  experience,
  className,
}: {
  experience: Experience;
  className?: string;
}) {
  const content = EXPERIENCE_CONTENT[experience.slug];
  const isPackage = experience.packageMinutes !== null;

  return (
    <Link
      href={`/experiences/${experience.slug}`}
      data-airframe={experience.airframe}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card p-6",
        "transition-colors duration-[var(--dur-base)] hover:border-hud-dim",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[var(--dur-slow)] group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, hsl(var(--hud) / 0.14), transparent 70%)",
        }}
      />

      <div className="relative flex items-baseline justify-between gap-4">
        <h3 className="font-sans text-lg font-bold tracking-tight text-foreground">
          {content.name}
        </h3>
        <span className="shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-hud">
          {isPackage
            ? formatDuration(experience.packageMinutes!)
            : formatDuration(experience.durationMin)}
        </span>
      </div>

      <p className="relative mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {content.tagline}
      </p>

      <div className="relative mt-6 flex items-end justify-between gap-4 border-t border-border pt-4">
        <div>
          <div className="font-sans text-xl font-semibold text-foreground">
            {formatAed(experience.priceFils)}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {isPackage
              ? "package, usable across visits"
              : experience.maxPilots > 1
                ? `per person · up to ${experience.maxPilots} pilots`
                : "per person"}
          </div>
        </div>
        {experience.requiresInstructor && (
          <span className="shrink-0 rounded border border-hud-dim px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-hud">
            Instructor
          </span>
        )}
      </div>
    </Link>
  );
}

/** Total shown before checkout, so the grid and the booking flow agree. */
export function partyTotal(experience: Experience, pilots: number): string {
  return formatAed(chargeableFils(experience, pilots));
}
