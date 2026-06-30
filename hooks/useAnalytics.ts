"use client";

import { useEffect, useRef, useCallback } from "react";
import type { AnalyticsEventPayload } from "@/src/domains/merchant-analytics/types";
import { AnalyticsEventType, DeviceType } from "@/src/domains/merchant-analytics/types/enums";

const ANON_KEY = "paraguay_anon_id";
const SESSION_KEY = "paraguay_session_id";

function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function detectDeviceType(): DeviceType {
  if (typeof window === "undefined") return DeviceType.Unknown;
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return DeviceType.Tablet;
  if (/mobile|android|iphone/.test(ua)) return DeviceType.Mobile;
  return DeviceType.Desktop;
}

// Flush batch to server
async function flushBatch(events: AnalyticsEventPayload[]): Promise<void> {
  if (events.length === 0) return;
  try {
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events),
      keepalive: true,
    });
  } catch {
    // Fire-and-forget; never throw from analytics
  }
}

interface UseAnalyticsOptions {
  merchantId?: string;
  productId?: string;
  storeId?: string;
  buyerId?: string;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const batchRef = useRef<AnalyticsEventPayload[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const track = useCallback(
    (
      eventType: AnalyticsEventType,
      extra: Partial<AnalyticsEventPayload> = {}
    ) => {
      const event: AnalyticsEventPayload = {
        event_type: eventType,
        anonymous_id: getOrCreateAnonymousId(),
        session_id: getOrCreateSessionId(),
        buyer_id: options.buyerId,
        merchant_id: extra.merchant_id ?? options.merchantId,
        product_id: extra.product_id ?? options.productId,
        store_id: extra.store_id ?? options.storeId,
        page_url: typeof window !== "undefined" ? window.location.href : "",
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
        metadata: extra.metadata,
        occurred_at: new Date().toISOString(),
        ...extra,
      };

      batchRef.current.push(event);

      // Auto-flush every 2 seconds
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(() => {
        const batch = batchRef.current.splice(0);
        flushBatch(batch);
      }, 2000);

      // Immediate flush on conversion events
      const HIGH_VALUE = new Set<AnalyticsEventType>([
        AnalyticsEventType.MerchantContactClicked,
        AnalyticsEventType.MerchantWhatsAppClicked,
        AnalyticsEventType.MerchantPhoneClicked,
        AnalyticsEventType.MerchantWebsiteClicked,
        AnalyticsEventType.OfferSaved,
      ]);

      if (HIGH_VALUE.has(eventType)) {
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        const batch = batchRef.current.splice(0);
        flushBatch(batch);
      }
    },
    [options.buyerId, options.merchantId, options.productId, options.storeId]
  );

  // Session management
  useEffect(() => {
    const anonId = getOrCreateAnonymousId();

    // Start session (only if new)
    const isNew = !sessionStorage.getItem("paraguay_session_started");
    if (isNew) {
      sessionStorage.setItem("paraguay_session_started", "1");
      fetch("/api/analytics/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymous_id: anonId,
          buyer_id: options.buyerId ?? undefined,
          device_type: detectDeviceType(),
          browser: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : undefined,
          language: typeof navigator !== "undefined" ? navigator.language : undefined,
          entry_page: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          sessionStorage.setItem(SESSION_KEY, data.session_id);
        }
      }).catch(() => null);
    }

    // Flush remaining batch on page unload
    const handleUnload = () => {
      const batch = batchRef.current.splice(0);
      if (batch.length > 0) flushBatch(batch);
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { track };
}
