import type { MetadataRoute } from "next";

// Production domain confirmed from lib/send-email.ts and app/admin/settings/page.tsx
const SITE_URL = "https://www.eyeaura.co.in";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/services`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
