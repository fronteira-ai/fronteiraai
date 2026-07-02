import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";

type Params = { params: Promise<{ slug: string }> };

// Compare Foundation read (mission objective 3) — backend/API only this
// Wave, no page consumes it yet (confirmed with the CTO). Uses the service
// role internally because canonical_products/offers.canonical_product_id
// have no public RLS policy yet (unlike products/offers themselves, ADR-019)
// — same "public route backed by service role" pattern already established
// for /lojas (ADR-036), not gated behind admin auth since this is meant to
// become public compare data once a page exists.
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const client = getSupabaseServiceClient();
  const { compareFoundationService } = createCanonicalCatalogServices(client);

  const verifiedCache = new Map<string, boolean>();
  const resolveIsVerified = async (storeId: string): Promise<boolean> => {
    if (verifiedCache.has(storeId)) return verifiedCache.get(storeId) as boolean;
    const { data } = await client.from("stores").select("is_verified").eq("id", storeId).maybeSingle();
    const verified = Boolean(data?.is_verified);
    verifiedCache.set(storeId, verified);
    return verified;
  };

  const result = await compareFoundationService.getForSlug(slug, resolveIsVerified);
  if (!result) return NextResponse.json({ error: "Canonical product not found" }, { status: 404 });

  return NextResponse.json({ data: result });
}
