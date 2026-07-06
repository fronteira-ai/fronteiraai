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
  // Release 1.6 — Command Center
  {
    eventType: TrustEventType.CommandCenterViewed,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Registra frequência de uso do Command Center pelo merchant" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Calibra recomendações com base no padrão de acesso" },
    ],
  },
  {
    eventType: TrustEventType.CommandCenterWidgetOpened,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Registra quais widgets são mais consultados por tipo de merchant" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Melhora priorização de widgets no Daily Brief futuro" },
    ],
  },
  {
    eventType: TrustEventType.CommandCenterQuickActionClicked,
    assets: [
      { asset: BrainAsset.RecommendationKnowledge, description: "Registra quais ações rápidas geram mais engajamento — calibra priorização futura" },
      { asset: BrainAsset.HistoricalData, description: "Registra padrão de resposta a recomendações por tipo de merchant" },
    ],
  },
  {
    eventType: TrustEventType.CommandCenterCatalogIssueViewed,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Registra quais problemas de catálogo são mais consultados" },
      { asset: BrainAsset.KnowledgeGraph, description: "Enriquece grafo de conhecimento sobre padrões de catálogo por categoria" },
    ],
  },
  {
    eventType: TrustEventType.CommandCenterCatalogIssueResolved,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Registra resoluções de problemas — base para medir impacto de melhorias" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Aprende quais tipos de problema os merchants resolvem mais rapidamente" },
      { asset: BrainAsset.KnowledgeGraph, description: "Atualiza estado de qualidade de catálogo do merchant no grafo" },
    ],
  },
  {
    eventType: TrustEventType.CommandCenterHealthViewed,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Registra interesse do merchant em dimensões específicas de saúde" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Calibra quais dimensões gerar recomendações mais detalhadas" },
    ],
  },
  {
    eventType: TrustEventType.CommandCenterFilterChanged,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Registra padrões de filtro usados no Command Center" },
    ],
  },
  {
    eventType: TrustEventType.CommandCenterSummaryExported,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Registra merchants que exportam dados — sinal de uso avançado e engagement" },
    ],
  },
  // Release 1.6 — Analytics Platform
  {
    eventType: TrustEventType.AnalyticsSearchPerformed,
    assets: [
      { asset: BrainAsset.SearchIntelligence, description: "Alimenta corpus de intenções de busca — base para ranking e sugestões" },
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Registra padrões de linguagem e termos usados por compradores" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsProductImpression,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Registra o que o comprador viu — base para análise de posição e visibilidade" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Calibra modelo de recomendação com padrões de exposição" },
      { asset: BrainAsset.SearchIntelligence, description: "Mede CTR por posição — alimenta otimização de ranking" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsProductClicked,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Clique é sinal de interesse explícito — alto peso no modelo de comportamento" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Fortalece relação Comprador→Produto no modelo de recomendação" },
      { asset: BrainAsset.SearchIntelligence, description: "CTR real alimenta modelo de relevância e ranking" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsProductCompared,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Comparação revela intenção avançada de compra — sinal de alta intenção" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Pares de produtos comparados enriquecem modelo de similaridade" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsMerchantViewed,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Visita ao merchant registra interesse de contexto local/preço/confiança" },
      { asset: BrainAsset.KnowledgeGraph, description: "Adiciona aresta Comprador→Merchant com peso por frequência de visita" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Merchant visitado por perfil similar → candidato de recomendação" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsMerchantPassportViewed,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Visualização do passport indica processo de due diligence do comprador" },
      { asset: BrainAsset.MerchantTrust, description: "Sinal que trust visível influencia decisão de compra" },
      { asset: BrainAsset.KnowledgeGraph, description: "Enriquece relação Comprador→Trust no grafo" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsMerchantContactClicked,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Clique em contato = conversão de intenção para ação — evento de alto valor" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Canal que gerou contato enriquece modelo de conversão por perfil" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsMerchantWhatsAppClicked,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "WhatsApp é canal preferencial de conversão — mede preferência por canal" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Fortalece modelo de atribuição de canal para merchants similares" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsMerchantPhoneClicked,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Ligação telefônica indica compradores mais tradicionais — segmentação comportamental" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Calibra recomendação de canal por perfil de comprador" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsMerchantWebsiteClicked,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Visita ao site indica interesse em informações complementares" },
      { asset: BrainAsset.KnowledgeGraph, description: "Expande grafo de relacionamento comprador→merchant via web" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsOfferSaved,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Salvar oferta é sinal forte de intenção futura de compra" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Lista de salvos revela padrão de wishlist — alimenta recomendação proativa" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsCategoryViewed,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Interesse por categoria revela contexto de compra e poder aquisitivo" },
      { asset: BrainAsset.SearchIntelligence, description: "Navegação por categoria alimenta taxonomia de intenção de busca" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsSessionStarted,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Início de sessão registra contexto completo (device, origem, hora)" },
      { asset: BrainAsset.HistoricalData, description: "Série histórica de sessões alimenta análise de frequência e padrão de visita" },
    ],
  },
  {
    eventType: TrustEventType.AnalyticsSessionEnded,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Duração de sessão e exit page revelam profundidade do engajamento" },
      { asset: BrainAsset.HistoricalData, description: "Sessão completa compõe jornada histórica do comprador" },
    ],
  },
  // Release 1.6 — Decision Engine
  {
    eventType: TrustEventType.DecisionCenterViewed,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Registra frequência de uso do Decision Center — engajamento com inteligência operacional" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Merchants que acessam o Decision Center são mais receptivos a recomendações" },
    ],
  },
  {
    eventType: TrustEventType.RecommendationGenerated,
    assets: [
      { asset: BrainAsset.RecommendationKnowledge, description: "Registra qual regra disparou e o contexto — calibra relevância futura por tipo de merchant" },
      { asset: BrainAsset.HistoricalData, description: "Histórico de recomendações geradas por merchant compõe base para melhoria do engine" },
      { asset: BrainAsset.MerchantTrust, description: "Recomendações frequentes de trust indicam fragilidade no ativo C-2" },
    ],
  },
  {
    eventType: TrustEventType.RecommendationViewed,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Registra quais recomendações o merchant visualizou — atenção ≠ ação" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Taxa de view-to-accept calibra relevância das recomendações por regra" },
    ],
  },
  {
    eventType: TrustEventType.RecommendationAccepted,
    assets: [
      { asset: BrainAsset.RecommendationKnowledge, description: "Aceitação valida relevância da regra — aumenta peso da regra no ranking futuro" },
      { asset: BrainAsset.HistoricalData, description: "Registro permanente de decisões de melhoria tomadas pelo merchant" },
      { asset: BrainAsset.MerchantTrust, description: "Merchant que aceita recomendações de trust melhora ativo C-2 proativamente" },
    ],
  },
  {
    eventType: TrustEventType.RecommendationDismissed,
    assets: [
      { asset: BrainAsset.RecommendationKnowledge, description: "Dismissal recalibra relevância da regra — regra pode precisar de ajuste nas condições" },
      { asset: BrainAsset.HistoricalData, description: "Padrão de dismissal por categoria revela resistência a tipos específicos de ação" },
    ],
  },
  {
    eventType: TrustEventType.ActionCompleted,
    assets: [
      { asset: BrainAsset.RecommendationKnowledge, description: "Ação concluída confirma que a recomendação era relevante — fortalece a regra" },
      { asset: BrainAsset.HistoricalData, description: "Histórico de melhorias concluídas é ativo permanente do merchant" },
      { asset: BrainAsset.MerchantTrust, description: "Ações de melhoria executadas fortalecem o ativo C-2 diretamente" },
      { asset: BrainAsset.KnowledgeGraph, description: "Melhoria concluída atualiza nó do merchant no Knowledge Graph com novo estado" },
    ],
  },
  {
    eventType: TrustEventType.ActionPostponed,
    assets: [
      { asset: BrainAsset.RecommendationKnowledge, description: "Adiamento indica que a regra disparou no momento errado — calibra timing futuro" },
      { asset: BrainAsset.HistoricalData, description: "Padrão de adiamento por categoria de ação informa sobre capacidade operacional do merchant" },
    ],
  },
  {
    eventType: TrustEventType.OpportunityDetected,
    assets: [
      { asset: BrainAsset.RecommendationKnowledge, description: "Oportunidade detectada = dados observáveis indicam gap de crescimento — alimenta modelo preditivo" },
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Oportunidades derivadas de comportamento de comprador enriquecem modelo de demanda" },
      { asset: BrainAsset.SearchIntelligence, description: "Gaps de exposição detectados fortalecem inteligência de ranking e posicionamento" },
    ],
  },
  {
    eventType: TrustEventType.OpportunityResolved,
    assets: [
      { asset: BrainAsset.RecommendationKnowledge, description: "Oportunidade resolvida valida detector — aumenta confiança no tipo de oportunidade" },
      { asset: BrainAsset.HistoricalData, description: "Resolução de oportunidade é evento de crescimento registrado permanentemente" },
      { asset: BrainAsset.MerchantTrust, description: "Merchant que resolve oportunidades demonstra maturidade operacional" },
    ],
  },
  {
    eventType: TrustEventType.PriorityChanged,
    assets: [
      { asset: BrainAsset.RecommendationKnowledge, description: "Mudança de prioridade calibra o modelo de scoring e explica ordem de apresentação" },
      { asset: BrainAsset.HistoricalData, description: "Registro de mudanças de prioridade alimenta análise de evolução do context do merchant" },
    ],
  },
  // Release 1.7 — Epic 1 — Connector Platform Events
  {
    eventType: TrustEventType.ConnectorRegistered,
    assets: [
      { asset: BrainAsset.SearchIntelligence, description: "Novo conector registrado amplia a cobertura de catálogo disponível para busca" },
      { asset: BrainAsset.HistoricalData, description: "Registro do conector persiste permanentemente quando cada fonte de dados passou a existir" },
    ],
  },
  {
    eventType: TrustEventType.ConnectorSyncStarted,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Marca o início de uma sincronização de catálogo no histórico permanente" },
    ],
  },
  {
    eventType: TrustEventType.ConnectorSyncCompleted,
    assets: [
      { asset: BrainAsset.SearchIntelligence, description: "Catálogo atualizado melhora a cobertura e a atualidade da busca" },
      { asset: BrainAsset.HistoricalData, description: "Resultado da sincronização (totais, erros) é registrado permanentemente" },
    ],
  },
  {
    eventType: TrustEventType.ConnectorSyncFailed,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Falha de sincronização é registrada permanentemente para diagnóstico operacional" },
    ],
  },
  // Release 1.7 — Wave 2 — Merchant Connectors + Scheduler + Discovery Events
  {
    eventType: TrustEventType.ConnectorSyncScheduled,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Execução automática via cron registrada permanentemente para auditoria operacional" },
    ],
  },
  {
    eventType: TrustEventType.ConnectorSyncSkippedEntitlement,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Bloqueio por limite de plano sinaliza oportunidade de upgrade — alimenta modelo de conversão" },
    ],
  },
  {
    eventType: TrustEventType.StoreDiscovered,
    assets: [
      { asset: BrainAsset.SearchIntelligence, description: "Nova loja descoberta amplia cobertura potencial do catálogo antes mesmo da reivindicação" },
    ],
  },
  // Release 1.7 — Wave 4 — Canonical Catalog & Compare Foundation Events.
  // Taxonomy only — nenhum destes é emitido nesta Wave (ver comentário em
  // types/enums.ts), mas o mapeamento de impacto no Brain já é declarado
  // para que a ingestão futura não exija revisitar esta decisão.
  {
    eventType: TrustEventType.CanonicalProductCreated,
    assets: [
      { asset: BrainAsset.SearchIntelligence, description: "Identidade canônica normaliza o catálogo, fortalecendo a base de busca/comparação" },
      { asset: BrainAsset.HistoricalData, description: "Início de um patrimônio de histórico de preço permanente, independente do connector de origem" },
    ],
  },
  {
    eventType: TrustEventType.OfferLinked,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Histórico de preço da oferta passa a agregar sob uma identidade permanente" },
    ],
  },
  {
    eventType: TrustEventType.OfferUnlinked,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Correção de vínculo — preserva a integridade do histórico agregado por produto canônico" },
    ],
  },
  {
    eventType: TrustEventType.MergeSuggested,
    assets: [
      { asset: BrainAsset.KnowledgeGraph, description: "Candidata a relação entre dois produtos canônicos, pendente de revisão humana" },
    ],
  },
  {
    eventType: TrustEventType.MergeApproved,
    assets: [
      { asset: BrainAsset.KnowledgeGraph, description: "Relação de identidade confirmada por humano — sinal de alta confiança para o grafo" },
      { asset: BrainAsset.SearchIntelligence, description: "Catálogo normalizado fica mais preciso a cada união confirmada" },
    ],
  },
  {
    eventType: TrustEventType.MergeRejected,
    assets: [
      { asset: BrainAsset.KnowledgeGraph, description: "Sinal negativo explícito — confirma que dois produtos NÃO são o mesmo, refinando o motor de matching" },
    ],
  },
  {
    eventType: TrustEventType.CanonicalViewed,
    assets: [
      { asset: BrainAsset.SearchIntelligence, description: "Visualização de um produto canônico específico sinaliza demanda real por aquele item" },
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Comportamento de navegação por identidade permanente, não por oferta isolada" },
    ],
  },
  {
    eventType: TrustEventType.CompareViewed,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Comparar ofertas é um sinal forte de intenção de compra" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Padrões de comparação alimentam futuras recomendações" },
    ],
  },
  {
    eventType: TrustEventType.PriceHistoryViewed,
    assets: [
      { asset: BrainAsset.BuyerBehavioralKnowledge, description: "Interesse em tendência de preço é um sinal de sensibilidade a preço do comprador" },
    ],
  },
  {
    eventType: TrustEventType.LowestPriceReached,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Marco de menor preço histórico é um ponto de dado permanente para o produto canônico" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Base para futuros alertas de menor preço (não implementados nesta Wave)" },
    ],
  },
  // Release 1.7 — Wave 5 — Merchant Acquisition & Ownership Platform Events.
  {
    eventType: TrustEventType.ClaimRequested,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Início do relacionamento de confiança entre o merchant e a loja reivindicada" },
      { asset: BrainAsset.KnowledgeGraph, description: "Candidata a relação Merchant↔Store, pendente de verificação" },
    ],
  },
  {
    eventType: TrustEventType.ClaimCancelled,
    assets: [{ asset: BrainAsset.MerchantTrust, description: "Sinal de abandono no funil de aquisição — informa o funil de conversão" }],
  },
  {
    eventType: TrustEventType.OwnershipVerified,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Propriedade verificada é um sinal de confiança central do merchant" },
      { asset: BrainAsset.KnowledgeGraph, description: "Confirma a relação Merchant↔Store no grafo de conhecimento" },
    ],
  },
  {
    eventType: TrustEventType.OwnershipRejected,
    assets: [{ asset: BrainAsset.MerchantTrust, description: "Sinal negativo explícito — alimenta a resistência a fraude do fluxo de claim" }],
  },
  {
    eventType: TrustEventType.OwnershipRevoked,
    assets: [{ asset: BrainAsset.MerchantTrust, description: "Revogação de propriedade é um evento de confiança permanente, mesmo após o fato" }],
  },
  {
    eventType: TrustEventType.ManagerInvited,
    assets: [{ asset: BrainAsset.MerchantTrust, description: "Estrutura organizacional do merchant (delegação) é um sinal de maturidade operacional" }],
  },
  {
    eventType: TrustEventType.ManagerAccepted,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Confirma que o convite de delegação foi aceito" },
      { asset: BrainAsset.KnowledgeGraph, description: "Adiciona a relação Delegate↔Merchant ao grafo de conhecimento" },
    ],
  },
  {
    eventType: TrustEventType.PremiumTrialStarted,
    assets: [{ asset: BrainAsset.RecommendationKnowledge, description: "Base para futura jornada de trial (nenhum mecanismo de trial real existe nesta Wave)" }],
  },
  {
    eventType: TrustEventType.PremiumUpgradeViewed,
    assets: [{ asset: BrainAsset.RecommendationKnowledge, description: "Interesse em upgrade sinaliza percepção de valor — insumo para a jornada de monetização" }],
  },
  {
    eventType: TrustEventType.PremiumActivated,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Merchant pagante é o sinal mais forte de confiança na plataforma" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Base para calibrar futuras recomendações de upgrade (ativação real ainda é manual nesta Wave)" },
    ],
  },

  // Release 1.8 — Program 0 — Wave 1 — Marketplace Operations Platform.
  // Registered for all five (required even for taxonomy-only events, same
  // discipline as the canonical-catalog Wave 4 entries) — only
  // MerchantPriorityTierChanged has a real factory function/emission (see
  // src/domains/marketplace-operations/events/marketplace-operations.events.ts).
  {
    eventType: TrustEventType.MerchantPriorityTierChanged,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Mudança de tier de prioridade reflete a evolução do valor de negócio do merchant" },
      { asset: BrainAsset.HistoricalData, description: "Registra a transição de tier no histórico permanente" },
    ],
  },
  {
    eventType: TrustEventType.MarketplaceHealthScoreChanged,
    assets: [{ asset: BrainAsset.HistoricalData, description: "Registra a evolução diária da saúde do marketplace como um todo" }],
  },
  {
    eventType: TrustEventType.ConnectorHealthDegraded,
    assets: [{ asset: BrainAsset.HistoricalData, description: "Registra degradação de saúde de conector para análise histórica de confiabilidade" }],
  },
  {
    eventType: TrustEventType.MarketplaceAlertRaised,
    assets: [{ asset: BrainAsset.HistoricalData, description: "Todo alerta operacional levantado fica registrado no histórico permanente" }],
  },
  {
    eventType: TrustEventType.MarketplaceCoverageSnapshotTaken,
    assets: [{ asset: BrainAsset.SearchIntelligence, description: "Cobertura de catálogo por categoria/marca alimenta futura relevância de busca" }],
  },

  // Release 1.8 — Program A — Wave 1 — Exchange Intelligence Platform.
  {
    eventType: TrustEventType.ExchangeRateSignificantMove,
    assets: [{ asset: BrainAsset.HistoricalData, description: "Movimentos cambiais significativos alimentam o Cross-Border Context Model (C-5)" }],
  },
  {
    eventType: TrustEventType.ExchangeProviderFailoverOccurred,
    assets: [{ asset: BrainAsset.HistoricalData, description: "Registra qual provedor de câmbio de fato atendeu cada ciclo, para auditoria de confiabilidade" }],
  },
  {
    eventType: TrustEventType.ExchangeProviderAllFailed,
    assets: [{ asset: BrainAsset.HistoricalData, description: "Falha total de provedores é registrada para análise de confiabilidade da fonte de câmbio" }],
  },
  {
    eventType: TrustEventType.StoreRateReactionFast,
    assets: [
      { asset: BrainAsset.MerchantTrust, description: "Reação rápida a movimento cambial é um sinal de operação ativa/atenta do merchant" },
      { asset: BrainAsset.HistoricalData, description: "Registra o tempo de reação da loja para análise histórica" },
    ],
  },
  {
    eventType: TrustEventType.StoreRateReactionSlow,
    assets: [{ asset: BrainAsset.HistoricalData, description: "Reação lenta a movimento cambial é registrada para análise de atualização de preços" }],
  },

  // Release 1.8 — Program A — Wave 2 — Real-Time Commerce Engine.
  // Taxonomy-only — see the doc comment on these TrustEventType members in
  // types/enums.ts for why none of these have a factory function/real
  // emission yet.
  {
    eventType: TrustEventType.PriceDropped,
    assets: [{ asset: BrainAsset.HistoricalData, description: "Queda de preço detectada alimenta o histórico de mudanças de mercado em tempo quase real" }],
  },
  {
    eventType: TrustEventType.PriceRaised,
    assets: [{ asset: BrainAsset.HistoricalData, description: "Aumento de preço detectado alimenta o histórico de mudanças de mercado em tempo quase real" }],
  },
  {
    eventType: TrustEventType.StockReturned,
    assets: [{ asset: BrainAsset.HistoricalData, description: "Retorno de estoque é um sinal de disponibilidade relevante para futuros alertas de comprador" }],
  },
  {
    eventType: TrustEventType.StockOut,
    assets: [{ asset: BrainAsset.HistoricalData, description: "Ruptura de estoque é registrada para análise de disponibilidade e confiabilidade da loja" }],
  },
  {
    eventType: TrustEventType.ProductCreated,
    assets: [{ asset: BrainAsset.SearchIntelligence, description: "Novo produto detectado em tempo quase real amplia a cobertura de catálogo disponível para busca" }],
  },
  {
    eventType: TrustEventType.PromotionDetected,
    assets: [
      { asset: BrainAsset.HistoricalData, description: "Promoção detectada por queda de preço acima do limiar é registrada para análise de campanhas" },
      { asset: BrainAsset.RecommendationKnowledge, description: "Base para futuros alertas de promoção ao comprador (não enviados nesta Wave)" },
    ],
  },
  {
    eventType: TrustEventType.StoreHighlyResponsive,
    assets: [{ asset: BrainAsset.MerchantTrust, description: "Alta responsividade a mudanças de mercado é um sinal de operação ativa da loja" }],
  },
  {
    eventType: TrustEventType.HighVolatilityDetected,
    assets: [{ asset: BrainAsset.RecommendationKnowledge, description: "Alta volatilidade de preço de um produto é insumo para futuras recomendações de timing de compra" }],
  },
  {
    eventType: TrustEventType.LowVolatilityDetected,
    assets: [{ asset: BrainAsset.RecommendationKnowledge, description: "Baixa volatilidade indica preço estável — insumo para confiança na decisão de compra" }],
  },
  {
    eventType: TrustEventType.MarketTrendDetected,
    assets: [{ asset: BrainAsset.HistoricalData, description: "Tendência de mercado (categoria mais barata/mais cara) é registrada no histórico do Market Pulse" }],
  },
];

export function getBrainImpact(eventType: TrustEventType): BrainAsset[] {
  const entry = TRUST_EVENT_BRAIN_IMPACT.find((e) => e.eventType === eventType);
  return entry ? entry.assets.map((a) => a.asset as BrainAsset) : [];
}
