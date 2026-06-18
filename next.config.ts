import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  outputFileTracingRoot: path.resolve("."),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";

    // In development, Next.js Fast Refresh (react-refresh) requires 'unsafe-eval'
    // for hot module replacement. Production builds never use eval().
    const scriptSrc = isDev
      ? "'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://checkout.razorpay.com https://apis.google.com https://accounts.google.com"
      : "'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://checkout.razorpay.com https://apis.google.com https://accounts.google.com";

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc}`,
              `script-src-elem ${scriptSrc}`,
              // Next.js injects inline <style> tags; 'unsafe-inline' is required here.
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://region1.google-analytics.com https://firebaseinstallations.googleapis.com https://firebase.googleapis.com https://app-measurement.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://accounts.google.com",
              "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https://www.gstatic.com https://*.googleusercontent.com",
              "frame-src https://api.razorpay.com https://www.googletagmanager.com https://accounts.google.com https://apis.google.com",
              "worker-src 'self' blob:",
            ].join("; "),
          },
          {
            // Next.js 13+ defaults to same-origin which severs window.opener,
            // breaking Firebase signInWithPopup(). same-origin-allow-popups
            // preserves opener access for the OAuth popup while keeping COOP
            // protection for all other cross-origin navigations.
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
