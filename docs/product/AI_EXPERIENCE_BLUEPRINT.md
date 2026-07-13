# AI_EXPERIENCE_BLUEPRINT.md
# PROGRAM Λ (LAMBDA) — MISSION Λ-1 — Objetivo 4: Primeiras Experiências Premium

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: estratégia/desenho apenas. Nenhuma implementação, nenhum componente, nenhuma rota.
**Convenção de honestidade**: toda experiência abaixo é classificada como **Real hoje** (o backend já calcula isso, falta só UI), **Real com lacuna** (o backend calcula parte, falta uma peça nomeada) ou **Depende de pré-requisito** (bloqueada por uma decisão Tipo 1 ainda não tomada). Nenhuma é descrita como "IA" no sentido de modelo generativo/caixa-preta — toda esta plataforma segue a mesma disciplina de explainability já estabelecida (`ProgressiveVerificationEngine`, `OfferRankingService`, `ProductIdentityEngine`: todo score tem fatores nomeados, nunca um número sem explicação). "IA explica" (item 8) é a única experiência desta lista que é sobre linguagem natural, não sobre um algoritmo novo.

---

## Nota sobre "Premium"

`BUSINESS_MODEL.md` estabelece, como doutrina permanente, que **o comprador não paga pelo serviço** — ele paga com dados/atenção; quem paga é o lojista (B2B). Portanto "Premium" neste documento significa **experiência de qualidade premium, gratuita para o comprador** — não um paywall. Isso não é uma limitação a contornar; é a mesma lógica que já faz o catálogo, a busca e o compare serem gratuitos hoje. Qualquer desvio dessa doutrina (ex.: um tier pago para turistas frequentes) seria uma mudança de modelo de negócio, fora do escopo desta Mission, e precisaria do mesmo tipo de decisão formal que `BUSINESS_MODEL.md` já exige para novos Assets.

---

## 1. Melhor Compra Hoje

**O que é**: um raio-x diário de "o que está com o melhor preço relativo agora" — por categoria ou geral.
**Status**: Real hoje. `CanonicalMarketMover` (`market-insights`) + `MarketPulseService.computeToday()` (`realtime-commerce`) já respondem exatamente isso — maiores quedas de preço do dia, por produto canônico (não duplicado por loja).
**Onde viveria**: Home (substituindo/complementando a atual seção "produtos em destaque", que hoje não é orientada a preço) e como página própria compartilhável (`/melhor-compra-hoje` ou similar).
**Por que muda a decisão do comprador**: transforma "eu preciso navegar para descobrir uma oportunidade" em "a oportunidade já está na porta de entrada" — literalmente o motivo funcional para abrir o ParaguAI antes do Google (Google não tem esse dado agregado; só um agregador com Canonical Catalog cross-merchant tem).

## 2. Preço Justo

**O que é**: para um produto específico, mostrar se o preço visto está dentro, acima ou abaixo do range normal do mercado.
**Status**: Real hoje. `PriceStatistics` (mediana, dispersão, faixa) já calcula exatamente isso por produto canônico.
**Desenho da explicação**: nunca "preço justo: sim/não" como um veredito opaco — sempre com o número por trás: "este preço está X% abaixo da mediana de N lojas" (mesma disciplina de `OfferRankingService.factors`, cada fator com `evidence`).
**Onde viveria**: página de produto, ao lado do preço, e no card de resultado de busca/comparação.

## 3. Vale Esperar?

**O que é**: a experiência mais avançada desta lista — já nomeada em `RELEASE_1_8_BLUEPRINT.md` Capítulo 6 como "Compra Inteligente": "este produto historicamente cai de preço em [contexto]; variação dos últimos 90 dias foi X%; hoje está Y% abaixo/acima da média".
**Status**: Real com lacuna. `CanonicalVolatilityProfile`/`VolatilityEngine` (frequência/amplitude/velocidade/persistência) e `CanonicalPriceHistoryService` já calculam os insumos; falta **apenas** a camada de composição em linguagem natural que junta os dois em uma frase (não um modelo novo — uma função de template sobre os fatores já existentes, mesmo padrão do `explainabilityReason` do `ProductIdentityEngine`).
**Risco a nomear explicitamente**: isso não deve nunca virar uma previsão ("o preço VAI cair") — sempre um contexto histórico factual ("historicamente cai", "está X% acima da média"), pela mesma razão que o Blueprint já registrou: "nunca uma previsão opaca".

## 4. Histórico

**O que é**: gráfico/linha do tempo de preço por produto (por loja e agregado).
**Status**: Real hoje, com uma lacuna já nomeada em `FEATURES.md` desde Release 1.4 ("Price History visível para compradores — planejado 1.5", nunca implementado). `CanonicalPriceHistoryService` já agrega; falta a visualização.
**Onde viveria**: página de produto, aba/seção dedicada.
**Nota**: este é o item da lista com o débito de produto mais antigo — já era conhecido e priorizado há Releases, nunca implementado por não ser o foco de nenhuma Wave desde então.

## 5. Confiança

**O que é**: por que confiar nesta loja especificamente.
**Status**: Real hoje, exposição parcial. Badges (`TrustSignalType`: empresa verificada, identidade validada, localização confirmada, parceiro oficial, documentação verificada, operação recorrente) já existem e já aparecem parcialmente em `/lojas/[slug]`. O que falta é levar o mesmo sinal para o **momento de decisão** (card de oferta na comparação/busca), não só para a página institucional da loja.
**Desenho**: nunca um score único — sempre a lista de fatos verificáveis, coerente com "Zero Reputation Score" (regra permanente). Isso é, na prática, uma vantagem de comunicação: "empresa verificada, presente há X anos, parceiro oficial" é mais convincente e mais defensável legalmente do que "confiança: 87/100".

## 6. Loja Recomendada

**O que é**: dentre as lojas que vendem o produto, qual é a recomendada — e por quê.
**Status**: Real hoje. É literalmente `OfferRankingService.rank()` — já pondera preço (40), disponibilidade (20), recência (15), confiança/verificação (15), qualidade do anúncio (10), com `factors[]` explicáveis por oferta. Hoje essa lógica só é usada internamente (`CompareFoundationService`, sem consumidor de UI).
**Desenho**: o card "loja recomendada" mostra o ranking Nº1 com os 2-3 fatores que mais pesaram ("melhor preço entre 4 lojas" + "loja verificada" + "atualizado hoje") — nunca um black-box "recomendamos esta loja".

## 7. Economia estimada

**O que é**: "comprando aqui em vez de na loja mais cara, você economiza US$X (Y%)".
**Status**: Real hoje. `SavingsOpportunity` já calcula exatamente `maxSavingsUSD`/`maxSavingsPercent` entre a loja mais barata e a mais cara por produto canônico.
**Por que importa mais que os outros números**: é o único número desta lista que comunica valor em **uma linha, sem exigir interpretação** — o melhor candidato a aparecer em compartilhamento social/WhatsApp (o canal de aquisição que `BUSINESS_MODEL.md` já nomeia como o mais escalável e defensável — word of mouth).

## 8. IA explica

**O que é**: a única experiência desta lista sobre **linguagem**, não sobre um novo cálculo — pegar os fatores já existentes (de `OfferRankingService`, `PriceStatistics`, `CanonicalVolatilityProfile`) e compô-los em uma explicação legível, tipo "por que este é o melhor negócio hoje".
**Status**: Real com lacuna — todos os insumos existem, nenhum tem hoje uma camada de composição textual voltada ao comprador (o `explainabilityReason` do `ProductIdentityEngine` é o precedente de arquitetura mais próximo, mas é interno/de auditoria, nunca voltado a UI de comprador).
**Restrição de design, não negociável dado o histórico do projeto**: template determinístico sobre dado real (mesma regra já escrita para conteúdo de SEO no Capítulo 7 do Blueprint: "conteúdo gerado programaticamente deve sempre ser lastreado em dado real e único") — nunca um LLM generativo sem grounding, o que criaria risco de alucinação sobre preço/estoque real, inaceitável no domínio de compra.

## 9. Alternativas / Produtos equivalentes

**O que é**: "este produto exato está esgotado/caro aqui, mas este outro (mesma categoria/especificação) é equivalente e mais barato".
**Status**: Real com lacuna importante. Depende de `canonical_products`/Product Identity para saber o que é "equivalente" — e a Mission Κ (`docs/product/PRODUCT_IDENTITY_DECISION_REPORT.md`, `TAXONOMY_ARCHITECTURE_RECOMMENDATION.md`) já mediu que o cross-merchant matching de produtos **idênticos** (mesmo produto, lojas diferentes) tem cobertura ainda crescente (CPC baixo) — "equivalente" (produtos diferentes, mesma função) é uma pergunta ainda mais difícil, que nenhum domínio hoje responde. **Não prometer isso como pronto** — é uma extensão natural do Product Identity, mas exigiria trabalho de matching por atributo/categoria que este documento não pode chamar de "já existe".

## 10. Acessórios

**O que é**: "quem compra X também precisa de Y" (capinha para celular, cabo para notebook).
**Status**: Depende de pré-requisito. A Mission Κ (`CATEGORY_SIMILARITY_ANALYSIS.md` §5) mediu que a relação "produto × seu acessório" é hoje o padrão de fragmentação de categoria mais comum (377 pares) e **não está modelada** — não existe hoje nenhuma estrutura de dado que ligue "Celulares" a "Capinha para Celular" como uma relação de acessório. Construir isso exigiria a Fase 2 da Universal Taxonomy (`parent_id` real) recomendada por aquela Mission. Não é inviável — é sequencialmente depois, não uma "primeira" experiência.

## 11. Alertas

**O que é**: avisar o comprador quando o preço de algo que ele quer cai, volta ao estoque, ou vira promoção.
**Status**: Real com lacuna estrutural (a maior desta lista). `BuyerAlertEngine` já classifica exatamente esses 4 eventos com prioridade — mas **nunca envia nada** (comentário no próprio código: "NEVER sends anything... no buyer-follow/watchlist mechanism exists yet"). Bloqueado por duas decisões Tipo 1 já nomeadas e pendentes de ADR do CTO: Buyer Identity Model (`RELEASE_1_8_BUYER_IDENTITY_MODEL.md`, proposto) e provedor de notificação (push/e-mail, nenhum decidido).
**Não é uma feature para "primeira onda"** — é a mais valiosa de todas a médio prazo (fecha o loop de retorno da Etapa 7 da jornada, `BUYER_JOURNEY.md`), mas literalmente não pode começar antes dessas duas decisões, que são do CTO, não de engenharia.

---

## Resumo de prontidão

| Experiência | Status | Bloqueio real |
|---|---|---|
| Melhor Compra Hoje | Real hoje | Nenhum |
| Preço Justo | Real hoje | Nenhum |
| Histórico | Real hoje | Nenhum |
| Confiança | Real hoje (exposição parcial) | Nenhum |
| Loja Recomendada | Real hoje | Nenhum |
| Economia estimada | Real hoje | Nenhum |
| Vale Esperar? | Real, falta composição textual | Nenhum bloqueador, só esforço de UI/copy |
| IA explica | Real, falta composição textual | Nenhum bloqueador, só esforço de UI/copy |
| Alternativas/equivalentes | Depende de matching por atributo (não existe) | Trabalho de Product Identity, fora desta Mission |
| Acessórios | Depende de Universal Taxonomy Fase 2 | Decisão/execução de Mission Κ-2 |
| Alertas | Depende de identidade + canal de notificação | 2 decisões Tipo 1 do CTO, não técnicas |

Ver `BUYER_INTELLIGENCE_ROADMAP.md` para a priorização ICE completa sobre esta lista.
