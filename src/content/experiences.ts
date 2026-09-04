/**
 * Marketing copy, kept apart from the domain rules in src/domain/experiences.ts.
 * Pricing, duration and capacity have one source of truth there; this file only
 * describes how each product is sold.
 */

import type { ExperienceSlug } from "@/domain/experiences";

export type ExperienceContent = {
  name: string;
  /** One line on the card. */
  tagline: string;
  /** Two or three sentences on the detail page. */
  body: string;
  /** What a first-timer should know before choosing this one. */
  suitedTo: string;
};

export const EXPERIENCE_CONTENT: Record<ExperienceSlug, ExperienceContent> = {
  "free-flight": {
    name: "Free Flight",
    tagline: "Get used to your fighter's controls and explore the skies.",
    body: "Your own aircraft, your own airspace, no objectives. Take off, find out what the airframe does when you pull hard, and fly until the hour runs out. Up to three of you can fly together in the same sky.",
    suitedTo: "First-timers, and anyone who wants the cockpit without a syllabus.",
  },
  "virtual-pilot-lesson": {
    name: "Virtual Pilot Lesson",
    tagline: "Learn to fly a fighter jet, with an instructor in the same cockpit.",
    body: "Two simulators are linked to one aircraft, so you and your instructor see and control the same jet in real time. They demonstrate, you take the controls, and the aircraft never leaves the lesson.",
    suitedTo: "Anyone who wants to actually learn, not just experience.",
  },
  "passenger-ride": {
    name: "Passenger Ride",
    tagline: "Fifteen minutes over Dubai in the back seat of an F-14 Tomcat.",
    body: "Strap into the US Navy's most famous interceptor and take in the city from altitude. No training, no controls, no preparation — the shortest route from the door to the sky.",
    suitedTo: "Groups, gifts, and anyone unsure about committing to an hour.",
  },
  training: {
    name: "Training",
    tagline: "Pick a discipline and drill it in the F/A-18 Hornet.",
    body: "Approaches and landings, weapons employment, formation, emergencies — you choose the topic and an instructor builds the hour around it. Come back for a different one.",
    suitedTo: "Return visitors who know which part they want to get better at.",
  },
  "super-carrier-qualification": {
    name: "Super Carrier Qualification",
    tagline: "Four hours to the catapult, the break, and the wire.",
    body: "The hardest thing in naval aviation, taught properly. Work through the pattern, the ball, and the trap until you can bring the Hornet aboard. The four hours are yours to spend across as many visits as you need.",
    suitedTo: "Committed pilots. This is a course, not a session.",
  },
  dogfight: {
    name: "Dogfight",
    tagline: "Arm your weapons and fight — AI opponents, or each other.",
    body: "Merge, turn, and try to get a shot off before the other aircraft does. Fly solo against AI or bring up to two friends and settle it between you.",
    suitedTo: "Groups who want a winner at the end of the hour.",
  },
  "dcs-pilots": {
    name: "DCS Pilots",
    tagline: "Your DCS World missions, on a full-motion platform.",
    body: "You already know the aircraft. Fly your own missions, or join a DCS server, with six degrees of freedom and VR underneath you instead of a desk chair.",
    suitedTo: "Experienced DCS players bringing their own flight plan.",
  },
};
