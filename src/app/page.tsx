import CanopyRevealHero from "@/components/ui/canopy-reveal-hero";
import type { FrameManifest } from "@/lib/frames";
import manifest from "../../public/frames/canopy/manifest.json";

export default function Home() {
  return (
    <main>
      <CanopyRevealHero
        manifest={manifest as FrameManifest}
        airframe="f22"
        headline="Dubai's only 6-DOF fighter jet simulators"
        subhead="Six degrees of freedom, full VR, and the roar of the engines. Step into the cockpit at Dubai Investment Park."
      >
        <a
          href="/book"
          className="inline-flex items-center rounded-lg border border-hud-dim bg-hud-glow px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-hud transition-colors duration-[var(--dur-base)] hover:bg-hud hover:text-background"
        >
          Reserve a slot
        </a>
      </CanopyRevealHero>

      <section className="mx-auto max-w-3xl px-6 py-32 text-center">
        <p className="text-muted-foreground">
          Experience grid, facilities and booking flow land in the next step.
        </p>
      </section>
    </main>
  );
}
