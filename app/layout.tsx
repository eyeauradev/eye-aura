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
};

export const metadata: Metadata = {
  metadataBase: new URL("https://eyeaura.com"),
  icons: {
    icon: "/eye.png",
    shortcut: "/eye.png",
    apple: "/eye.png",
  },
  title: {
    default: "Eye Aura | Vision Care Anywhere",
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
  openGraph: {
    title: "Eye Aura | Vision Care Anywhere",
    description:
      "Eye care designed for modern living: calm online guidance, self-screening concepts, and premium digital wellness.",
    url: "https://eyeaura.com",
    siteName: "Eye Aura",
    images: [
      {
        url: "/eye-aura-logo.png",
        width: 1200,
        height: 1200,
        alt: "Eye Aura logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eye Aura | Vision Care Anywhere",
    description:
      "Premium, calming, accessibility-first eye wellness for modern living.",
    images: ["/eye-aura-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
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
