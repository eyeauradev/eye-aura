import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ErrorBoundary } from "@/components/error-boundary";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f4f4b",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://eyeaura.com"),
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
  authors: [{ name: "Ms. Harshita", url: "https://eyeaura.com" }],
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
    canonical: "https://eyeaura.com",
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "1254x1254" }],
    shortcut: "/icon.png",
    apple: [{ url: "/eye.png", sizes: "1254x1254", type: "image/png" }],
  },
  openGraph: {
    title: "Eye Aura | Because Every Eye Has A Story",
    description:
      "Eye care designed for modern living: calm online guidance, self-screening concepts, and premium digital wellness.",
    url: "https://eyeaura.com",
    siteName: "Eye Aura",
    images: [
      {
        url: "https://eyeaura.com/eye-aura-logo.png",
        width: 1254,
        height: 1254,
        alt: "Eye Aura — Premium Digital Eye Wellness",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Eye Aura | Because Every Eye Has A Story",
    description:
      "Premium, calming, accessibility-first eye wellness for modern living.",
    images: ["https://eyeaura.com/eye-aura-logo.png"],
    creator: "@eyeaura",
  },
};

// JSON-LD structured data — tells Google your organization logo, site name,
// and search action. This is the primary signal for the Google logo in search results.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://eyeaura.com/#organization",
      name: "Eye Aura",
      url: "https://eyeaura.com",
      logo: {
        "@type": "ImageObject",
        url: "https://eyeaura.com/eye-aura-logo.png",
        width: 1254,
        height: 1254,
      },
      description:
        "Premium digital eye wellness for modern screen-led lives.",
      foundingDate: "2024",
      founder: {
        "@type": "Person",
        name: "Ms. Harshita",
        alumniOf: {
          "@type": "CollegeOrUniversity",
          name: "Amity University",
        },
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+91-7042092967",
        contactType: "customer service",
        availableLanguage: ["English", "Hindi"],
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://eyeaura.com/#website",
      url: "https://eyeaura.com",
      name: "Eye Aura",
      publisher: {
        "@id": "https://eyeaura.com/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://eyeaura.com/?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
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
