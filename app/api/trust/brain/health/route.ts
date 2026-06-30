import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { ObservabilityService } from "@/src/domains/trust/brain";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function GET() {
  const obs = new ObservabilityService("health-check");
  const start = Date.now();

  let client: SupabaseClient;
  try {
    client = getSupabaseServiceClient();
  } catch (err) {
    obs.log("error", "Service client initialization failed — SUPABASE_SERVICE_ROLE_KEY ausente", {
      error: String(err),
    });
    return NextResponse.json(
      {
        data: {
          status: "unhealthy",
          checks: {
            merchant_trust: false,
            trust_signals: false,
            merchant_reviews: false,
            merchant_timeline: false,
            trust_events: false,
          },
          latencyMs: Date.now() - start,
          timestamp: new Date().toISOString(),
          error: "Variável SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente de produção.",
        },
      },
      { status: 503 }
    );
  }

  const checks: Record<string, boolean> = {
    merchant_trust: false,
    trust_signals: false,
    merchant_reviews: false,
    merchant_timeline: false,
    trust_events: false,
  };

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 5000);

  await Promise.allSettled([
    client.from("merchant_trust").select("id").limit(1).abortSignal(controller.signal).then(({ error }) => {
      checks.merchant_trust = !error;
    }),
    client.from("trust_signals").select("id").limit(1).abortSignal(controller.signal).then(({ error }) => {
      checks.trust_signals = !error;
    }),
    client.from("merchant_reviews").select("id").limit(1).abortSignal(controller.signal).then(({ error }) => {
      checks.merchant_reviews = !error;
    }),
    client.from("merchant_timeline").select("id").limit(1).abortSignal(controller.signal).then(({ error }) => {
      checks.merchant_timeline = !error;
    }),
    client.from("merchant_trust_events").select("id").limit(1).abortSignal(controller.signal).then(({ error }) => {
      checks.trust_events = !error;
    }),
  ]);

  clearTimeout(abortTimer);

  const latencyMs = Date.now() - start;
  const timedOut = latencyMs >= 4900;
  const result = obs.buildHealthCheck(checks, latencyMs);

  obs.log(timedOut ? "error" : "info", "Health check completed", {
    latencyMs,
    status: result.status,
    ...(timedOut && { error: "Supabase unreachable — projeto pausado ou URL incorreta" }),
  });

  const statusCode = result.status === "healthy" ? 200 : result.status === "degraded" ? 207 : 503;
  return NextResponse.json(
    {
      data: {
        ...result,
        ...(timedOut && { error: "Supabase unreachable — verifique se o projeto está pausado no dashboard" }),
      },
    },
    { status: statusCode }
  );
}
