import { ActionPriority, HealthStatus } from "../types/enums";
import type { QuickAction, QuickActionsResult, ExecutiveSummary, MerchantHealth, CatalogIntelligence } from "../types/merchant-intelligence.types";

export function buildQuickActions(
  summary: ExecutiveSummary,
  health: MerchantHealth,
  catalog: CatalogIntelligence
): QuickActionsResult {
  const actions: QuickAction[] = [];

  // ── Critical: No products ─────────────────────────────────────────────────
  if (summary.totalProducts === 0) {
    actions.push({
      id: "first_import",
      priority: ActionPriority.Critical,
      title: "Fazer primeira importação",
      description: "Sua loja não tem produtos. Importe seu catálogo para aparecer no comparador.",
      reason: "Sem produtos, sua loja é invisível para os compradores.",
      impact: "Sua loja passa a aparecer nas buscas a partir do próximo indexador.",
      href: "/merchant/imports/new",
      icon: "Upload",
      estimatedMinutes: 5,
    });
  }

  // ── Critical: Stale catalog ───────────────────────────────────────────────
  if (summary.daysSinceLastImport !== null && summary.daysSinceLastImport > 30) {
    actions.push({
      id: "sync_stale",
      priority: ActionPriority.Critical,
      title: "Sincronizar catálogo agora",
      description: `Última sync há ${summary.daysSinceLastImport} dias. Preços provavelmente desatualizados.`,
      reason: "Preços desatualizados geram frustração e penalizam seu ranking.",
      impact: "Preços corretos aumentam conversão e a confiança dos compradores.",
      href: "/merchant/imports/new",
      icon: "RefreshCw",
      estimatedMinutes: 3,
    });
  }

  // ── Critical: Products without price ─────────────────────────────────────
  const noPriceIssue = catalog.issues.find((i) => i.type === "no_price");
  if (noPriceIssue && noPriceIssue.count > 0) {
    actions.push({
      id: "fix_prices",
      priority: ActionPriority.Critical,
      title: `Corrigir ${noPriceIssue.count} produto(s) sem preço`,
      description: "Produtos sem preço são excluídos automaticamente do comparador.",
      reason: "O comparador não pode exibir produtos sem preço de referência.",
      impact: "Recuperar visibilidade imediata desses produtos nas buscas.",
      href: "/merchant/imports/new",
      icon: "DollarSign",
      estimatedMinutes: 5,
    });
  }

  // ── High: No trust record ─────────────────────────────────────────────────
  const trustHealth = health.dimensions.find((d) => d.dimension === "trust");
  if (trustHealth?.status === HealthStatus.Attention) {
    actions.push({
      id: "start_verification",
      priority: ActionPriority.High,
      title: "Iniciar verificação da loja",
      description: "Lojas verificadas vendem mais. Inicie o processo de verificação de identidade.",
      reason: "Compradores preferem lojas com sinal de verificação — aumenta confiança e conversão.",
      impact: "Verificação eleva o Trust Score e ativa o badge de loja verificada.",
      href: "/merchant/trust",
      icon: "Shield",
      estimatedMinutes: 10,
    });
  }

  // ── High: Products without image ─────────────────────────────────────────
  const noImageIssue = catalog.issues.find((i) => i.type === "no_image");
  if (noImageIssue && noImageIssue.count > 0 && noImageIssue.percentage >= 20) {
    actions.push({
      id: "add_images",
      priority: ActionPriority.High,
      title: `Adicionar imagens: ${noImageIssue.count} produto(s) sem foto`,
      description: "Reimporte com a opção de mídia ativada para carregar imagens dos produtos.",
      reason: "Produtos sem foto recebem 3× menos cliques do que produtos com imagem.",
      impact: `${noImageIssue.count} produtos ganham foto e aumentam visibilidade no catálogo.`,
      href: "/merchant/imports/new",
      icon: "Image",
      estimatedMinutes: 5,
    });
  }

  // ── High: Incomplete profile ──────────────────────────────────────────────
  const profileHealth = health.dimensions.find((d) => d.dimension === "perfil");
  if (profileHealth?.status === HealthStatus.Attention || profileHealth?.status === HealthStatus.Regular) {
    actions.push({
      id: "complete_profile",
      priority: ActionPriority.High,
      title: "Completar perfil da loja",
      description: "Adicione WhatsApp, telefone e outros canais de contato.",
      reason: "Compradores entram em contato antes de comprar — perfil incompleto perde conversões.",
      impact: "Perfil completo aumenta a taxa de contato em até 40%.",
      href: "/merchant/settings",
      icon: "User",
      estimatedMinutes: 5,
    });
  }

  // ── Medium: Products without category ────────────────────────────────────
  const noCategoryIssue = catalog.issues.find((i) => i.type === "no_category");
  if (noCategoryIssue && noCategoryIssue.count > 0) {
    actions.push({
      id: "categorize",
      priority: ActionPriority.Medium,
      title: `Categorizar ${noCategoryIssue.count} produto(s)`,
      description: "Produtos sem categoria não aparecem nos filtros de busca.",
      reason: "Filtros por categoria geram 60% do tráfego orgânico do comparador.",
      impact: "Mais produtos visíveis nas buscas filtradas por categoria.",
      href: "/merchant/catalog",
      icon: "Tag",
      estimatedMinutes: 15,
    });
  }

  // ── Medium: No reviews ────────────────────────────────────────────────────
  if (summary.totalReviews === 0 && summary.totalProducts > 0) {
    actions.push({
      id: "get_reviews",
      priority: ActionPriority.Medium,
      title: "Conquistar primeira avaliação",
      description: "Peça para clientes avaliarem sua loja no ParaguAI.",
      reason: "Lojas com avaliações têm 2× mais cliques do que lojas sem histórico.",
      impact: "Primeira avaliação ativa o Trust Score e aumenta confiança dos compradores.",
      href: "/merchant/trust",
      icon: "Star",
      estimatedMinutes: 2,
    });
  }

  // ── Medium: Regular update (7-14 days) ───────────────────────────────────
  if (
    summary.daysSinceLastImport !== null &&
    summary.daysSinceLastImport >= 7 &&
    summary.daysSinceLastImport <= 30
  ) {
    actions.push({
      id: "sync_regular",
      priority: ActionPriority.Medium,
      title: "Atualizar preços do catálogo",
      description: `Última sync há ${summary.daysSinceLastImport} dias. Mantenha preços competitivos.`,
      reason: "Preços atualizados mantêm sua loja competitiva nas comparações semanais.",
      impact: "Preços corretos evitam perdas de clientes para concorrentes mais atualizados.",
      href: "/merchant/imports/new",
      icon: "RefreshCw",
      estimatedMinutes: 3,
    });
  }

  // Sort: critical → high → medium → low, then by estimated time
  const priorityOrder: Record<ActionPriority, number> = {
    [ActionPriority.Critical]: 0,
    [ActionPriority.High]: 1,
    [ActionPriority.Medium]: 2,
    [ActionPriority.Low]: 3,
  };
  actions.sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority] ||
    a.estimatedMinutes - b.estimatedMinutes
  );

  // Return top 5 most impactful actions
  return {
    merchantId: summary.merchantId,
    actions: actions.slice(0, 5),
    generatedAt: new Date().toISOString(),
  };
}
