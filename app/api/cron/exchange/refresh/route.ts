import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCronSecret } from "@/lib/cron-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createExchangeServices } from "@/lib/exchange-factory";
import { EventService } from "@/src/domains/trust/services/EventService";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import {
  storeRateReactionFastEvent,
  storeRateReactionSlowEvent,
  toCreateEventInput,
} from "@/lib/exchange-trust-bridge";
import type { ExchangeAnalyticsService } from "@/src/domains/exchange/analytics/ExchangeAnalyticsService";

// Refreshes exchange_rates every 5 minutes (ADR-043's cost justification
// depends on this cadence — Vercel plan-tier support for */5 cron is a
// separate, non-code verification, see the Wave's handoff notes) and, best
// effort, emits Brain events for stores whose price-reaction speed to a
// recent rate move stands out. Same shared-secret auth as
// /api/cron/connectors/sync (Release 1.7 — Wave 2).
export const maxDuration = 30;

const REACTION_FAST_THRESHOLD_HOURS = 2;
const REACTION_SLOW_THRESHOLD_HOURS = 24;

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const client = getSupabaseServiceClient();
  const { rateService, analyticsService } = createExchangeServices(client);

  const result = await rateService.refresh();

  // Program ΔR — Mission ΔR-1.1 (Objetivo 2/4). The refresh's own outcome
  // was previously only visible in the JSON response nobody reads — logged
  // explicitly here so Vercel's function logs show every cycle's real
  // result, matching this project's "never hide degradation" discipline.
  if (result.usingFallback) {
    console.error(
      `[cron/exchange/refresh] every registered provider failed — degraded to last-known-good (${result.rates.length} rate(s) served from cache/DB).`
    );
  } else {
    console.log(
      `[cron/exchange/refresh] refreshed ${result.rates.length} rate(s) from provider "${result.providerId}".`
    );
  }

  // Best effort — never fails the cron job itself (the rate refresh above
  // is the primary responsibility here; this Brain enrichment is secondary
  // and degrades silently on error).
  let reactionEventsEmitted = 0;
  try {
    reactionEventsEmitted = await emitStoreReactionEvents(client, analyticsService);
  } catch (err) {
    console.error("[cron/exchange/refresh] store-reaction event emission failed:", err);
  }

  return NextResponse.json({
    data: {
      providerId: result.providerId,
      usingFallback: result.usingFallback,
      ratesRefreshed: result.rates.length,
      reactionEventsEmitted,
    },
  });
}

async function emitStoreReactionEvents(
  client: SupabaseClient,
  analyticsService: ExchangeAnalyticsService
): Promise<number> {
  const analytics = await analyticsService.computeSnapshot(7);
  const notable = analytics.storeReactionLag.filter(
    (s): s is typeof s & { averageLagHours: number } => s.averageLagHours !== null
  );
  if (notable.length === 0) return 0;

  const storeIds = notable.map((s) => s.storeId);
  const { data: mappings } = await client
    .from("merchant_stores")
    .select("store_id, merchant_id")
    .in("store_id", storeIds);
  const merchantByStore = new Map(
    ((mappings ?? []) as { store_id: string; merchant_id: string }[]).map((m) => [m.store_id, m.merchant_id])
  );

  const eventService = new EventService(new SupabaseTrustEventRepository(client));
  let emitted = 0;

  for (const store of notable) {
    const merchantId = merchantByStore.get(store.storeId);
    // Only claimed stores have a real merchantId to emit against — same
    // constraint every prior Wave's real-emission events had (e.g.
    // StoreDiscovered stays taxonomy-only for the same reason).
    if (!merchantId) continue;

    const event =
      store.averageLagHours <= REACTION_FAST_THRESHOLD_HOURS
        ? storeRateReactionFastEvent(merchantId, store.storeId, store.averageLagHours)
        : store.averageLagHours >= REACTION_SLOW_THRESHOLD_HOURS
          ? storeRateReactionSlowEvent(merchantId, store.storeId, store.averageLagHours)
          : null;

    if (event) {
      await eventService.recordEvent(toCreateEventInput(event));
      emitted += 1;
    }
  }

  return emitted;
}
