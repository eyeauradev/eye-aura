import type { MetadataRoute } from "next";

// Production domain confirmed from lib/send-email.ts and app/admin/settings/page.tsx
const SITE_URL = "https://www.eyeaura.co.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Only public marketing pages should be indexed
        allow: ["/", "/services"],
        // Authenticated and internal routes must not be indexed
        disallow: [
          "/admin/",
          "/patient/",
          "/doctor/",
          "/prescription/",
          "/prescriptions/",
          "/invite/",
          "/booking/",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
