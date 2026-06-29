import { TrustEventType, BrainAsset } from "../types/enums";
import type { TrustEventBrainImpact } from "../types/trust.types";

export const TRUST_EVENT_BRAIN_IMPACT: TrustEventBrainImpact[] = [
  {
    eventType: TrustEventType.MerchantViewed,
    assets: [
      { asset: BrainAsset.KnowledgeGraph, description: "Adiciona relação Comprador→Loja no grafo de conhecimento" },
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Registra interesse de comprador por loja específica" },
    ],
  },
  {
    eventType: TrustEventType.MerchantVerified,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Atualiza o score de confiança verificada do merchant" },
      { asset: BrainAsset.HistoricalData, description: "Registra data e tipo de verificação no histórico permanente" },
    ],
  },
  {
    eventType: TrustEventType.TrustUpdated,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Atualiza o estado de confiança no ativo C-2" },
      { asset: BrainAsset.HistoricalData, description: "Registra transição de status no histórico permanente" },
    ],
  },
  {
    eventType: TrustEventType.BadgeGranted,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Eleva o nível de badge no Trust Score do merchant" },
      { asset: BrainAsset.KnowledgeGraph, description: "Atualiza nó do merchant no Knowledge Graph com novo badge" },
    ],
  },
  {
    eventType: TrustEventType.BadgeRemoved,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Remove badge e atualiza Trust Score do merchant" },
    ],
  },
  {
    eventType: TrustEventType.BadgeClicked,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Registra interesse do comprador em badges de confiança" },
      { asset: BrainAsset.MerchantTrust, description: "Indica que badge é fator de decisão de compra" },
    ],
  },
  {
    eventType: TrustEventType.ReviewCreated,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Adiciona sinal de reputação pendente para o merchant" },
      { asset: BrainAsset.KnowledgeGraph, description: "Adiciona relação Comprador→Loja com peso de experiência real" },
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Registra comportamento de comprador que completou ciclo de compra" },
    ],
  },
  {
    eventType: TrustEventType.ReviewUpdated,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Atualiza sinal de reputação com versão editada" },
      { asset: BrainAsset.HistoricalData, description: "Registra edição no histórico permanente de reviews" },
    ],
  },
  {
    eventType: TrustEventType.ReviewModerated,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Consolida review aprovado no Trust Score do merchant" },
      { asset: BrainAsset.HistoricalData, description: "Registra review verificado no histórico permanente de reputação" },
    ],
  },
  {
    eventType: TrustEventType.ReviewReported,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Sinaliza possível abuso para revisão da qualidade" },
      { asset: BrainAsset.KnowledgeGraph, description: "Registra sinal de confiabilidade do review no grafo" },
    ],
  },
  {
    eventType: TrustEventType.ReviewHelpfulMarked,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Identifica reviews que influenciam decisões de compra" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Fortalece sinais de qualidade para recomendações futuras" },
    ],
  },
  {
    eventType: TrustEventType.VerificationSubmitted,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Inicia processo de verificação que fortalece C-2" },
      { asset: BrainAsset.HistoricalData, description: "Registra submissão de verificação no log permanente" },
      { asset: BrainAsset.KnowledgeGraph, description: "Adiciona nó de verificação pendente ao grafo do merchant" },
    ],
  },
  {
    eventType: TrustEventType.VerificationApproved,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Consolida verificação aprovada no Trust Score do merchant" },
      { asset: BrainAsset.HistoricalData, description: "Registra verificação aprovada no histórico permanente" },
      { asset: BrainAsset.KnowledgeGraph, description: "Atualiza nó do merchant com atributo verificado" },
    ],
  },
  {
    eventType: TrustEventType.VerificationRejected,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Registra rejeição — sinal negativo no histórico" },
      { asset: BrainAsset.HistoricalData, description: "Preserva registro de rejeição para auditoria futura" },
    ],
  },
  {
    eventType: TrustEventType.VerificationRevoked,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Revoga verificação aprovada — atualiza estado de confiança" },
      { asset: BrainAsset.HistoricalData, description: "Registra revogação com motivo no histórico permanente" },
    ],
  },
  {
    eventType: TrustEventType.VerificationViewed,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Registra interesse de compradores/admins por verificações específicas" },
      { asset: BrainAsset.KnowledgeGraph, description: "Enriquece grafo com padrões de consulta a verificações" },
    ],
  },
  {
    eventType: TrustEventType.EvidenceAdded,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Aumenta força da verificação com evidência objetiva" },
      { asset: BrainAsset.HistoricalData, description: "Registra evidência no log auditável permanente" },
    ],
  },
  {
    eventType: TrustEventType.EvidenceRemoved,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Reduz força de evidência — impacto rastreável no Trust Score" },
      { asset: BrainAsset.HistoricalData, description: "Registra remoção de evidência no log permanente" },
    ],
  },
  {
    eventType: TrustEventType.EvidenceOpened,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Identifica compradores que verificam evidências antes de comprar" },
      { asset: BrainAsset.MerchantTrust, description: "Indica alta intenção de compra quando evidências são consultadas" },
    ],
  },
  {
    eventType: TrustEventType.MerchantProfileViewed,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Registra visita ao perfil de trust de um merchant" },
      { asset: BrainAsset.SearchIntelligence, description: "Alimenta ranking de relevância com dados de engajamento" },
    ],
  },
  {
    eventType: TrustEventType.TrustSignalViewed,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Identifica quais sinais de trust são mais consultados" },
      { asset: BrainAsset.MerchantTrust, description: "Valida importância do sinal para o mercado" },
    ],
  },
  {
    eventType: TrustEventType.TrustSignalActivated,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Ativa novo sinal público no perfil do merchant" },
      { asset: BrainAsset.KnowledgeGraph, description: "Atualiza grafo com novo atributo de confiança verificado" },
    ],
  },
  {
    eventType: TrustEventType.TrustSignalRevoked,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Remove sinal de confiança do perfil público" },
      { asset: BrainAsset.HistoricalData, description: "Registra revogação do sinal no histórico permanente" },
    ],
  },
  {
    eventType: TrustEventType.TimelineViewed,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Registra interesse em histórico de confiança do merchant" },
      { asset: BrainAsset.HistoricalData, description: "Indica que dados históricos influenciam decisão de compra" },
    ],
  },
  // Epic 3 — Merchant Identity
  {
    eventType: TrustEventType.MerchantPassportViewed,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Registra visita ao Passport completo — alta intenção de due diligence" },
      { asset: BrainAsset.KnowledgeGraph, description: "Enriquece grafo com relação Comprador→Passport de confiança" },
      { asset: BrainAsset.SearchIntelligence, description: "Alimenta ranking com engajamento de alta profundidade" },
    ],
  },
  {
    eventType: TrustEventType.MerchantFactExpanded,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Identifica quais fatos objetivos são mais consultados antes de comprar" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Fortalece modelo de quais atributos influenciam decisões de compra" },
    ],
  },
  {
    eventType: TrustEventType.MerchantTimelineInteraction,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Registra interação com eventos do histórico de confiança" },
      { asset: BrainAsset.HistoricalData, description: "Valida que dados históricos são relevantes para compradores" },
    ],
  },
  {
    eventType: TrustEventType.MerchantReviewInteraction,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Registra interação com reviews — padrão de due diligence" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Fortalece modelo de influência de reviews na decisão final" },
    ],
  },
  {
    eventType: TrustEventType.MerchantProfileShared,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Compartilhamento é sinal forte de confiança percebida" },
      { asset: BrainAsset.KnowledgeGraph, description: "Expande grafo de relações — merchant alcança novos contextos" },
      { asset: BrainAsset.SearchIntelligence, description: "Sinal orgânico de autoridade para ranking futuro" },
    ],
  },
  {
    eventType: TrustEventType.MerchantContactClicked,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Clique em contato é conversão de intenção — sinal alto valor" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Indica que canais de contato influenciam conversão" },
    ],
  },
  {
    eventType: TrustEventType.MerchantLocationViewed,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Registro de interesse em localização física do merchant" },
      { asset: BrainAsset.KnowledgeGraph, description: "Enriquece grafo geográfico Comprador→Região" },
    ],
  },
];

export function getBrainImpact(eventType: TrustEventType): BrainAsset[] {
  const entry = TRUST_EVENT_BRAIN_IMPACT.find((e) => e.eventType === eventType);
  return entry ? entry.assets.map((a) => a.asset as BrainAsset) : [];
}
