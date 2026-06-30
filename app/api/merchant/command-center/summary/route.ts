import { NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { buildExecutiveSummary } from "@/src/domains/merchant-intelligence/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;

  try {
    const summary = await buildExecutiveSummary(merchant, serviceClient);
    return NextResponse.json({ ok: true, data: summary }, { status: 200 });
  } catch (err) {
    console.error("[command-center/summary] error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
