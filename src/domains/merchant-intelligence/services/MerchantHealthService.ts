import { HealthStatus, HealthDimension } from "../types/enums";
import type { HealthDimensionResult, MerchantHealth, ExecutiveSummary } from "../types/merchant-intelligence.types";

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<HealthStatus, string> = {
  [HealthStatus.Excellent]: "Excelente",
  [HealthStatus.Good]: "Bom",
  [HealthStatus.Regular]: "Regular",
  [HealthStatus.Attention]: "Atenção",
};

// ── Catalog dimension ─────────────────────────────────────────────────────────

function catalogDimension(summary: ExecutiveSummary): HealthDimensionResult {
  const { totalProducts, incompleteProducts, daysSinceLastImport, lastImportAt } = summary;

  if (totalProducts === 0) {
    return dim(HealthDimension.Catalog, "Catálogo", HealthStatus.Attention, "📦",
      "Sua loja ainda não possui produtos publicados.",
      "Faça sua primeira importação para começar a aparecer no catálogo do ParaguAI.");
  }

  const completePct = totalProducts > 0
    ? ((totalProducts - incompleteProducts) / totalProducts) * 100
    : 0;
  const stale = daysSinceLastImport === null || daysSinceLastImport > 30;
  const fresh = daysSinceLastImport !== null && daysSinceLastImport <= 7;

  if (completePct >= 90 && fresh) {
    return dim(HealthDimension.Catalog, "Catálogo", HealthStatus.Excellent, "📦",
      "Seu catálogo está completo e atualizado. Compradores têm todas as informações para decidir.",
      null);
  }
  if (completePct >= 75 || fresh) {
    return dim(HealthDimension.Catalog, "Catálogo", HealthStatus.Good, "📦",
      "Catálogo em bom estado. Pequenas melhorias podem aumentar sua taxa de cliques.",
      "Complete imagens e categorias dos produtos com informações em falta.");
  }
  if (completePct >= 50 || (lastImportAt !== null && !stale)) {
    return dim(HealthDimension.Catalog, "Catálogo", HealthStatus.Regular, "📦",
      `${incompleteProducts} produto(s) precisam de atenção.`,
      "Adicione imagens, categorias e marcas aos produtos incompletos para aparecer em mais comparações.");
  }
  return dim(HealthDimension.Catalog, "Catálogo", HealthStatus.Attention, "📦",
    "Catálogo com problemas críticos — produtos incompletos não aparecem em buscas.",
    "Priorize adicionar imagens e completar dados dos produtos mais importantes.");
}

// ── Trust dimension ───────────────────────────────────────────────────────────

function trustDimension(summary: ExecutiveSummary): HealthDimensionResult {
  const { trustScore, verificationCount, activeSignalCount, totalReviews, verifiedLevel } = summary;

  const isVerified = verifiedLevel !== "none" || verificationCount > 0;
  const hasSignals = activeSignalCount > 0;
  const hasReviews = totalReviews > 0;

  if (isVerified && hasSignals && hasReviews && trustScore >= 60) {
    return dim(HealthDimension.Trust, "Trust", HealthStatus.Excellent, "🛡️",
      "Sua loja tem verificação, sinais de confiança e avaliações de compradores.",
      null);
  }
  if (isVerified || (hasSignals && trustScore >= 40)) {
    return dim(HealthDimension.Trust, "Trust", HealthStatus.Good, "🛡️",
      "Sua loja tem boa reputação. Adicionar avaliações e mais sinais aumenta a confiança.",
      "Solicite verificações adicionais e incentive compradores a deixarem avaliações.");
  }
  if (trustScore > 0 || hasSignals) {
    return dim(HealthDimension.Trust, "Trust", HealthStatus.Regular, "🛡️",
      "Seu perfil de confiança está em construção. Verificações pendentes ou sem histórico.",
      "Solicite verificação de identidade ou endereço para aumentar seu Trust Score.");
  }
  return dim(HealthDimension.Trust, "Trust", HealthStatus.Attention, "🛡️",
    "Sem registro de confiança ativo. Compradores não têm elementos para confiar na sua loja.",
    "Acesse a Central de Trust e inicie o processo de verificação da sua loja.");
}

// ── Updates dimension ─────────────────────────────────────────────────────────

function updatesDimension(summary: ExecutiveSummary): HealthDimensionResult {
  const { daysSinceLastImport, lastImportAt, lastImportSuccess } = summary;

  if (lastImportAt === null) {
    return dim(HealthDimension.Updates, "Atualização", HealthStatus.Attention, "🔄",
      "Nenhuma sincronização realizada ainda.",
      "Faça sua primeira importação para publicar produtos e manter preços atualizados.");
  }
  if (!lastImportSuccess) {
    return dim(HealthDimension.Updates, "Atualização", HealthStatus.Attention, "🔄",
      "A última sincronização falhou. Preços podem estar desatualizados.",
      "Verifique o histórico de importações e corrija os erros antes da próxima sincronização.");
  }
  if (daysSinceLastImport !== null && daysSinceLastImport <= 3) {
    return dim(HealthDimension.Updates, "Atualização", HealthStatus.Excellent, "🔄",
      `Catálogo sincronizado há ${daysSinceLastImport === 0 ? "hoje" : `${daysSinceLastImport} dia(s)`}. Preços atualizados.`,
      null);
  }
  if (daysSinceLastImport !== null && daysSinceLastImport <= 7) {
    return dim(HealthDimension.Updates, "Atualização", HealthStatus.Good, "🔄",
      `Última sincronização há ${daysSinceLastImport} dias.`,
      "Sincronize semanalmente para garantir que seus preços estão competitivos.");
  }
  if (daysSinceLastImport !== null && daysSinceLastImport <= 30) {
    return dim(HealthDimension.Updates, "Atualização", HealthStatus.Regular, "🔄",
      `Última sincronização há ${daysSinceLastImport} dias. Preços podem estar desatualizados.`,
      "Sincronize agora para manter seus preços competitivos no comparador.");
  }
  return dim(HealthDimension.Updates, "Atualização", HealthStatus.Attention, "🔄",
    `Última sincronização há ${daysSinceLastImport} dias. Preços provavelmente desatualizados.`,
    "Realize uma nova importação urgentemente — preços desatualizados reduzem suas conversões.");
}

// ── Profile dimension ─────────────────────────────────────────────────────────

function profileDimension(summary: ExecutiveSummary): HealthDimensionResult {
  const { contactsAvailable, contactsTotal, onboardingDone, companyName } = summary;
  const pct = Math.round((contactsAvailable / contactsTotal) * 100);

  // Combine: contacts + onboarding + company name
  const bonusItems = [onboardingDone, !!companyName].filter(Boolean).length;
  const overallPct = Math.round(((contactsAvailable + bonusItems) / (contactsTotal + 2)) * 100);

  if (overallPct >= 100) {
    return dim(HealthDimension.Profile, "Perfil", HealthStatus.Excellent, "👤",
      "Perfil completo. Compradores encontram todas as suas informações de contato.",
      null);
  }
  if (overallPct >= 80 || pct >= 75) {
    return dim(HealthDimension.Profile, "Perfil", HealthStatus.Good, "👤",
      "Perfil quase completo. Pequenas adições aumentam a confiança dos compradores.",
      "Adicione os canais de contato restantes nas configurações da loja.");
  }
  if (overallPct >= 60 || pct >= 50) {
    return dim(HealthDimension.Profile, "Perfil", HealthStatus.Regular, "👤",
      `${contactsAvailable} de ${contactsTotal} canais de contato configurados.`,
      "Complete telefone, WhatsApp, e-mail e site da loja para aumentar conversões.");
  }
  return dim(HealthDimension.Profile, "Perfil", HealthStatus.Attention, "👤",
    "Perfil incompleto. Compradores não conseguem entrar em contato com sua loja.",
    "Acesse as configurações e adicione pelo menos WhatsApp ou telefone agora.");
}

// ── Visibility dimension ──────────────────────────────────────────────────────

function visibilityDimension(summary: ExecutiveSummary): HealthDimensionResult {
  const { totalProducts, activeProducts, merchantScore } = summary;

  if (totalProducts === 0) {
    return dim(HealthDimension.Visibility, "Visibilidade", HealthStatus.Attention, "👁️",
      "Sem produtos publicados — sua loja não aparece no comparador.",
      "Importe produtos para começar a aparecer nas buscas dos compradores.");
  }

  const activePct = totalProducts > 0 ? (activeProducts / totalProducts) * 100 : 0;

  if (totalProducts >= 100 && activePct >= 90 && merchantScore >= 70) {
    return dim(HealthDimension.Visibility, "Visibilidade", HealthStatus.Excellent, "👁️",
      `${totalProducts} produtos ativos com alto Merchant Score. Visibilidade máxima.`,
      null);
  }
  if (totalProducts >= 50 || (totalProducts >= 20 && activePct >= 75)) {
    return dim(HealthDimension.Visibility, "Visibilidade", HealthStatus.Good, "👁️",
      `${totalProducts} produtos publicados, ${activeProducts} ativos.`,
      "Aumente o catálogo para 100+ produtos para maximizar sua cobertura nas buscas.");
  }
  if (totalProducts >= 10) {
    return dim(HealthDimension.Visibility, "Visibilidade", HealthStatus.Regular, "👁️",
      `${totalProducts} produtos publicados. Catálogo pequeno limita sua visibilidade.`,
      "Importe mais produtos para aparecer em mais comparações e categorias.");
  }
  return dim(HealthDimension.Visibility, "Visibilidade", HealthStatus.Attention, "👁️",
    `Apenas ${totalProducts} produto(s) publicado(s). Visibilidade muito baixa.`,
    "Importe pelo menos 20 produtos para ter presença significativa no comparador.");
}

// ── Builder ───────────────────────────────────────────────────────────────────

function dim(
  dimension: HealthDimension,
  label: string,
  status: HealthStatus,
  icon: string,
  reason: string,
  howToImprove: string | null
): HealthDimensionResult {
  return {
    dimension,
    label,
    status,
    statusLabel: STATUS_LABELS[status],
    reason,
    howToImprove,
    icon,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildMerchantHealth(summary: ExecutiveSummary): MerchantHealth {
  const dimensions = [
    catalogDimension(summary),
    trustDimension(summary),
    updatesDimension(summary),
    profileDimension(summary),
    visibilityDimension(summary),
  ];

  const overallAttentionCount = dimensions.filter(
    (d) => d.status === HealthStatus.Attention || d.status === HealthStatus.Regular
  ).length;

  return {
    merchantId: summary.merchantId,
    dimensions,
    overallAttentionCount,
    generatedAt: new Date().toISOString(),
  };
}
