import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createExchangeServices } from "@/lib/exchange-factory";
import { CurrencyPair } from "@/src/domains/exchange/enums/CurrencyPair";
import type { ExchangeRate } from "@/src/domains/exchange/types/Money";

const TRACKED_PAIRS = [CurrencyPair.UsdPyg, CurrencyPair.UsdBrl, CurrencyPair.BrlPyg];

// Public, unauthenticated, service-role-backed — same pattern as
// /api/canonical-catalog/[slug] (ADR-036). No real rate limiting (same
// posture as /api/compare and /api/canonical-catalog/[slug] — see
// TECH_DEBT.md, this is a third named instance of the same gap).
export async function GET() {
  const { rateService } = createExchangeServices(getSupabaseServiceClient());

  const rates = await Promise.all(TRACKED_PAIRS.map((pair) => rateService.getCurrentRate(pair)));
  const data = rates.filter((r): r is ExchangeRate => r !== null);

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
