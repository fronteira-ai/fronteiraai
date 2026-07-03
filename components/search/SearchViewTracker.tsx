"use client";

import { useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";

// Invisible client island on /search — same convention as
// ProductViewTracker/StoreViewTracker. Only fires when there's an actual
// query (an empty /search visit isn't a "search performed").
export default function SearchViewTracker({ query }: { query: string }) {
  const { track } = useAnalytics();

  useEffect(() => {
    if (!query) return;
    track(AnalyticsEventType.SearchPerformed, { search_query: query });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return null;
}
