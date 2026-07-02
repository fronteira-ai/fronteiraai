import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExecutiveSummary } from "../types/merchant-intelligence.types";
import type { Merchant } from "@/types/merchant";

export async function buildExecutiveSummary(
  merchant: Merchant,
  serviceClient: SupabaseClient
): Promise<ExecutiveSummary> {
  const storeLinks = await serviceClient
    .from("merchant_stores")
    .select("store_id")
    .eq("merchant_id", merchant.id);

  const storeIds = (storeLinks.data ?? []).map((s: { store_id: string }) => s.store_id);

  if (storeIds.length === 0) {
    return emptyExecutiveSummary(merchant);
  }

  const [offersResult, lastImportResult, trustResult, reviewsResult] = await Promise.all([
    serviceClient
      .from("offers")
      .select("id, in_stock, price_usd, products!inner(id, image_url, category_id, brand_id, description)")
      .in("store_id", storeIds),
    serviceClient
      .from("connector_sync_runs")
      .select("started_at, completed_at, status, totals")
      .eq("merchant_id", merchant.id)
      .order("started_at", { ascending: false })
      .limit(1),
    serviceClient
      .from("merchant_trust")
      .select("trust_score, status")
      .eq("merchant_id", merchant.id)
      .maybeSingle(),
    serviceClient
      .from("merchant_reviews")
      .select("id, rating, status")
      .eq("merchant_id", merchant.id)
      .eq("status", "approved"),
  ]);

  const verificationResult = await serviceClient
    .from("merchant_verifications")
    .select("id", { count: "exact" })
    .eq("merchant_id", merchant.id)
    .eq("status", "approved");

  const signalsResult = await serviceClient
    .from("trust_signals")
    .select("id", { count: "exact" })
    .eq("merchant_id", merchant.id)
    .eq("status", "active");

  type OfferRow = { id: string; in_stock: boolean; price_usd: number; products: { id: string; image_url: string | null; category_id: string | null; brand_id: string | null; description: string | null } };
  const offers = (offersResult.data ?? []) as unknown as OfferRow[];
  const totalProducts = offers.length;
  const activeProducts = offers.filter((o) => o.in_stock).length;
  const incompleteProducts = offers.filter((o) => {
    const p = o.products;
    return !p.image_url || !p.category_id || !p.brand_id || !p.description || o.price_usd <= 0;
  }).length;

  const lastLog = lastImportResult.data?.[0];
  const lastImportAt = lastLog?.completed_at ?? lastLog?.started_at ?? null;
  const daysSinceLastImport = lastImportAt
    ? Math.floor((Date.now() - new Date(lastImportAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const reviews = (reviewsResult.data ?? []) as { id: string; rating: number; status: string }[];
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : null;

  const contactsAvailable = [
    merchant.contact_phone,
    merchant.contact_whatsapp,
    merchant.contact_email,
    merchant.company_website,
  ].filter(Boolean).length;

  return {
    merchantId: merchant.id,
    companyName: merchant.company_name,
    plan: merchant.plan,
    totalProducts,
    activeProducts,
    incompleteProducts,
    trustScore: trustResult.data?.trust_score ?? merchant.trust_score ?? 0,
    verificationCount: verificationResult.count ?? 0,
    activeSignalCount: signalsResult.count ?? 0,
    totalReviews,
    averageRating,
    contactsAvailable,
    contactsTotal: 4,
    lastImportAt,
    lastImportSuccess: lastLog ? lastLog.status === "success" : null,
    daysSinceLastImport,
    onboardingDone: merchant.onboarding_done,
    verifiedLevel: merchant.verified_level,
    merchantScore: merchant.merchant_score,
    generatedAt: new Date().toISOString(),
  };
}

function emptyExecutiveSummary(merchant: Merchant): ExecutiveSummary {
  return {
    merchantId: merchant.id,
    companyName: merchant.company_name,
    plan: merchant.plan,
    totalProducts: 0,
    activeProducts: 0,
    incompleteProducts: 0,
    trustScore: 0,
    verificationCount: 0,
    activeSignalCount: 0,
    totalReviews: 0,
    averageRating: null,
    contactsAvailable: [merchant.contact_phone, merchant.contact_whatsapp, merchant.contact_email, merchant.company_website].filter(Boolean).length,
    contactsTotal: 4,
    lastImportAt: null,
    lastImportSuccess: null,
    daysSinceLastImport: null,
    onboardingDone: merchant.onboarding_done,
    verifiedLevel: merchant.verified_level,
    merchantScore: merchant.merchant_score,
    generatedAt: new Date().toISOString(),
  };
}
