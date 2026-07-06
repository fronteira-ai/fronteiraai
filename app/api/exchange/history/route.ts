import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createExchangeServices } from "@/lib/exchange-factory";
import { CurrencyPair } from "@/src/domains/exchange/enums/CurrencyPair";

const VALID_PAIRS = new Set(Object.values(CurrencyPair));
const MAX_RANGE_DAYS = 90;
const MAX_RANGE_MS = MAX_RANGE_DAYS * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const pairParam = request.nextUrl.searchParams.get("pair");
  const pair =
    pairParam && VALID_PAIRS.has(pairParam as CurrencyPair) ? (pairParam as CurrencyPair) : CurrencyPair.UsdPyg;

  const to = parseDate(request.nextUrl.searchParams.get("to")) ?? new Date();
  const requestedFrom = parseDate(request.nextUrl.searchParams.get("from"));
  const defaultFrom = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  let from = requestedFrom ?? defaultFrom;

  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    from = new Date(to.getTime() - MAX_RANGE_MS);
  }

  const { historyService } = createExchangeServices(getSupabaseServiceClient());
  const data = await historyService.getRange(pair, from, to);

  return NextResponse.json({ data });
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
