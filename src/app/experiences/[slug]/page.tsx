import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EXPERIENCE_CONTENT } from "@/content/experiences";
import {
  EXPERIENCE_SLUGS,
  getExperience,
  type ExperienceSlug,
} from "@/domain/experiences";
import { formatAed, formatDuration } from "@/lib/format";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return EXPERIENCE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const content = EXPERIENCE_CONTENT[slug as ExperienceSlug];
  if (!content) return {};
  return {
    title: `${content.name} | Fightertown Dubai`,
    description: content.tagline,
  };
}

export default async function ExperiencePage({ params }: Params) {
  const { slug } = await params;
  const experience = getExperience(slug);
  if (!experience) notFound();

  const content = EXPERIENCE_CONTENT[experience.slug];
  const isPackage = experience.packageMinutes !== null;

  const specs = [
    {
      label: isPackage ? "Package" : "Duration",
      value: formatDuration(experience.packageMinutes ?? experience.durationMin),
    },
    {
      label: "Price",
      value: formatAed(experience.priceFils),
      note: isPackage ? "usable across visits" : "per person",
    },
    {
      label: "Pilots",
      value: String(experience.maxPilots),
      note: experience.maxPilots > 1 ? "flying together" : "per session",
    },
    {
      label: "Instructor",
      value: experience.requiresInstructor ? "Included" : "Not required",
    },
  ];

  return (
    <main data-airframe={experience.airframe} className="mx-auto max-w-4xl px-6 py-24">
      <Link
        href="/experiences"
        className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-hud"
      >
        ← All experiences
      </Link>

      <h1 className="hud-glow mt-8 text-balance font-sans text-4xl font-extrabold tracking-tight sm:text-5xl">
        {content.name}
      </h1>
      <p className="mt-4 text-pretty text-lg text-muted-foreground">
        {content.tagline}
      </p>

      <dl className="mt-12 grid gap-6 border-y border-border py-8 sm:grid-cols-4">
        {specs.map((s) => (
          <div key={s.label}>
            <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-hud">
              {s.label}
            </dt>
            <dd className="mt-2 font-sans text-xl font-semibold">{s.value}</dd>
            {s.note && (
              <dd className="mt-0.5 text-xs text-muted-foreground">{s.note}</dd>
            )}
          </div>
        ))}
      </dl>

      <div className="mt-10 max-w-2xl space-y-5 leading-relaxed text-muted-foreground">
        <p>{content.body}</p>
        <p>
          <span className="text-foreground">Suited to: </span>
          {content.suitedTo}
        </p>
      </div>

      <Link
        href={`/book?experience=${experience.slug}`}
        className="mt-12 inline-flex items-center rounded-lg border border-hud-dim bg-hud-glow px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-hud transition-colors duration-[var(--dur-base)] hover:bg-hud hover:text-background"
      >
        Reserve a slot
      </Link>
    </main>
  );
}
