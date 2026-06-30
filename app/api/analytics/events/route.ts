import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createAnalyticsServices } from "@/lib/analytics-factory";
import type { AnalyticsEventPayload } from "@/src/domains/merchant-analytics/types";

// Simple in-memory rate limit: IP → timestamp[]
const rateLimitMap = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return true;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const serviceClient = getSupabaseServiceClient();
  const { eventPlatform } = createAnalyticsServices(serviceClient);

  // Batch or single
  if (Array.isArray(body)) {
    const result = await eventPlatform.processBatch(body as AnalyticsEventPayload[]);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  }

  const result = await eventPlatform.processEvent(body as AnalyticsEventPayload);
  return NextResponse.json(result, { status: result.success ? 201 : 400 });
}
