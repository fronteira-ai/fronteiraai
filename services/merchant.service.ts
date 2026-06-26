import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Merchant,
  MerchantDashboardStats,
  MerchantScoreBreakdown,
  MerchantRecommendation,
  AuditEventType,
} from "@/types/merchant";

// ── Dashboard Stats ────────────────────────────────────────────────────────────

export async function getMerchantDashboardStats(
  merchantId: string,
  supabase: SupabaseClient
): Promise<MerchantDashboardStats> {
  // Fetch all store IDs linked to this merchant
  const { data: storeLinks } = await supabase
    .from("merchant_stores")
    .select("store_id")
    .eq("merchant_id", merchantId);

  const storeIds = (storeLinks ?? []).map((s: { store_id: string }) => s.store_id);

  if (storeIds.length === 0) {
    return {
      totalProducts: 0, activeProducts: 0, productsNoImage: 0,
      productsNoCategory: 0, productsNoPrice: 0,
      totalStores: 0, lastImportAt: null, lastImportSuccess: null,
      lastImportCount: 0, merchantScore: 0, trustScore: 0,
    };
  }

  // Parallel queries for all stats
  const [offersAll, offersActive, offersNoPrice, lastImport, merchant] = await Promise.all([
    supabase.from("offers").select("product_id, products!inner(id, image_url, category_id)", { count: "exact" }).in("store_id", storeIds),
    supabase.from("offers").select("id", { count: "exact" }).in("store_id", storeIds).eq("in_stock", true),
    supabase.from("offers").select("id", { count: "exact" }).in("store_id", storeIds).lte("price_usd", 0),
    supabase.from("import_logs").select("created_at, success, total_persisted").in("connector_id", ["shoppingchina", "json-file", "csv-file"]).order("created_at", { ascending: false }).limit(1),
    supabase.from("merchants").select("merchant_score, trust_score").eq("id", merchantId).single(),
  ]);

  const allOffers = (offersAll.data ?? []) as unknown as Array<{ product_id: string; products: { id: string; image_url: string | null; category_id: string | null } }>;
  const totalProducts = allOffers.length;
  const productsNoImage = allOffers.filter((o) => !o.products?.image_url).length;
  const productsNoCategory = allOffers.filter((o) => !o.products?.category_id).length;
  const activeProducts = offersActive.count ?? 0;
  const productsNoPrice = offersNoPrice.count ?? 0;

  const lastLog = lastImport.data?.[0];

  return {
    totalProducts,
    activeProducts,
    productsNoImage,
    productsNoCategory,
    productsNoPrice,
    totalStores: storeIds.length,
    lastImportAt: lastLog?.created_at ?? null,
    lastImportSuccess: lastLog?.success ?? null,
    lastImportCount: lastLog?.total_persisted ?? 0,
    merchantScore: merchant.data?.merchant_score ?? 0,
    trustScore: merchant.data?.trust_score ?? 0,
  };
}

// ── Merchant Score (M05) ───────────────────────────────────────────────────────

export async function computeMerchantScore(
  merchant: Merchant,
  stats: MerchantDashboardStats
): Promise<MerchantScoreBreakdown> {
  const items = [
    {
      label: "Cadastro completo",
      points: 10,
      earned: !!(merchant.company_name && merchant.contact_email),
    },
    {
      label: "Telefone confirmado",
      points: 10,
      earned: !!merchant.contact_phone,
    },
    {
      label: "WhatsApp confirmado",
      points: 10,
      earned: !!merchant.contact_whatsapp,
    },
    {
      label: "Domínio confirmado",
      points: 10,
      earned: !!merchant.company_website,
    },
    {
      label: "Produtos com imagem",
      points: 20,
      earned: stats.totalProducts > 0 &&
        (stats.totalProducts - stats.productsNoImage) / stats.totalProducts >= 0.8,
    },
    {
      label: "Categorias completas",
      points: 10,
      earned: stats.totalProducts > 0 &&
        (stats.totalProducts - stats.productsNoCategory) / stats.totalProducts >= 0.8,
    },
    {
      label: "Atualizações frequentes",
      points: 20,
      earned: !!merchant.onboarding_done && stats.lastImportAt != null &&
        Date.now() - new Date(stats.lastImportAt).getTime() < 7 * 24 * 60 * 60 * 1000,
    },
    {
      label: "Sem erros de importação",
      points: 10,
      earned: stats.lastImportSuccess === true,
    },
  ];

  const total = items.reduce((sum, item) => sum + (item.earned ? item.points : 0), 0);
  return { total, items };
}

// ── Recommendations (M12) ─────────────────────────────────────────────────────

export async function generateRecommendations(
  merchantId: string,
  merchant: Merchant,
  stats: MerchantDashboardStats,
  supabase: SupabaseClient
): Promise<void> {
  const recs: Omit<MerchantRecommendation, "id" | "created_at" | "read_at">[] = [];

  if (stats.productsNoImage > 0) {
    recs.push({
      merchant_id: merchantId,
      type: "missing_images",
      priority: "warning",
      title: `${stats.productsNoImage} produtos sem imagem`,
      body: "Produtos com imagem têm até 3× mais cliques. Adicione fotos para aumentar sua visibilidade.",
      metadata: { count: stats.productsNoImage },
    });
  }
  if (stats.productsNoCategory > 0) {
    recs.push({
      merchant_id: merchantId,
      type: "missing_category",
      priority: "warning",
      title: `${stats.productsNoCategory} produtos sem categoria`,
      body: "Categorias incompletas reduzem a descobribilidade no catálogo.",
      metadata: { count: stats.productsNoCategory },
    });
  }
  if (stats.productsNoPrice > 0) {
    recs.push({
      merchant_id: merchantId,
      type: "missing_price",
      priority: "critical",
      title: `${stats.productsNoPrice} produtos sem preço`,
      body: "Produtos sem preço não aparecem nas comparações. Atualize-os urgentemente.",
      metadata: { count: stats.productsNoPrice },
    });
  }
  if (!merchant.contact_phone && !merchant.contact_whatsapp) {
    recs.push({
      merchant_id: merchantId,
      type: "missing_contact",
      priority: "info",
      title: "Adicione telefone ou WhatsApp",
      body: "Clientes preferem lojas com contato fácil. Adicione seu número nas configurações.",
      metadata: null,
    });
  }
  if (stats.lastImportAt) {
    const daysSince = (Date.now() - new Date(stats.lastImportAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) {
      recs.push({
        merchant_id: merchantId,
        type: "stale_catalog",
        priority: "warning",
        title: "Catálogo desatualizado",
        body: `Sua última importação foi há ${Math.floor(daysSince)} dias. Sincronize para manter preços atualizados.`,
        metadata: { days: Math.floor(daysSince) },
      });
    }
  }
  if (stats.totalProducts === 0) {
    recs.push({
      merchant_id: merchantId,
      type: "no_products",
      priority: "critical",
      title: "Nenhum produto publicado",
      body: "Faça sua primeira importação para começar a aparecer no catálogo do ParaguAI.",
      metadata: null,
    });
  }

  if (recs.length === 0) return;

  // Clear old unread recs of the same types before inserting new ones
  const types = recs.map((r) => r.type);
  await supabase
    .from("merchant_recommendations")
    .delete()
    .eq("merchant_id", merchantId)
    .in("type", types)
    .is("read_at", null);

  await supabase.from("merchant_recommendations").insert(recs);
}

// ── Audit Logging (M08) ───────────────────────────────────────────────────────

export async function logAuditEvent(
  merchantId: string | null,
  userId: string | null,
  eventType: AuditEventType,
  payload: Record<string, unknown> | null,
  supabase: SupabaseClient
): Promise<void> {
  await supabase.from("merchant_audit_logs").insert({
    merchant_id: merchantId,
    user_id: userId,
    event_type: eventType,
    payload,
  });
}

// ── Trust Score (M06) — computed server-side ──────────────────────────────────

export function computeTrustScore(
  hasImage: boolean,
  hasDescription: boolean,
  hasBrand: boolean,
  hasCategory: boolean,
  hasPriceHistory: boolean,
  daysSinceUpdate: number
): number {
  let score = 0;
  if (hasImage) score += 20;
  if (hasDescription) score += 15;
  if (hasBrand) score += 15;
  if (hasCategory) score += 15;
  if (hasPriceHistory) score += 15;
  if (daysSinceUpdate <= 7) score += 20;
  else if (daysSinceUpdate <= 30) score += 10;
  return Math.min(score, 100);
}
