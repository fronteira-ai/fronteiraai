# BUYER_VALUE_MATRIX.md
# PROGRAM Λ (LAMBDA) — MISSION Λ-1 — Objetivo 2/3: Buyer Value Matrix

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: estratégia apenas. Inventário gerado por leitura direta do código real (`src/domains/*`, `services/*`, `types/*`) — nenhuma suposição sobre o que "deveria" existir.

---

## 1. Método

Para cada dado/capacidade já real no sistema, três eixos:

- **Valor para o usuário** (Alto/Médio/Baixo) — quanto isso muda a qualidade de uma decisão de compra real (`NORTH_STAR.md` filtro 6: "um comprador real, hoje, toma uma decisão melhor por causa disso?").
- **Complexidade técnica** (Baixa/Média/Alta) — **para expor**, não para construir. A maior parte do que está listado abaixo já é computado por um serviço real e testado; a complexidade referida é a de construir a superfície de UI/API que o mostra ao comprador, dado que nenhuma implementação de frontend está no escopo desta Mission.
- **Impacto comercial** (Alto/Médio/Baixo) — efeito sobre retenção/recorrência do comprador e, indiretamente, sobre os ativos que o negócio já declarou estratégicos (`STRATEGIC_ASSETS.md`) — nunca sobre cobrança direta ao comprador, que `BUSINESS_MODEL.md` já define como fora do modelo ("o comprador não paga pelo serviço — ele paga com dados").

## 2. A distinção central desta matriz

**Quase tudo abaixo já existe e já está computado.** O que falta, na esmagadora maioria dos casos, não é engenharia de dado nova — é uma página, um componente ou um endpoint que já poderia ler um serviço que já roda. Isso muda fundamentalmente o cálculo de complexidade de qualquer roadmap de Buyer Experience: não estamos no estágio "vamos construir inteligência", estamos no estágio "vamos parar de esconder a inteligência que já construímos para lojista/operação e virá-la para o comprador".

## 3. Matriz

| Dado/Capacidade | Fonte real (código) | Valor p/ usuário | Complexidade (expor) | Impacto comercial | Nota |
|---|---|---|---|---|---|
| Preço + disponibilidade por oferta | `products`/`offers`, `services/offer.service.ts` | Alto | Baixa (já exposto) | Alto | Base do catálogo, já em produção |
| Comparação de preço entre lojas (produto raso) | `services/compare.service.ts`, `/compare/[slug]` | Alto | Baixa (já existe) | Alto | Só compara `products` da mesma loja de origem — não uni­fica entre lojas |
| **Comparação de preço entre lojas (produto canônico, cross-merchant)** | `CompareFoundationService`, `OfferRankingService` (`canonical-catalog`) | **Muito Alto** | **Baixa** — serviço pronto, testado, zero consumidor hoje | **Alto** | O maior "quick win" desta Mission — ver `AI_EXPERIENCE_BLUEPRINT.md` §1 |
| Ranking explicável de oferta (preço/disponibilidade/recência/confiança/qualidade) | `OfferRankingService` | Alto | Baixa (fatores já existem, só não são exibidos) | Alto | Cada fator já tem `evidence` textual — pronto para virar "por que recomendamos esta loja" |
| Estatística de preço por produto (mediana, dispersão, faixa) | `PriceStatistics` (`market-insights`) | Alto | Baixa | Médio | Responde "isso é caro ou barato" objetivamente |
| Economia máxima estimada (melhor vs. pior preço) | `SavingsOpportunity` (`market-insights`) | Muito Alto | Baixa | Alto | Número que vende a proposta de valor sozinho ("economize até US$X") |
| Histórico de preço agregado por produto canônico | `CanonicalPriceHistoryService` | Alto | Baixa | Médio | Pré-requisito direto de "Vale esperar?" |
| Classificação de volatilidade (produto/categoria) | `CanonicalVolatilityProfile`, `CategoryVolatilityProfile` (`market-insights`), `VolatilityEngine` (`realtime-commerce`) | Muito Alto | Média (precisa virar linguagem natural, não só um score) | Alto | É literalmente o insumo de "Compra Inteligente" já nomeado no `RELEASE_1_8_BLUEPRINT.md` Cap. 6 |
| Agressividade de preço por loja (tende a baixar mais?) | `MerchantAggressivenessProfile` (`market-insights`) | Médio | Baixa | Médio | Sinal de "essa loja costuma fazer promoção real" |
| Maiores variações do dia (mercado) | `CanonicalMarketMover` (`market-insights`), `MarketPulseService` (`realtime-commerce`) | Alto | Baixa | Médio | Conteúdo de entrada/gancho (Home, SEO) — "o que caiu de preço hoje" |
| Feed de atividade do mercado | `LiveActivityFeedService` (`realtime-commerce`) | Médio | Baixa | Baixo-Médio | Prova de que a plataforma está "viva", reforça confiança na atualidade do dado |
| Frescor do dado da oferta (quão recente é) | `FreshnessScore`/`FreshnessEngine` (`realtime-commerce`) | Alto | Baixa | Médio | Hoje só ranking interno — exibir "atualizado há 2h" é confiança quase grátis |
| Velocidade de reação da loja ao mercado | `StoreUpdateProfile` (`realtime-commerce`) | Médio | Média | Médio | Poderia virar um badge "loja sempre atualizada" |
| Alertas classificados (queda de preço, voltou ao estoque, promoção, novo produto) | `BuyerAlertEngine`/`BuyerAlertService` (`realtime-commerce`) | Muito Alto | **Alta** — falta identidade de comprador + canal de notificação (ambos Tipo 1, não decididos) | Alto | Já classifica, nunca envia — bloqueado por decisão de produto/infra, não por dado faltante |
| Câmbio em tempo real + conversão explicável | `ExchangeRateService`/`AutomaticCurrencyService`/`ConvertedPrice` (`exchange`) | Alto | Baixa | Médio | `ConvertedPrice` já carrega a taxa exata usada e a data de captura — transparência pronta |
| Badges de confiança da loja (verificação, identidade, localização, parceiro oficial) | `TrustSignalType`/`TrustBadge` (`trust`) | Muito Alto | Baixa (já existem, exibição parcial em `/lojas/[slug]`) | Alto | Por design, nunca um score opaco — "Zero Reputation Score" é regra permanente, isso é uma vantagem de comunicação, não uma limitação |
| Reviews de compradores | Schema `merchant_reviews` (trust) | Alto | Alta | Alto (futuro) | Tabela existe, `reviewer_id` nunca foi alimentado por comprador real (achado do Buyer Identity Model) — depende do mesmo pré-requisito de identidade |
| Saúde/completude do anúncio (imagem, especificação, preço, estoque) | `ProductHealthStatus`/`ProductDiagnosisType` (`catalog-intelligence`) | Médio | Baixa | Baixo-Médio | Hoje é sinal para o lojista (Catalog Health); poderia virar um selo discreto "anúncio completo" para o comprador |
| Comportamento anônimo (busca, clique, comparação, salvamento) | `buyer_events`/`buyer_sessions` (Release 1.6) | Alto (futuro) | Alta | Alto (futuro) | **Já coletado, mas com gap de LGPD/segurança real e não corrigido** (sem rate limit, sem aviso de privacidade — achado do Buyer Identity Model) — não deve alimentar nenhuma feature nova antes desse gap fechar |
| Identidade de comprador persistente (conta, favoritos server-side, histórico entre sessões) | Proposto, não implementado (`RELEASE_1_8_BUYER_IDENTITY_MODEL.md`, aguardando aprovação) | Muito Alto | Alta | Muito Alto | Pré-requisito estrutural de quase toda personalização — sem isso, "Alertas" e "Histórico" não têm onde persistir |
| Favoritos | `hooks/useFavorites.ts` (localStorage) | Médio (hoje), Alto (com sync) | Baixa hoje / Média para sincronizar | Médio | Já existe como conceito de UI, preso ao dispositivo |
| Vocabulário de grafo de comprador no Brain (`BuyerViewed`, `BuyerReviewed`, etc.) | `BrainEntityType.Buyer`, `GraphRelationType` (`trust/types/enums.ts`) | Alto (futuro) | Alta | Alto (futuro) | Reservado desde Release 1.5, nunca emitido — espera identidade de comprador |

## 4. Leitura por quadrante

**Alto valor + Baixa complexidade (fazer primeiro)**: comparação cross-merchant real (`CompareFoundationService`), economia estimada (`SavingsOpportunity`), estatística de preço (`PriceStatistics`), badges de confiança já existentes, frescor do dado, câmbio explicável. Nenhum destes exige decisão Tipo 1 nem novo dado — só exposição.

**Alto valor + Alta complexidade (o próximo grande passo, não o primeiro)**: alertas entregues de verdade, reviews de comprador, histórico persistente, personalização — todos dependem do mesmo pré-requisito estrutural (Buyer Identity Model + canal de notificação, ambos decisões Tipo 1 já nomeadas e pendentes de ADR do CTO).

**Médio valor**: agressividade de preço por loja, velocidade de reação da loja, saúde do anúncio — bons complementos, não motores de decisão sozinhos.

**Não perseguir agora**: qualquer feature que dependa de `buyer_events` além do que já é anônimo e agregado — o gap de LGPD/rate-limiting já identificado é um risco real em produção hoje, não uma nota de rodapé, e deveria ser corrigido antes (não depois) de qualquer feature nova que aumente a dependência desse dado.

Ver `AI_EXPERIENCE_BLUEPRINT.md` para o desenho das experiências construídas sobre este inventário e `BUYER_INTELLIGENCE_ROADMAP.md` para a priorização ICE.
