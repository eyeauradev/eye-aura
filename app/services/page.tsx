import type { Metadata } from "next";
import ServicesClient from "./ServicesClient";

// Production domain confirmed from lib/send-email.ts and app/admin/settings/page.tsx
const SITE_URL = "https://www.eyeaura.co.in";

export const metadata: Metadata = {
  title: "Eye Care Services",
  description:
    "Explore Eye Aura's digital eye care services: online consultations, visual acuity screening, and contact lens guidance — all from home.",
  alternates: {
    canonical: `${SITE_URL}/services`,
  },
  openGraph: {
    title: "Eye Care Services | Eye Aura",
    description:
      "Book an online eye consultation, screen your vision, or get contact lens guidance — all from home.",
    url: `${SITE_URL}/services`,
    images: [
      {
        url: `${SITE_URL}/eye-aura-logo.png`,
        width: 1254,
        height: 1254,
        alt: "Eye Aura — Premium Digital Eye Wellness",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Eye Care Services | Eye Aura",
    description:
      "Book an online eye consultation, screen your vision, or get contact lens guidance — all from home.",
    images: [`${SITE_URL}/eye-aura-logo.png`],
  },
};

export default function ServicesPage() {
  return <ServicesClient />;
}
