import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import type { SupabaseClient } from "@supabase/supabase-js";

// Release 1.7 — Wave 6 (Platform Hardening & Certification). Consolidates
// the per-domain health signals that already existed scattered across the
// codebase (brain health, connector monitor, and one shallow check per
// domain shipped in Waves 1-5) into a single operational view — no new
// tables, no new business logic, computed on read like every other health
// signal in this project (ADR-034). Database/Storage checks that require a
// SQL console session (database/health_checks/*.sql) are reported as a
// separate "manual" tier rather than faked as live checks.

interface DomainHealth {
  domain: string;
  status: "ok" | "empty" | "error";
  lastActivityAt: string | null;
  detail: string;
}

async function checkLatest(
  client: SupabaseClient,
  domain: string,
  table: string,
  timestampColumn: string,
  detailFn: (row: Record<string, unknown> | null) => string
): Promise<DomainHealth> {
  const { data, error } = await client
    .from(table)
    .select("*")
    .order(timestampColumn, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { domain, status: "error", lastActivityAt: null, detail: error.message };
  if (!data) return { domain, status: "empty", lastActivityAt: null, detail: "sem registros ainda" };

  return {
    domain,
    status: "ok",
    lastActivityAt: (data[timestampColumn] as string) ?? null,
    detail: detailFn(data),
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const db = auth.serviceClient;

  const [brain, connectors, analytics, growth, canonicalCatalog, ownership, storage] =
    await Promise.allSettled([
      checkLatest(db, "brain", "merchant_trust_events", "created_at", (r) => `último evento: ${r?.event_type ?? "?"}`),
      checkLatest(db, "connectors", "connector_sync_runs", "started_at", (r) => `última sincronização: status ${r?.status ?? "?"}`),
      checkLatest(db, "analytics", "buyer_events", "occurred_at", (r) => `último evento: ${r?.event_type ?? "?"}`),
      checkLatest(db, "growth", "merchant_growth_history", "occurred_at", (r) => `último evento: ${r?.event_type ?? "?"}`),
      checkLatest(db, "canonical_catalog", "canonical_products", "created_at", (r) => `último canonical product: ${r?.canonical_slug ?? "?"}`),
      checkLatest(db, "ownership", "store_claims", "created_at", (r) => `última claim: status ${r?.status ?? "?"}`),
      db.storage.listBuckets().then(({ data, error }) => ({
        domain: "storage",
        status: (error ? "error" : "ok") as DomainHealth["status"],
        lastActivityAt: null,
        detail: error ? error.message : `${data?.length ?? 0} bucket(s): ${(data ?? []).map((b) => b.name).join(", ") || "nenhum"}`,
      })),
    ]);

  const results: DomainHealth[] = [brain, connectors, analytics, growth, canonicalCatalog, ownership, storage].map(
    (settled, i) =>
      settled.status === "fulfilled"
        ? settled.value
        : { domain: ["brain", "connectors", "analytics", "growth", "canonical_catalog", "ownership", "storage"][i], status: "error", lastActivityAt: null, detail: String(settled.reason) }
  );

  const cronConfigured = Boolean(process.env.CRON_SECRET);
  const lastConnectorRun = results.find((r) => r.domain === "connectors");

  return NextResponse.json({
    data: {
      generatedAt: new Date().toISOString(),
      liveChecks: results,
      cron: {
        secretConfigured: cronConfigured,
        // No dedicated cron-execution log exists yet — this is a proxy, not
        // a direct signal, and is documented as such rather than presented
        // with false precision.
        lastKnownSyncActivity: lastConnectorRun?.lastActivityAt ?? null,
      },
      manualTier: [
        { domain: "database", how: "npm run db:lint (CI) + database/health_checks/*.sql (7 files: rls, policies, indexes, foreign_keys, triggers, extensions, storage_buckets) run manually against the linked project" },
        { domain: "platform", how: "npm run lint / tsc --noEmit / test / build — see Quality Gate in RELEASE_CERTIFICATION_1.7.md" },
      ],
    },
  });
}
