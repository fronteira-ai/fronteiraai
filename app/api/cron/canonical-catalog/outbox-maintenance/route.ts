import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  SupabaseCanonicalSuggestionOutboxRepository,
  OutboxRetentionService,
  OutboxExpirationService,
} from "@/src/domains/connectors";

// Mission Ω-Hardening. Independent cron from /api/cron/canonical-catalog/
// merge-suggestions (per the Mission's explicit "cron independente"
// requirement for retention) — daily cadence matches the timescale of both
// jobs (OUTBOX_RETENTION_DAYS default 180, MAX_RETRY_AGE_DAYS default 30);
// neither needs 15-minute frequency. Only ever deletes status='done' rows
// (retention) or moves status='pending' rows to 'expired' (expiration) —
// never touches pending-active/processing/dead_letter otherwise.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const client = getSupabaseServiceClient();
  const outboxRepo = new SupabaseCanonicalSuggestionOutboxRepository(client);
  const retentionService = new OutboxRetentionService(outboxRepo);
  const expirationService = new OutboxExpirationService(outboxRepo);

  const [retention, expiration] = await Promise.all([retentionService.cleanup(), expirationService.expireStaleRetries()]);

  console.log(
    JSON.stringify({
      event: "outbox_maintenance",
      retention_deleted: retention.deletedCount,
      retention_duration_ms: retention.durationMs,
      retention_cutoff: retention.cutoffIso,
      expiration_expired: expiration.expiredCount,
      expiration_duration_ms: expiration.durationMs,
      expiration_cutoff: expiration.cutoffIso,
    })
  );

  return NextResponse.json({ data: { retention, expiration } });
}
