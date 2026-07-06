import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createExchangeServices } from "@/lib/exchange-factory";
import { Currency } from "@/src/domains/exchange/enums/Currency";

interface ConvertBody {
  amount: number;
  from: string;
  to: string;
  at?: string;
}

const VALID_CURRENCIES = new Set(Object.values(Currency));

export async function POST(request: NextRequest) {
  let body: ConvertBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { amount, from, to, at } = body;

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    !VALID_CURRENCIES.has(from as Currency) ||
    !VALID_CURRENCIES.has(to as Currency)
  ) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const client = getSupabaseServiceClient();
  const { currencyService, conversionLogRepo } = createExchangeServices(client);

  try {
    const data = await currencyService.convert({
      amountOriginal: amount,
      currencyOriginal: from as Currency,
      targetCurrency: to as Currency,
      at: at ? new Date(at) : undefined,
    });

    // Fire-and-forget — backs the dashboard's "number of conversions"
    // widget, never fails the request if logging itself fails.
    void conversionLogRepo.log({ fromCurrency: from, toCurrency: to, amount });

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "conversion_failed" }, { status: 422 });
  }
}
