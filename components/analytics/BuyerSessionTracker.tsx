"use client";

import { useAnalytics } from "@/hooks/useAnalytics";

// Mounted once in the root layout, next to <Analytics /> (GA4/Clarity) —
// same "global client island in app/layout.tsx" pattern, different purpose.
// useAnalytics()'s own effect creates the buyer_sessions row on mount; no
// track() call needed here. Page-specific components call useAnalytics()
// themselves (e.g. ProductViewTracker, MerchantViewTracker) to log
// buyer_events — this component's only job is guaranteeing a session
// exists on every page, including ones with no other analytics call site.
export default function BuyerSessionTracker() {
  useAnalytics();
  return null;
}
