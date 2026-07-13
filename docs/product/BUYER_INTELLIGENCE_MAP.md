# BUYER_INTELLIGENCE_MAP.md
# PROGRAM Π (PI) — MISSION Π-1: Buyer Intelligence Surface — Objetivos 1-4

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: estratégia apenas. Nenhum código, API, schema ou arquitetura foi alterado. Inventário gerado por leitura direta de todos os 14 domínios em `src/domains/` — não é uma amostra.
**Continua**: `docs/product/BUYER_JOURNEY.md`, `BUYER_VALUE_MATRIX.md` (Mission Λ-1) — Λ-1 já havia identificado o padrão geral ("a inteligência existe, nunca chegou ao comprador"); esta Mission faz o inventário exaustivo, serviço por serviço, que a Λ-1 não tinha feito em profundidade total.

---

## 1. Método

Para cada domínio, cada serviço real (não helper interno) responde três perguntas, na ordem do mandato:

1. **Hoje ele responde qual pergunta?**
2. **Quem consome essa resposta?** (Merchant / Sistema-Cron / Observatory-Admin / Ninguém)
3. **Como essa mesma informação poderia virar experiência de comprador?** (não backend — tela, momento da jornada)

"Ninguém" é usado quando um serviço é real, testado e roda em produção, mas nenhuma rota/página/cron o invoca hoje (achado já visto na Mission Λ-1 para `CompareFoundationService`/`OfferRankingService` — não é um caso isolado, é confirmado abaixo em pelo menos 3 outros serviços).

## 2. Inventário completo por domínio

### 2.1 `canonical-catalog/` — identidade de produto cross-merchant

| Serviço | Pergunta que responde hoje | Consumidor hoje | Reframe para comprador |
|---|---|---|---|
| `CompareFoundationService` | "Quais ofertas existem para este produto canônico, ranqueadas, com agregação de preço?" | **Ninguém** (confirmado no próprio código: "no page consumes it yet") | Base técnica direta da tela de comparação/produto — Card "Melhor Oportunidade" |
| `OfferRankingService` | "Qual oferta é a melhor, e por quê (preço/disponibilidade/recência/confiança/qualidade)?" | Ninguém (só chamado internamente por `CompareFoundationService`, que também não é consumido) | Card "Loja Recomendada" |
| `CanonicalPriceHistoryService` | "Qual a série histórica de preço deste produto canônico, agregada entre lojas?" | Ninguém | Card "Histórico" / insumo de "Vale comprar hoje" |
| `CanonicalProductService` | "Qual é o produto canônico correspondente a este produto de loja?" | Sistema (pipeline de conectores, bootstrap) | Nenhum diretamente — é infraestrutura de identidade, não uma resposta de valor por si só |

### 2.2 `market-insights/` — inteligência de mercado (Release 1.8 Program C)

| Serviço | Pergunta | Consumidor hoje | Reframe |
|---|---|---|---|
| `PriceIntelligenceService` (`PriceStatistics`) | "Qual a mediana/dispersão/faixa de preço deste produto entre lojas?" | Observatory (`cpc-report`/observatory scripts, admin) | Card "Preço Justo" / "Preço Abaixo da Média" |
| `PriceIntelligenceService` (`SavingsOpportunity`) | "Qual a economia máxima possível neste produto (loja mais barata × mais cara)?" | Observatory | Card "Economia" |
| `MarketPulseInsightsService` (`CanonicalMarketMover`) | "Quais produtos canônicos mais subiram/desceram de preço hoje?" | Observatory | Card "Vale Comprar Hoje" / Home |
| `VolatilityRollupService` (`CanonicalVolatilityProfile`) | "Este produto tem preço estável ou volátil, e por quê?" | Observatory | Card "Vale Esperar?" (Λ-1) |
| `VolatilityRollupService` (`MerchantAggressivenessProfile`) | "Esta loja costuma baixar preço com que frequência?" | Observatory | Sinal de apoio a "Loja Recomendada" |
| `PriceHistoryQueryService` | "Qual o histórico bruto de preço de uma oferta?" | Observatory / `CanonicalPriceHistoryService` | Insumo de "Histórico" |

### 2.3 `realtime-commerce/` — detecção de mudança e velocidade de mercado

| Serviço | Pergunta | Consumidor hoje | Reframe |
|---|---|---|---|
| `ChangeDetectionService`/`ChangeDetector` | "O que mudou nesta oferta desde a última sincronização (preço, estoque, descrição)?" | Sistema (pipeline de conectores, `MarketChangeDetectionStage`) | Insumo de todos os cards de preço/estoque abaixo |
| `VolatilityEngine`/`VolatilityService` | "Qual a frequência/amplitude/velocidade/persistência de mudança de preço deste produto-na-loja?" | Observatory, `VolatilityRollupService` | Insumo de "Vale Esperar?", "Preço em Queda/Alta" |
| `FreshnessEngine`/`FreshnessService` | "Há quanto tempo esta oferta não é atualizada?" | Ranking interno (`OfferRankingService`), Observatory | Selo "atualizado há Xh" — confiança quase grátis |
| `MarketPulseService` | "Quantos preços mudaram hoje, quais categorias/lojas mais se moveram?" | Observatory/Admin (`/admin/monitor`-adjacent) | Home / "Vale Comprar Hoje" |
| `LiveActivityFeedService` | "O que aconteceu no mercado nas últimas horas, em linguagem de feed?" | Observatory | Prova social de que a plataforma está "viva" |
| `StoreUpdateEngine`/`StoreUpdateIntelligenceService` | "Quão rápido esta loja reage ao mercado (frequência de update, velocidade de reação)?" | Observatory/Admin | Selo "loja sempre atualizada" (apoio a Confiança) |
| `BuyerAlertEngine`/`BuyerAlertService` | "Este evento de mercado merece virar um alerta para compradores, com qual prioridade?" | **Ninguém recebe** — classifica, nunca envia (sem identidade de comprador, sem canal) | Card "Preço em Queda"/"Alertas" — já nomeado na Λ-1 como maior valor futuro |
| `RealtimeCommerceDashboardService` | Composição de tudo acima para uma tela | Admin (`/admin`) | N/A — é a versão admin do que este documento propõe para comprador |

### 2.4 `exchange/` — câmbio

| Serviço | Pergunta | Consumidor hoje | Reframe |
|---|---|---|---|
| `ExchangeRateService`/`AutomaticCurrencyService` | "Qual a cotação atual USD/BRL/PYG, e a conversão explicável de um preço?" | Sistema (conversão de preço em `offers`), parcialmente já usado no catálogo público | Já parcialmente exposto (preço em USD) — falta expor a taxa/data de captura como prova de transparência |
| `ExchangeProviderHealthService` | "O provedor de câmbio está saudável?" | Sistema/Admin | Nenhum — puramente operacional |
| `ExchangeHistoryService` | "Como a cotação variou nos últimos N dias?" | Admin (`/admin/exchange`) | Complemento de "Vale Esperar?" para produtos sensíveis a câmbio |
| `ExchangeAnalyticsService` (`computeBuyerSavings`) | "Quanto os compradores economizaram no agregado, graças a variação cambial/preço?" | Admin (`/admin/exchange`) — é um KPI de negócio, não uma experiência individual | Reformulável como um número agregado tipo "compradores economizaram US$X esta semana" (prova social, não pessoal) |
| `ExchangeDashboardService` | Composição de tudo acima para uma tela | Admin | N/A |

### 2.5 `trust/` — confiança e reputação (maior domínio do sistema)

| Serviço | Pergunta | Consumidor hoje | Reframe |
|---|---|---|---|
| `TrustService` | "Qual o registro de confiança desta loja (status, badge)?" | Merchant (Command Center), Admin, parcialmente `/lojas/[slug]` | Card "Maior Confiança" |
| `BadgeService` | "Que selo esta loja tem ativo (Basic/Verified/Premium)?" | Merchant/Admin, parcialmente `/lojas/[slug]` | Selo visível no card de oferta, não só na página da loja |
| `TrustSignalService` | "Que sinais de confiança específicos esta loja tem (identidade validada, localização confirmada, parceiro oficial)?" | Merchant/Admin | Lista de fatos no card de "Maior Confiança" — nunca um score único |
| `VerificationService`/`VerificationAuditService`/`VerificationEvidenceService`/`VerificationHistoryService` | "Esta loja passou por qual processo de verificação, com qual evidência?" | Merchant/Admin (fluxo de claim) | Prova por trás do selo — não uma tela própria, mas o "porquê" do selo |
| `ReviewService`/`ReviewModerationService` | "Quais reviews esta loja tem, aprovados?" | Merchant/Admin — **nunca alimentado por comprador real** (achado da Λ-1/Buyer Identity Model) | Depende de identidade de comprador — não é "hoje", é backlog da Trilha B (Λ-1) |
| `MerchantTimelineService` | "Qual o histórico de eventos públicos desta loja?" | `/lojas/[slug]` (parcial) | Complemento de Confiança — "loja ativa há X, Y eventos verificados" |
| `MerchantPassportService` | "Resumo consolidado de confiança desta loja, pronto para exibição pública" | `/lojas/[slug]` | Já é, estruturalmente, o serviço mais próximo de um "Card de Confiança" pronto — só precisa aparecer também na comparação, não só na página da loja |
| `MerchantProfileService` | Perfil consolidado da loja | Merchant/Admin/`/lojas/[slug]` | N/A, já parcialmente exposto |
| `EventService` (Brain) | "Que eventos de confiança já ocorreram, para alimentar o Brain?" | Sistema (Brain) | Nenhum diretamente — infraestrutura |

### 2.6 `catalog-intelligence/` — saúde do catálogo

| Serviço | Pergunta | Consumidor hoje | Reframe |
|---|---|---|---|
| `ProductHealthService` | "Este anúncio de produto está completo (imagem, categoria, marca, descrição, preço, estoque)?" | Merchant (Catalog Health, Command Center) | Selo discreto "anúncio completo" — sinal de confiança indireto no card de oferta |
| `CatalogHistoryService` | "Como a saúde do catálogo deste lojista evoluiu no tempo?" | Merchant | Nenhum diretamente relevante ao comprador (é sobre o lojista, não sobre uma decisão de compra) |

### 2.7 `merchant-intelligence/`, `merchant-analytics/`, `merchant-decision/`, `growth-engine/`, `marketplace-operations/`, `merchant-ownership/` — 100% merchant/admin/sistema, zero reframe direto para comprador

Estes 6 domínios (Command Center, Analytics Platform, Decision Engine, Growth Engine, Marketplace Operations, Merchant Ownership) foram auditados integralmente (`ExecutiveSummaryService`, `MerchantHealthService`, `QuickActionsService`, `EventPlatformService`, `SessionService`, `FunnelService`, `MerchantAnalyticsService`, `RecommendationEngine`/`PrioritizationEngine`/`OpportunityDetector` (merchant-decision), `PriorityEngine`/`RecommendationEngine`/`TodaysPlanService`/`OpportunityCenterService` (growth-engine), `MarketplaceCoverageService`/`MarketplaceSnapshotService`/`MerchantPriorityService`/`MarketplaceAlertService`/`ConnectorHealthService`, `ClaimService`/`DelegationService`/`OwnershipLevelService`/`PremiumUpgradeService`). **Nenhum tem um reframe direto e honesto para o comprador** — todos respondem perguntas sobre o lojista ("como este lojista está indo", "o que ele deveria priorizar", "quão saudável está o marketplace do ponto de vista operacional"). A única exceção parcial é o `FunnelService` (`merchant-analytics`), cujos eventos (`Search`, `ProductImpression`, `ProductClicked`) são gerados pelo comportamento do comprador — mas o serviço em si responde "como o lojista está performando no funil", não "o que o comprador deveria fazer agora". **Isso não é uma lacuna desta Mission** — é a confirmação, com evidência exaustiva, do achado central da Λ-1: a intelligence construída em Release 1.6-1.9 foi construída para o lado lojista quase inteiramente por desenho, não por descuido.

### 2.8 `product-identity/`, `connectors/` — infraestrutura pura, zero reframe

`ProductIdentityService` (Shadow Mode) e `CanonicalMergeSuggestionService` respondem "este produto é o mesmo que aquele?" — pergunta de sistema, nunca de comprador diretamente (o comprador nunca deveria ver "confiança de match = 87" — ele vê o resultado, que é o próprio Canonical Catalog já unificado). `connectors/` (SyncOrchestrator, stages, `ConnectorHealthService`, `DiscoveryService`) é 100% pipeline de ingestão e observabilidade operacional — nenhuma pergunta aqui é uma pergunta de comprador.

## 3. BUYER INTELLIGENCE MAP — a matriz pedida (Objetivo 4)

| Serviço | Dado produzido | Valor para o comprador | Momento da jornada | Tela | Prioridade |
|---|---|---|---|---|---|
| `CompareFoundationService` + `OfferRankingService` | Ofertas ranqueadas + preço agregado por produto canônico | Decide em qual loja comprar, com razão explícita | Comparação (Etapa 3, `BUYER_JOURNEY.md`) | Página de produto, `/compare/[slug]` | **P0** |
| `MarketPulseInsightsService` (`CanonicalMarketMover`) | Maiores quedas/altas de preço do dia | Descobre oportunidade sem precisar procurar | Gatilho/Descoberta (Etapas 1-2) | Home | **P0** |
| `PriceIntelligenceService` (`SavingsOpportunity`) | Economia máxima estimada por produto | Quantifica o valor de escolher a loja certa | Comparação/Decisão (Etapas 3-5) | Card de produto/comparação | **P0** |
| `PriceIntelligenceService` (`PriceStatistics`) | Mediana/dispersão/faixa de preço | Sabe se um preço é caro ou barato, objetivamente | Comparação (Etapa 3) | Card de produto | **P0** |
| `TrustSignalService`/`BadgeService`/`MerchantPassportService` | Selos e sinais de confiança factuais | Decide se confia na loja | Confiança (Etapa 4) | Card de oferta + página de loja | **P0** |
| `CanonicalPriceHistoryService` | Série histórica de preço agregada | Contextualiza se o preço de hoje é bom | Decisão (Etapa 5) | Página de produto | **P1** |
| `VolatilityRollupService` (`CanonicalVolatilityProfile`) + `CanonicalPriceHistoryService` | Classificação de estabilidade + histórico | "Vale esperar ou comprar agora?" | Decisão (Etapa 5) | Página de produto | **P1** |
| `FreshnessEngine` | Idade do dado da oferta | Confia que o preço visto ainda é válido | Finalização (Etapa 6) | Card de oferta | **P1** |
| `ExchangeRateService`/`ConvertedPrice` | Taxa de câmbio usada, com data de captura | Confia na conversão de moeda | Finalização (Etapa 6) | Card de preço | **P1** |
| `StoreUpdateIntelligenceService` | Velocidade de reação da loja ao mercado | Sinal extra de confiabilidade da loja | Confiança (Etapa 4) | Página de loja | **P2** |
| `MerchantAggressivenessProfile` | Loja costuma baixar preço com frequência | Sinal de "vale acompanhar esta loja" | Decisão (Etapa 5) | Página de loja | **P2** |
| `ProductHealthService` | Completude do anúncio | Sinal indireto de confiabilidade do anúncio | Comparação (Etapa 3) | Card de produto | **P2** |
| `LiveActivityFeedService`/`MarketPulseService` (feed) | Atividade recente do mercado | Prova social de atualidade da plataforma | Descoberta (Etapa 2) | Home | **P2** |
| `BuyerAlertEngine` | Eventos alertáveis classificados (queda, restock, promo, novo produto) | Ser avisado sem precisar voltar a procurar | Retorno (Etapa 7) | Notificação (canal inexistente) | **P3 — bloqueado** (identidade + canal, decisão do CTO) |
| `ExchangeAnalyticsService` (`computeBuyerSavings`) | Economia agregada de todos os compradores | Prova social de marca ("compradores economizaram US$X") | Descoberta (Etapa 2) | Home/marketing | **P3** |
| `ReviewService` | Reviews de compradores | Confiança social direta | Confiança (Etapa 4) | Página de produto/loja | **P3 — bloqueado** (nunca alimentado por comprador real, precisa de identidade) |

Prioridade segue o mesmo ICE detalhado em `BUYER_EXPERIENCE_PRIORITIES.md` — esta coluna é a leitura resumida.

Ver `INTELLIGENCE_CARD_LIBRARY.md` para o desenho de cada card nomeado no Objetivo 5, e `BUYER_INTELLIGENCE_LAYER.md` para a arquitetura de composição que reaproveita tudo acima sem criar nenhuma inteligência nova.
