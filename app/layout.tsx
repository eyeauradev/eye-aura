import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ErrorBoundary } from "@/components/error-boundary";

// Production domain confirmed from lib/send-email.ts (noreply@eyeaura.co.in)
// and admin/settings/page.tsx (notificationEmail: "noreply@eyeaura.co.in")
const SITE_URL = "https://www.eyeaura.co.in";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f4f4b",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Eye Aura | Because Every Eye Has A Story",
    template: "%s | Eye Aura",
  },
  description:
    "Premium digital eye wellness for modern screen-led lives. Calm, accessible online guidance for tired, dry, and overworked eyes.",
  keywords: [
    "Eye Aura",
    "digital eye wellness",
    "online eye consultation",
    "screen fatigue",
    "visual acuity screening",
    "contact lens consultation",
  ],
  authors: [{ name: "Ms. Harshita", url: SITE_URL }],
  creator: "Eye Aura",
  publisher: "Eye Aura",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  // app/icon.png exists (1254×1254px) — Next.js App Router serves it automatically.
  // Explicit declaration here ensures shortcut and apple-touch fallbacks are correct.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/icon.png", sizes: "1254x1254", type: "image/png" }],
  },
  openGraph: {
    title: "Eye Aura | Because Every Eye Has A Story",
    description:
      "Eye care designed for modern living: calm online guidance, self-screening concepts, and premium digital wellness.",
    url: SITE_URL,
    siteName: "Eye Aura",
    images: [
      {
        url: `${SITE_URL}/eye-aura-logo.png`,
        width: 1254,
        height: 1254,
        alt: "Eye Aura — Premium Digital Eye Wellness",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    // No verified Twitter/X handle found in codebase — creator field omitted
    card: "summary",
    title: "Eye Aura | Because Every Eye Has A Story",
    description:
      "Premium, calming, accessibility-first eye wellness for modern living.",
    images: [`${SITE_URL}/eye-aura-logo.png`],
  },
};

// JSON-LD structured data
// This is the primary Google signal for showing the Eye Aura logo in search results.
// All values are sourced from the actual codebase:
//   - url/logo: production domain confirmed via send-email.ts + admin settings
//   - telephone: confirmed in FinalCTA.tsx, FooterSection.tsx, PrescriptionTemplate.tsx
//   - sameAs Instagram: confirmed in FooterSection.tsx
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Eye Aura",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/eye-aura-logo.png`,
        width: 1254,
        height: 1254,
      },
      description:
        "Premium digital eye wellness for modern screen-led lives.",
      // telephone confirmed from FinalCTA.tsx and FooterSection.tsx
      telephone: "+91-7042092967",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+91-7042092967",
        contactType: "customer service",
      },
      // sameAs confirmed from FooterSection.tsx social links
      sameAs: ["https://www.instagram.com/eyeaura.co.in"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Eye Aura",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      // SearchAction omitted — no site search feature exists in this project
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      {gaId && <GoogleAnalytics gaId={gaId} />}
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <AnalyticsProvider />
        </Suspense>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <ErrorBoundary>{children}</ErrorBoundary>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
