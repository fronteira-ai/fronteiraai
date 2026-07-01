import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { toImportLogShape } from "@/lib/sync-run-mapper";

export async function GET(request: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 10;
  const offset = (page - 1) * limit;

  // Release 1.7 — Wave 2: reads connector_sync_runs filtered by merchant_id
  // instead of the global, unfiltered import_logs (a real multi-tenancy bug
  // preserved from acquisition/-era code, fixed here).
  const { data, count } = await serviceClient
    .from("connector_sync_runs")
    .select("*", { count: "exact" })
    .eq("merchant_id", merchant.id)
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    data: (data ?? []).map(toImportLogShape),
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
