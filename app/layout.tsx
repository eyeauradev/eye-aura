import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";

export const metadata: Metadata = {
  metadataBase: new URL("https://eyeaura.com"),
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
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
