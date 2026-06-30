import type { AnalyticsEventType, DeviceType, FunnelStep, AnalyticsWindow } from "./enums";

// ── Raw event (inbound from client) ──────────────────────────────────────────

export interface AnalyticsEventPayload {
  event_type: AnalyticsEventType;
  anonymous_id: string;
  session_id?: string;
  buyer_id?: string;
  merchant_id?: string;
  store_id?: string;
  product_id?: string;
  search_query?: string;
  page_url: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
  occurred_at?: string;
}

// ── Stored event (DB row) ─────────────────────────────────────────────────────

export interface StoredAnalyticsEvent {
  id: string;
  event_type: AnalyticsEventType;
  session_id: string | null;
  buyer_id: string | null;
  anonymous_id: string;
  merchant_id: string | null;
  store_id: string | null;
  product_id: string | null;
  search_query: string | null;
  page_url: string;
  referrer: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

// ── Session ───────────────────────────────────────────────────────────────────

export interface SessionPayload {
  anonymous_id: string;
  buyer_id?: string;
  device_type?: DeviceType;
  browser?: string;
  country?: string;
  city?: string;
  language?: string;
  entry_page?: string;
}

export interface StoredSession {
  id: string;
  buyer_id: string | null;
  anonymous_id: string;
  device_type: DeviceType | null;
  browser: string | null;
  country: string | null;
  city: string | null;
  language: string | null;
  entry_page: string | null;
  exit_page: string | null;
  event_count: number;
  started_at: string;
  last_event_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

// ── Event Stream ──────────────────────────────────────────────────────────────

export interface EventStream {
  session_id: string;
  anonymous_id: string;
  events: Array<{
    event_type: AnalyticsEventType;
    occurred_at: string;
    page_url: string;
    merchant_id: string | null;
    product_id: string | null;
    metadata: Record<string, unknown>;
  }>;
  journey_steps: string[];
  total_events: number;
  duration_seconds: number | null;
}

// ── Funnel ────────────────────────────────────────────────────────────────────

export interface FunnelStepResult {
  step: FunnelStep;
  label: string;
  count: number;
  drop_rate: number | null;
  conversion_rate: number | null;
}

export interface FunnelResult {
  window: AnalyticsWindow;
  merchant_id: string | null;
  steps: FunnelStepResult[];
  overall_conversion: number;
  generated_at: string;
}

// ── Merchant Analytics ────────────────────────────────────────────────────────

export interface MerchantAnalyticsSummary {
  merchant_id: string;
  window: AnalyticsWindow;
  views: number;
  unique_visitors: number;
  product_impressions: number;
  product_clicks: number;
  contact_clicks: number;
  whatsapp_clicks: number;
  phone_clicks: number;
  website_clicks: number;
  offer_saves: number;
  ctr: number;
  generated_at: string;
}

export interface ProductAnalyticsRow {
  product_id: string;
  product_name: string | null;
  impressions: number;
  clicks: number;
  saves: number;
  ctr: number;
}

export interface ProductAnalyticsResult {
  merchant_id: string;
  window: AnalyticsWindow;
  products: ProductAnalyticsRow[];
  total_analyzed: number;
  generated_at: string;
}

export interface TrafficSource {
  source: string;
  visits: number;
  percentage: number;
}

export interface HourlyDistribution {
  hour: number;
  events: number;
}

export interface TrafficAnalyticsResult {
  merchant_id: string;
  window: AnalyticsWindow;
  total_visits: number;
  sources: TrafficSource[];
  hourly_distribution: HourlyDistribution[];
  generated_at: string;
}

// ── Observability ─────────────────────────────────────────────────────────────

export interface AnalyticsHealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  event_count_last_hour: number;
  session_count_last_hour: number;
  dead_events: number;
  duplicate_rate: number;
  latency_ms: number;
  checked_at: string;
}
