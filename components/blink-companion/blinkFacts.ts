/**
 * Evidence-based eye health tips for the Blink Companion widget.
 * Sources: AAO, AOA, NEI — no fabricated claims.
 */

export interface BlinkFact {
  title: string;
  body: string;
  source: string;
}

export const BLINK_FACTS: BlinkFact[] = [
  {
    title: "👁 Healthy Blink Rate",
    body: "Most adults blink around 15–20 times per minute under normal conditions. During focused screen work, this rate can drop by up to 60%, increasing the risk of dry and uncomfortable eyes.",
    source: "American Academy of Ophthalmology",
  },
  {
    title: "👁 Digital Eye Strain",
    body: "Extended screen use can cause symptoms like eye fatigue, headaches, and blurred vision. Taking regular breaks and consciously blinking helps maintain tear film stability and reduces discomfort.",
    source: "American Optometric Association",
  },
  {
    title: "👁 Complete Your Blinks",
    body: "Incomplete blinks—where the upper lid doesn't fully meet the lower—leave parts of the cornea exposed. Practicing full, deliberate blinks helps spread tears evenly and protects the eye surface.",
    source: "American Academy of Ophthalmology",
  },
  {
    title: "👁 Tear Film & Lubrication",
    body: "Each blink replenishes the tear film, a thin layer of moisture that protects and nourishes the cornea. Reduced blinking allows tears to evaporate faster, potentially leading to irritation and dryness.",
    source: "National Eye Institute",
  },
  {
    title: "👁 The 20-20-20 Rule",
    body: "Every 20 minutes, look at something 20 feet away for at least 20 seconds. This simple habit relaxes the focusing muscles inside the eye and encourages natural blinking patterns.",
    source: "American Optometric Association",
  },
  {
    title: "👁 Preventing Dry Eyes",
    body: "Position your screen slightly below eye level to reduce the exposed eye surface area. Combine this with conscious blinking breaks and adequate hydration to support healthy tear production.",
    source: "National Eye Institute",
  },
];

/** Returns a random fact from the collection. */
export function getRandomFact(): BlinkFact {
  return BLINK_FACTS[Math.floor(Math.random() * BLINK_FACTS.length)];
}
