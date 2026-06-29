import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { ObservabilityService } from "@/src/domains/trust/brain";

export async function GET() {
  const obs = new ObservabilityService("health-check");
  const start = Date.now();

  const client = getSupabaseServiceClient();

  const checks: Record<string, boolean> = {
    merchant_trust: false,
    trust_signals: false,
    merchant_reviews: false,
    merchant_timeline: false,
    trust_events: false,
  };

  await Promise.allSettled([
    client.from("merchant_trust").select("id").limit(1).then(({ error }) => {
      checks.merchant_trust = !error;
    }),
    client.from("trust_signals").select("id").limit(1).then(({ error }) => {
      checks.trust_signals = !error;
    }),
    client.from("merchant_reviews").select("id").limit(1).then(({ error }) => {
      checks.merchant_reviews = !error;
    }),
    client.from("merchant_timeline").select("id").limit(1).then(({ error }) => {
      checks.merchant_timeline = !error;
    }),
    client.from("merchant_trust_events").select("id").limit(1).then(({ error }) => {
      checks.trust_events = !error;
    }),
  ]);

  const latencyMs = Date.now() - start;
  const result = obs.buildHealthCheck(checks, latencyMs);

  obs.log("info", "Health check completed", { latencyMs, status: result.status });

  const statusCode = result.status === "healthy" ? 200 : result.status === "degraded" ? 207 : 503;
  return NextResponse.json({ data: result }, { status: statusCode });
}
