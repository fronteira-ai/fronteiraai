// Server-only service — uses service role key for merchant data only.
// Store data uses the anon client (public read, already proven working).
// Only call from server components, route handlers, or server actions.

import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { supabase } from "@/lib/supabase";
import type { Store } from "@/types/store";

export interface StorePublicData extends Store {
  merchantScore: number | null;
  verifiedLevel: string | null;
  offerCount: number;
  productCount: number;
  /** True when no `merchant_stores` row exists yet — Wave 5's Smart Claim Flow entry point. */
  isUnclaimed: boolean;
  /** merchant_stores.merchant_id, when claimed — null for unclaimed stores. Needed to
   *  attribute buyer_events to a merchant (Release 1.8, Program 0 Wave 0 — Brain bridge). */
  merchantId: string | null;
}

export async function getStorePublic(slug: string): Promise<StorePublicData | null> {
  const sc = getSupabaseServiceClient();

  // Use anon client for stores — public read policy is confirmed working (ADR-019)
  const { data: storeData, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !storeData) return null;
  const store = storeData as Store;

  const [merchantLink, offerCountResult, offerProductsResult] = await Promise.all([
    // Merchant data requires service role (merchants table has RLS self-access only)
    sc.from("merchant_stores")
      .select("merchant_id, merchants!inner(merchant_score, verified_level)")
      .eq("store_id", store.id)
      .limit(1)
      .maybeSingle(),
    // Offers are publicly readable via anon key (ADR-019)
    supabase.from("offers")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id),
    supabase.from("offers")
      .select("product_id")
      .eq("store_id", store.id),
  ]);

  type MerchantFields = { merchant_score: number; verified_level: string };
  const merchantData = (merchantLink.data?.merchants as unknown as MerchantFields | null) ?? null;

  const uniqueProducts = new Set(
    ((offerProductsResult.data ?? []) as { product_id: string }[]).map((o) => o.product_id)
  );

  return {
    ...store,
    merchantScore: merchantData?.merchant_score ?? null,
    verifiedLevel: merchantData?.verified_level ?? null,
    offerCount: offerCountResult.count ?? 0,
    productCount: uniqueProducts.size,
    isUnclaimed: !merchantLink.data,
    merchantId: (merchantLink.data?.merchant_id as string | undefined) ?? null,
  };
}

// Standalone check for pages that already have their own Store row via a
// different service (e.g. app/store/[slug] uses services/store.service.ts)
// and just need the claim-CTA visibility flag without refetching everything
// getStorePublic() returns.
export async function isStoreUnclaimed(storeId: string): Promise<boolean> {
  const sc = getSupabaseServiceClient();
  const { data } = await sc.from("merchant_stores").select("id").eq("store_id", storeId).limit(1).maybeSingle();
  return !data;
}

export async function getStoresRanking(limit = 30): Promise<StorePublicData[]> {
  const sc = getSupabaseServiceClient();

  // Use anon client for stores — public read is confirmed working (ADR-019)
  const { data: storeData, error: storeError } = await supabase
    .from("stores")
    .select("*")
    .order("rating", { ascending: false })
    .limit(limit);

  if (storeError) console.error("[stores-public] store query:", storeError.message);
  if (!storeData?.length) return [];
  const stores = storeData as Store[];
  const storeIds = stores.map((s) => s.id);

  const [merchantLinks, offerData] = await Promise.all([
    // Service role: merchants table has RLS self-access only
    sc.from("merchant_stores")
      .select("store_id, merchant_id, merchants!inner(merchant_score, verified_level)")
      .in("store_id", storeIds),
    // Anon: offers are publicly readable (ADR-019)
    supabase.from("offers")
      .select("store_id")
      .in("store_id", storeIds),
  ]);

  type LinkRow = { store_id: string; merchant_id: string; merchants: { merchant_score: number; verified_level: string } };
  const merchantMap = new Map<string, { merchant_score: number; verified_level: string }>();
  const merchantIdMap = new Map<string, string>();
  ((merchantLinks.data ?? []) as unknown as LinkRow[]).forEach((link) => {
    merchantMap.set(link.store_id, link.merchants);
    merchantIdMap.set(link.store_id, link.merchant_id);
  });

  const countMap = new Map<string, number>();
  ((offerData.data ?? []) as { store_id: string }[]).forEach((o) =>
    countMap.set(o.store_id, (countMap.get(o.store_id) ?? 0) + 1)
  );

  const result = stores.map((store) => ({
    ...store,
    merchantScore: merchantMap.get(store.id)?.merchant_score ?? null,
    verifiedLevel: merchantMap.get(store.id)?.verified_level ?? null,
    offerCount: countMap.get(store.id) ?? 0,
    productCount: 0,
    isUnclaimed: !merchantMap.has(store.id),
    merchantId: merchantIdMap.get(store.id) ?? null,
  }));

  // Sort by merchant score desc, then by offer count desc, then by rating desc
  return result.sort((a, b) => {
    if ((b.merchantScore ?? 0) !== (a.merchantScore ?? 0)) return (b.merchantScore ?? 0) - (a.merchantScore ?? 0);
    if (b.offerCount !== a.offerCount) return b.offerCount - a.offerCount;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
}
