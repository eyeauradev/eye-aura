"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import {
  initAnalytics,
  trackPageView,
} from "@/services/analytics/analytics.service";

function AnalyticsTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize analytics once on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Track page views on route change (including first load)
  useEffect(() => {
    if (!pathname) return;
    const fullPath = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    trackPageView({
      page_path: fullPath,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

// Suspense boundary is required because useSearchParams() requires a
// Suspense boundary in Next.js App Router during static rendering.
export function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerInner />
    </Suspense>
  );
}
