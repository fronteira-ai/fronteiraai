import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { ObservabilityService } from "@/src/domains/trust/brain";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ────────────────────────────────────────────────────────────────────

type QueryDiag = {
  ok: boolean;
  latencyMs: number;
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: string;
  errorHint?: string;
};

type PingDiag = {
  reachable: boolean;
  latencyMs: number;
  httpStatus?: number;
  error?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function pingSupabaseRest(url: string, key: string): Promise<PingDiag> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: "HEAD",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(4000),
    });
    return { reachable: res.ok || res.status < 500, latencyMs: Date.now() - t0, httpStatus: res.status };
  } catch (err) {
    return { reachable: false, latencyMs: Date.now() - t0, error: String(err) };
  }
}

async function queryWithDiag(
  client: SupabaseClient,
  table: string,
  signal: AbortSignal
): Promise<QueryDiag> {
  const t0 = Date.now();
  try {
    const { error } = await client.from(table).select("id").limit(1).abortSignal(signal);
    return {
      ok: !error,
      latencyMs: Date.now() - t0,
      errorCode: error?.code ?? undefined,
      errorMessage: error?.message ?? undefined,
      errorDetails: error?.details ?? undefined,
      errorHint: error?.hint ?? undefined,
    };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t0, errorMessage: String(err) };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const obs = new ObservabilityService("health-check");
  const start = Date.now();

  // ── Env diagnostics (sempre logado no Vercel Function Logs) ────────────────
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  let urlHost = "(AUSENTE)";
  let urlValid = false;
  try {
    if (rawUrl) {
      urlHost = new URL(rawUrl).hostname;
      urlValid = true;
    }
  } catch {
    urlHost = `(INVÁLIDA: ${rawUrl})`;
  }

  const keyPresent = rawKey.length > 0;
  const keyIsJwt = rawKey.startsWith("eyJ");
  const keyPrefix = keyPresent ? rawKey.slice(0, 10) + "..." : "(AUSENTE)";

  console.log("[health] ── ENV ──────────────────────────────────────────");
  console.log("[health] SUPABASE_URL host:", urlHost);
  console.log("[health] SUPABASE_URL válida:", urlValid);
  console.log("[health] SERVICE_KEY presente:", keyPresent);
  console.log("[health] SERVICE_KEY é JWT:", keyIsJwt, "| prefixo:", keyPrefix);
  console.log("[health] NODE_ENV:", process.env.NODE_ENV);
  console.log("[health] VERCEL_ENV:", process.env.VERCEL_ENV ?? "(não Vercel)");
  console.log("[health] ─────────────────────────────────────────────────");

  // ── Service client ─────────────────────────────────────────────────────────
  let client: SupabaseClient;
  try {
    client = getSupabaseServiceClient();
    console.log("[health] getSupabaseServiceClient: OK");
  } catch (err) {
    const msg = String(err);
    console.error("[health] getSupabaseServiceClient FALHOU:", msg);
    obs.log("error", "Service client initialization failed", { error: msg });
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
          error: "SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL não configurado.",
        },
      },
      { status: 503 }
    );
  }

  // ── Ping: testa conectividade bruta ANTES do Supabase client ───────────────
  console.log("[health] Iniciando ping REST...");
  const pingT0 = Date.now();
  const ping = await pingSupabaseRest(rawUrl, rawKey);
  console.log("[health] Ping resultado:", JSON.stringify(ping));

  // ── Queries individuais com diagnóstico ────────────────────────────────────
  const controller = new AbortController();
  const abortTimer = setTimeout(() => {
    console.log("[health] AbortController disparado após 5000ms");
    controller.abort();
  }, 5000);

  const tables: Record<string, string> = {
    merchant_trust: "merchant_trust",
    trust_signals: "trust_signals",
    merchant_reviews: "merchant_reviews",
    merchant_timeline: "merchant_timeline",
    trust_events: "merchant_trust_events",
  };

  const queryDiags: Record<string, QueryDiag> = {};

  await Promise.allSettled(
    Object.entries(tables).map(async ([key, table]) => {
      const qd = await queryWithDiag(client, table, controller.signal);
      queryDiags[key] = qd;
      console.log(`[health] query ${table}: ok=${qd.ok} latency=${qd.latencyMs}ms code=${qd.errorCode ?? "-"} msg=${qd.errorMessage ?? "-"}`);
    })
  );

  clearTimeout(abortTimer);

  const latencyMs = Date.now() - start;
  const timedOut = latencyMs >= 4900;

  const checks: Record<string, boolean> = Object.fromEntries(
    Object.entries(queryDiags).map(([k, v]) => [k, v.ok])
  );

  const result = obs.buildHealthCheck(checks, latencyMs);

  console.log("[health] resultado:", result.status, "latency:", latencyMs, "timedOut:", timedOut);
  obs.log(timedOut ? "error" : "info", "Health check completed", { latencyMs, status: result.status });

  const statusCode = result.status === "healthy" ? 200 : result.status === "degraded" ? 207 : 503;

  // ── Resposta normal ────────────────────────────────────────────────────────
  if (!debug) {
    return NextResponse.json(
      {
        data: {
          ...result,
          ...(timedOut && {
            error: "Supabase unreachable — verifique NEXT_PUBLIC_SUPABASE_URL no Vercel e se o projeto está ativo",
          }),
        },
      },
      { status: statusCode }
    );
  }

  // ── Resposta debug (?debug=1) ──────────────────────────────────────────────
  return NextResponse.json(
    {
      data: {
        ...result,
        debug: {
          env: {
            url_host: urlHost,
            url_valid: urlValid,
            key_present: keyPresent,
            key_is_jwt: keyIsJwt,
            key_prefix: keyPrefix,
            node_env: process.env.NODE_ENV,
            vercel_env: process.env.VERCEL_ENV ?? null,
          },
          connection: {
            ping_reachable: ping.reachable,
            ping_latency_ms: ping.latencyMs,
            ping_http_status: ping.httpStatus ?? null,
            ping_error: ping.error ?? null,
          },
          queries: queryDiags,
          latency: {
            total_ms: latencyMs,
            timed_out: timedOut,
            ping_ms: Date.now() - pingT0,
          },
          errors: Object.entries(queryDiags)
            .filter(([, v]) => !v.ok)
            .map(([k, v]) => ({
              check: k,
              code: v.errorCode ?? null,
              message: v.errorMessage ?? null,
              details: v.errorDetails ?? null,
              hint: v.errorHint ?? null,
            })),
        },
      },
    },
    { status: statusCode }
  );
}
