import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Merchant,
  MerchantDashboardStats,
  MerchantScoreBreakdown,
  MerchantRecommendation,
  MerchantLevel,
  NextStep,
  MerchantGoal,
  MerchantProfileCompletion,
  ProfileCompletionItem,
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

// ── Merchant Level (M05 — Gamification) ──────────────────────────────────────

const LEVELS: MerchantLevel[] = [
  { id: "iniciante", name: "Iniciante",  min: 0,  max: 20,  color: "text-slate-400",  bgColor: "bg-slate-400",  next: "Bronze",   pointsToNext: 0 },
  { id: "bronze",    name: "Bronze",     min: 21, max: 40,  color: "text-orange-400", bgColor: "bg-orange-400", next: "Prata",    pointsToNext: 0 },
  { id: "prata",     name: "Prata",      min: 41, max: 60,  color: "text-slate-300",  bgColor: "bg-slate-300",  next: "Ouro",     pointsToNext: 0 },
  { id: "ouro",      name: "Ouro",       min: 61, max: 80,  color: "text-yellow-400", bgColor: "bg-yellow-400", next: "Diamante", pointsToNext: 0 },
  { id: "diamante",  name: "Diamante",   min: 81, max: 95,  color: "text-cyan-400",   bgColor: "bg-cyan-400",   next: "Elite",    pointsToNext: 0 },
  { id: "elite",     name: "Elite",      min: 96, max: 100, color: "text-emerald-400",bgColor: "bg-emerald-400",next: null,       pointsToNext: 0 },
];

export function getMerchantLevel(score: number): MerchantLevel {
  const level = LEVELS.find((l) => score >= l.min && score <= l.max) ?? LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.min > level.max);
  return { ...level, pointsToNext: nextLevel ? nextLevel.min - score : 0 };
}

// ── Next Step (single priority action) ───────────────────────────────────────

export function computeNextStep(merchant: Merchant, stats: MerchantDashboardStats): NextStep {
  if (stats.totalProducts === 0) {
    return {
      id: "first_import",
      title: "Faça sua primeira importação",
      description: "Sua loja ainda não aparece para os compradores. Importe seus produtos e comece a vender agora.",
      benefit: "Sua loja passa a aparecer nas buscas do ParaguAI",
      cta: "Importar agora",
      href: "/merchant/imports/new",
      urgency: "critical",
      estimatedMinutes: 5,
    };
  }
  if (!merchant.contact_whatsapp && !merchant.contact_phone) {
    return {
      id: "add_whatsapp",
      title: "Adicione seu WhatsApp",
      description: "Lojas com WhatsApp recebem até 2× mais contatos de compradores interessados.",
      benefit: "Mais contatos diretos de compradores",
      cta: "Adicionar agora",
      href: "/merchant/settings",
      urgency: "high",
      estimatedMinutes: 2,
    };
  }
  if (stats.productsNoImage > 0 && stats.productsNoImage / stats.totalProducts > 0.2) {
    return {
      id: "add_images",
      title: `${stats.productsNoImage} produtos precisam de imagem`,
      description: "Produtos com foto vendem 3× mais. Ative a importação de mídia na próxima sincronização.",
      benefit: "Até 3× mais cliques nos seus produtos",
      cta: "Nova importação com mídia",
      href: "/merchant/imports/new",
      urgency: "high",
      estimatedMinutes: 5,
    };
  }
  if (stats.productsNoPrice > 0) {
    return {
      id: "fix_prices",
      title: `${stats.productsNoPrice} produtos sem preço`,
      description: "Produtos sem preço não aparecem nas comparações do ParaguAI. Sincronize para corrigir.",
      benefit: "Mais produtos visíveis nas comparações",
      cta: "Sincronizar preços",
      href: "/merchant/imports/new",
      urgency: "critical",
      estimatedMinutes: 5,
    };
  }
  if (!merchant.company_website) {
    return {
      id: "add_website",
      title: "Adicione o site da sua loja",
      description: "O link do seu site aumenta a confiança dos compradores e melhora seu Merchant Score.",
      benefit: "+10 pontos no Merchant Score",
      cta: "Configurar agora",
      href: "/merchant/settings",
      urgency: "medium",
      estimatedMinutes: 1,
    };
  }
  if (merchant.verified_level === "none") {
    return {
      id: "get_verified",
      title: "Solicite o selo Verificado",
      description: "Lojas verificadas geram mais confiança e aparecem em destaque para os compradores.",
      benefit: "Destaque nas buscas e mais vendas",
      cta: "Ver requisitos",
      href: "/merchant/settings",
      urgency: "medium",
      estimatedMinutes: 10,
    };
  }
  return {
    id: "sync_catalog",
    title: "Mantenha seu catálogo atualizado",
    description: "Sincronizações regulares mantêm os preços precisos e aumentam a confiança dos compradores.",
    benefit: "Preços atualizados = mais conversões",
    cta: "Sincronizar agora",
    href: "/merchant/imports/new",
    urgency: "medium",
    estimatedMinutes: 5,
  };
}

// ── Goals / Metas (Gamification) ──────────────────────────────────────────────

export function computeGoals(merchant: Merchant, stats: MerchantDashboardStats): MerchantGoal[] {
  const goals: MerchantGoal[] = [
    {
      id: "first_import",
      label: "Primeira importação",
      description: "Coloque seus primeiros produtos no ar",
      achieved: stats.lastImportAt !== null,
      current: stats.lastImportAt ? 1 : 0,
      target: 1,
      progress: stats.lastImportAt ? 100 : 0,
      icon: "🚀",
    },
    {
      id: "products_10",
      label: "10 produtos publicados",
      description: "Tenha uma vitrine inicial para os compradores",
      achieved: stats.totalProducts >= 10,
      current: Math.min(stats.totalProducts, 10),
      target: 10,
      progress: Math.min(100, Math.round((stats.totalProducts / 10) * 100)),
      icon: "📦",
    },
    {
      id: "products_50",
      label: "50 produtos publicados",
      description: "Uma vitrine robusta atrai mais compradores",
      achieved: stats.totalProducts >= 50,
      current: Math.min(stats.totalProducts, 50),
      target: 50,
      progress: Math.min(100, Math.round((stats.totalProducts / 50) * 100)),
      icon: "🏪",
    },
    {
      id: "products_100",
      label: "100 produtos publicados",
      description: "Catálogo completo = mais chances de venda",
      achieved: stats.totalProducts >= 100,
      current: Math.min(stats.totalProducts, 100),
      target: 100,
      progress: Math.min(100, Math.round((stats.totalProducts / 100) * 100)),
      icon: "🎯",
    },
    {
      id: "products_500",
      label: "500 produtos publicados",
      description: "Catálogo de alto volume — posição de destaque garantida",
      achieved: stats.totalProducts >= 500,
      current: Math.min(stats.totalProducts, 500),
      target: 500,
      progress: Math.min(100, Math.round((stats.totalProducts / 500) * 100)),
      icon: "🏆",
    },
    {
      id: "score_80",
      label: "Merchant Score 80",
      description: "Nível Ouro — entre as lojas mais confiáveis",
      achieved: stats.merchantScore >= 80,
      current: Math.min(stats.merchantScore, 80),
      target: 80,
      progress: Math.min(100, Math.round((stats.merchantScore / 80) * 100)),
      icon: "🥇",
    },
    {
      id: "score_100",
      label: "Merchant Score 100",
      description: "Nível Elite — a mais alta distinção do ParaguAI",
      achieved: stats.merchantScore >= 100,
      current: Math.min(stats.merchantScore, 100),
      target: 100,
      progress: Math.min(100, stats.merchantScore),
      icon: "💎",
    },
    {
      id: "get_verified",
      label: "Loja Verificada",
      description: "Ganhe o selo de confiança do ParaguAI",
      achieved: merchant.verified_level !== "none",
      current: merchant.verified_level !== "none" ? 1 : 0,
      target: 1,
      progress: merchant.verified_level !== "none" ? 100 : 0,
      icon: "✅",
    },
    {
      id: "profile_complete",
      label: "Perfil Completo",
      description: "Preencha todos os dados da sua empresa",
      achieved: !!merchant.company_name && !!merchant.contact_phone &&
        !!merchant.contact_whatsapp && !!merchant.company_website &&
        stats.totalStores > 0 && stats.lastImportAt !== null,
      current: [
        merchant.company_name, merchant.contact_phone,
        merchant.contact_whatsapp, merchant.company_website,
        stats.totalStores > 0, stats.lastImportAt,
      ].filter(Boolean).length,
      target: 6,
      progress: Math.round(
        ([merchant.company_name, merchant.contact_phone, merchant.contact_whatsapp,
          merchant.company_website, stats.totalStores > 0, stats.lastImportAt]
          .filter(Boolean).length / 6) * 100
      ),
      icon: "📋",
    },
  ];

  // Show achieved + next 2 unachieved
  const achieved = goals.filter((g) => g.achieved);
  const pending = goals.filter((g) => !g.achieved).slice(0, 3);
  return [...achieved, ...pending];
}

// ── Profile Completion (Module 1 — Merchant Progress Engine) ─────────────────

export function computeProfileCompletion(
  merchant: Merchant,
  stats: MerchantDashboardStats
): MerchantProfileCompletion {
  const items: ProfileCompletionItem[] = [
    { id: "company_name",     label: "Nome da empresa",      done: !!merchant.company_name,        href: "/merchant/settings" },
    { id: "contact_phone",    label: "Telefone",             done: !!merchant.contact_phone,       href: "/merchant/settings" },
    { id: "contact_whatsapp", label: "WhatsApp",             done: !!merchant.contact_whatsapp,    href: "/merchant/settings" },
    { id: "company_website",  label: "Site da loja",         done: !!merchant.company_website,     href: "/merchant/settings" },
    { id: "store_linked",     label: "Loja vinculada",       done: stats.totalStores > 0,          href: "/merchant/stores" },
    { id: "first_import",     label: "Primeira importação",  done: stats.lastImportAt !== null,    href: "/merchant/imports/new" },
    { id: "verified",         label: "Solicitar verificação",done: merchant.verified_level !== "none", href: "/merchant/settings" },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const percentage = Math.round((doneCount / totalCount) * 100);

  return { percentage, doneCount, totalCount, items };
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
