import Link from "next/link";
import AirframeSection from "@/components/ui/airframe-section";
import CanopyRevealHero from "@/components/ui/canopy-reveal-hero";
import { ExperienceCard } from "@/components/ui/experience-card";
import { EXPERIENCES, EXPERIENCE_SLUGS } from "@/domain/experiences";
import type { FrameManifest } from "@/lib/frames";
import manifest from "../../public/frames/canopy/manifest.json";

const CTA =
  "inline-flex items-center rounded-lg border border-hud-dim bg-hud-glow px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-hud transition-colors duration-[var(--dur-base)] hover:bg-hud hover:text-background";

/** Sky drifts furthest, panel barely moves, canopy frame is pinned. */
function layers(airframe: string) {
  return [
    { src: `/layers/${airframe}/sky.avif`, depth: 90, scale: 1.15 },
    { src: `/layers/${airframe}/panel.avif`, depth: 24, scale: 1.05 },
    { src: `/layers/${airframe}/canopy.avif`, depth: 0 },
  ];
}

export default function Home() {
  return (
    <main>
      <CanopyRevealHero
        manifest={manifest as FrameManifest}
        airframe="f22"
        headline="Dubai's only 6-DOF fighter jet simulators"
        subhead="Six degrees of freedom, full VR, and the roar of the engines. Step into the cockpit at Dubai Investment Park."
      >
        <Link href="/book" className={CTA}>
          Reserve a slot
        </Link>
      </CanopyRevealHero>

      <AirframeSection
        airframe="f16"
        eyebrow="Motion, not simulation"
        headline="Every pitch, roll and yaw, felt"
        body="Six degrees of freedom means the platform moves the way the aircraft does — the push of thrust, the load in a hard turn, the settle as the gear touches. Paired with VR, there is nothing left telling you that you are still on the ground."
        layers={layers("f16")}
      >
        <Link href="/experiences" className={CTA}>
          See the experiences
        </Link>
      </AirframeSection>

      <section className="mx-auto max-w-6xl px-6 py-28">
        <h2 className="hud-glow text-balance font-sans text-3xl font-extrabold tracking-tight sm:text-4xl">
          Choose your sortie
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXPERIENCE_SLUGS.map((slug) => (
            <ExperienceCard key={slug} experience={EXPERIENCES[slug]} />
          ))}
        </div>
      </section>

      <AirframeSection
        airframe="rafale"
        eyebrow="Dubai Investment Park 1"
        headline="Find us at Schon Business Park"
        body="Central Plaza Building, Office 35, Zone 2, Ground Floor, 72 Street, DIP-1. Free basement parking. Sessions run by appointment only — reserve a time slot before you arrive, no payment needed online."
        layers={layers("rafale")}
      >
        <Link href="/contact" className={CTA}>
          Get in touch
        </Link>
      </AirframeSection>
    </main>
  );
}
