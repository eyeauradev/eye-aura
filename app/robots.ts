import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/services"],
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
    sitemap: "https://eyeaura.com/sitemap.xml",
  };
}
