import type { Metadata } from "next";
import { ExperienceCard } from "@/components/ui/experience-card";
import { EXPERIENCES, EXPERIENCE_SLUGS } from "@/domain/experiences";
import {
  MAX_WEIGHT_KG,
  MIN_AGE_YEARS,
  MIN_HEIGHT_CM,
} from "@/domain/eligibility";

export const metadata: Metadata = {
  title: "Experiences | Fightertown Dubai",
  description:
    "Seven ways to fly a fighter jet on Dubai's only 6-DOF motion simulators, from a 15-minute passenger ride to a four-hour carrier qualification.",
};

export default function ExperiencesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-24">
      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-hud">
          Our simulators
        </p>
        <h1 className="hud-glow mt-4 text-balance font-sans text-4xl font-extrabold tracking-tight sm:text-5xl">
          Seven ways into the cockpit
        </h1>
        <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">
          Every session runs on a six-degrees-of-freedom motion platform paired
          with VR — the same kind of rig real pilots train on. Sessions are by
          appointment; reserve a slot before you arrive.
        </p>
      </header>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPERIENCE_SLUGS.map((slug) => (
          <ExperienceCard key={slug} experience={EXPERIENCES[slug]} />
        ))}
      </div>

      <EligibilityNotice />
    </main>
  );
}

/**
 * Shown before booking, not buried in a policy page: these are hard safety
 * limits on a motion platform, and a guest who fails one cannot fly at all.
 */
export function EligibilityNotice() {
  const limits = [
    { label: "Minimum age", value: `${MIN_AGE_YEARS} years` },
    { label: "Minimum height", value: `${MIN_HEIGHT_CM} cm` },
    { label: "Maximum weight", value: `${MAX_WEIGHT_KG} kg` },
  ];

  return (
    <aside className="mt-16 rounded-lg border border-border bg-card p-6">
      <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-caution">
        Consider before booking
      </h2>
      <dl className="mt-5 grid gap-6 sm:grid-cols-3">
        {limits.map((l) => (
          <div key={l.label}>
            <dt className="text-xs text-muted-foreground">{l.label}</dt>
            <dd className="mt-1 font-sans text-2xl font-semibold">{l.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        If you wear corrective glasses, contact lenses or small frames work best
        under the headset. Reading glasses are not needed.
      </p>
    </aside>
  );
}
