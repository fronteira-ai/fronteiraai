import { NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import {
  buildExecutiveSummary,
  buildMerchantHealth,
  buildCatalogIntelligence,
  buildQuickActions,
} from "@/src/domains/merchant-intelligence/services";
import type { CommandCenterData } from "@/src/domains/merchant-intelligence/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;

  try {
    // 1. Fetch store IDs once — used by both summary and catalog
    const storeLinks = await serviceClient
      .from("merchant_stores")
      .select("store_id")
      .eq("merchant_id", merchant.id);

    const storeIds = ((storeLinks.data ?? []) as { store_id: string }[]).map((s) => s.store_id);

    // 2. Build all data in parallel
    const [summary, catalog] = await Promise.all([
      buildExecutiveSummary(merchant, serviceClient),
      buildCatalogIntelligence(merchant.id, storeIds, serviceClient),
    ]);

    const health = buildMerchantHealth(summary);
    const quickActions = buildQuickActions(summary, health, catalog);

    const data: CommandCenterData = { summary, health, catalog, quickActions };

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (err) {
    console.error("[command-center] unexpected error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
