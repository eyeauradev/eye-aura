import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eye Aura",
    short_name: "Eye Aura",
    description:
      "Premium digital eye wellness for modern screen-led lives.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f2ec",
    theme_color: "#0f4f4b",
    icons: [
      {
        src: "/eye.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/eye.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
