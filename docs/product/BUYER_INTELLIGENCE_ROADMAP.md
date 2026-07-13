# BUYER_INTELLIGENCE_ROADMAP.md
# PROGRAM Λ (LAMBDA) — MISSION Λ-1 — Objetivo 5: Priorização ICE

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: estratégia apenas — prioridade, não execução. Pensado como Founder: o que entrega o valor mais defensável no menor tempo, não o que é mais elegante de construir.

---

## 0. O reframe estratégico que muda a ordem óbvia

A leitura ingênua do `RELEASE_1_8_BLUEPRINT.md` Capítulo 6 sugeriria começar pela **Buyer Account System** (conta, favoritos server-side, etc.) porque está listada primeiro "em ordem de dependência". **Essa não é a ordem certa para gerar o primeiro impacto perceptível.** A `BUYER_VALUE_MATRIX.md` mostra que existem duas trilhas com dependências completamente diferentes:

- **Trilha A — Inteligência sem identidade**: Melhor Compra Hoje, Preço Justo, Economia Estimada, Loja Recomendada, Histórico, Confiança, Vale Esperar? — **nenhuma delas precisa de conta de comprador, favoritos ou qualquer decisão Tipo 1 pendente**. Todas leem serviços que já existem, já são testados, já rodam. Podem começar amanhã.
- **Trilha B — Personalização com identidade**: Alertas, Histórico persistente entre sessões, Reviews de comprador, Favoritos sincronizados — todas dependem do Buyer Identity Model (`RELEASE_1_8_BUYER_IDENTITY_MODEL.md`, proposto, aguardando aprovação do CTO) e, para Alertas especificamente, também de um provedor de notificação (nenhum decidido). Essas decisões são do CTO, não de engenharia — nenhuma quantidade de esforço de implementação as destrava mais cedo.

**Recomendação de Founder**: rodar as duas trilhas em paralelo, não em série — a Trilha A não deveria esperar a Trilha B ser decidida, porque não depende dela em nada.

## 1. Metodologia ICE

Impact (1-10, valor de decisão para o comprador × diferenciação competitiva) × Confidence (1-10, quão certo é que o dado/mecanismo já existe e funciona conforme descrito) × Ease (1-10, inverso do esforço — 10 = trivial). Score = média simples dos três (não produto, para manter a escala 1-10 legível). Fonte de cada score: `AI_EXPERIENCE_BLUEPRINT.md` e `BUYER_VALUE_MATRIX.md`.

## 2. Tabela ICE — Trilha A (sem dependência de identidade)

| # | Iniciativa | Impact | Confidence | Ease | ICE | Por quê |
|---|---|---:|---:|---:|---:|---|
| 1 | **Economia estimada** ("economize até US$X") | 9 | 9 | 8 | **8,7** | `SavingsOpportunity` pronto; maior clareza de valor em uma linha só |
| 2 | **Melhor Compra Hoje** | 9 | 9 | 8 | **8,7** | `CanonicalMarketMover`/`MarketPulseService` prontos; é o gancho de entrada mais forte |
| 3 | **Confiança no momento de decisão** (badges no card de oferta, não só na página da loja) | 8 | 9 | 8 | **8,3** | Dado já existe, só precisa mudar de lugar na UI |
| 4 | **Loja Recomendada** (expor `OfferRankingService`) | 8 | 9 | 7 | **8,0** | Requer ligar `CompareFoundationService` a uma página real — zero backend novo |
| 5 | **Preço Justo** (mediana/dispersão no card de produto) | 7 | 9 | 8 | **8,0** | `PriceStatistics` pronto |
| 6 | **Histórico de preço (gráfico)** | 7 | 9 | 7 | **7,7** | Débito de produto desde Release 1.4 — `CanonicalPriceHistoryService` já agrega |
| 7 | **Vale Esperar?** (composição textual sobre Volatilidade) | 9 | 7 | 6 | **7,3** | Maior valor de diferenciação da lista, mas exige cuidado de copy (nunca virar previsão) |
| 8 | **Busca mostrando preço** (fechar lacuna já registrada em `FEATURES.md`) | 8 | 9 | 7 | **8,0** | Não estava na lista de 11 do mandato, mas é a etapa 2 da jornada (`BUYER_JOURNEY.md`) — busca sem preço perde conversão na primeira tela |
| 9 | **"IA explica"** (composição textual geral) | 6 | 6 | 5 | **5,7** | Depende de 4-8 já estarem no ar para ter o que compor |

**Ordem recomendada dentro da Trilha A**: 1 e 2 primeiro (maior ICE, maior efeito de "uau" imediato, viram o gancho de aquisição/compartilhamento); 3, 4, 5 em paralelo (mesma superfície de UI — card de oferta/comparação, mudança incremental); 6 e 8 em seguida (débito antigo, alto ICE, baixo risco); 7 por último dentro desta trilha (mais valioso, mas exige mais cuidado de produto para não soar como previsão).

## 3. Tabela ICE — Trilha B (depende de Buyer Identity Model)

| # | Iniciativa | Impact | Confidence | Ease | ICE | Por quê |
|---|---|---:|---:|---:|---:|---|
| 10 | **Buyer Identity Model — decisão e implementação** (habilitador, não uma feature em si) | 9 | 8 | 4 | **7,0** | Desbloqueia praticamente tudo abaixo; a Ease baixa reflete que é uma decisão Tipo 1 + implementação, não um simples flag |
| 11 | **Favoritos sincronizados** | 7 | 8 | 6 | **7,0** | Já existe como conceito de UI; só migra de armazenamento |
| 12 | **Alertas de preço entregues** | 10 | 5 | 2 | **5,7** | Maior impacto de retenção de toda a lista (fecha o loop de retorno), mas bloqueado por 2 decisões Tipo 1 (identidade + canal de notificação) |
| 13 | **Reviews de comprador** | 7 | 4 | 3 | **4,7** | Schema existe, nunca populado por comprador real; exige moderação e identidade |
| 14 | **Alternativas/produtos equivalentes** | 7 | 3 | 3 | **4,3** | Dado de "equivalência" não existe — não é personalização, é lacuna de Product Identity |
| 15 | **Acessórios relacionados** | 6 | 2 | 2 | **3,3** | Depende da Fase 2 da Universal Taxonomy (Mission Κ-2) — mais distante ainda |

## 4. O que isso muda na leitura do Capítulo 6 do Release 1.8

Não contradiz — refina a sequência. O Capítulo 6 já está correto sobre a **ordem de dependência dentro da Trilha B** (conta → favoritos → wishlist → alertas → notificações → compra inteligente). O que faltava nomear, e que esta Mission adiciona, é que **a Trilha A não precisa esperar nada do Capítulo 6 para começar** — ela usa dado e serviços de domínios completamente diferentes (`canonical-catalog`, `market-insights`, `realtime-commerce`, `exchange`, `trust`), nenhum dos quais depende de identidade de comprador.

## 5. Recomendação de sequenciamento (Founder view)

**Onda 0 (agora, paralela a qualquer decisão pendente)**: itens 1, 2, 3 da Trilha A. Maior ICE, zero bloqueio, maior efeito de percepção de marca — literalmente a resposta à pergunta "por que abrir o ParaguAI antes do Google" fica visível na primeira visita.

**Onda 1 (logo em seguida)**: itens 4, 5, 6, 8. Consolidam a experiência de comparação/decisão — depois da Onda 0 provar o conceito, essa onda profissionaliza a superfície inteira de produto/busca/comparação.

**Onda 2**: item 7 (Vale Esperar?) e item 9 (IA explica) — precisam da Onda 1 madura para ter conteúdo/contexto para compor.

**Em paralelo, começando já (mas por decisão do CTO, não por engenharia)**: item 10 — levar o Buyer Identity Model (`RELEASE_1_8_BUYER_IDENTITY_MODEL.md`) e a decisão de provedor de notificação para aprovação formal, para que a Trilha B (itens 11-15) não fique esperando uma decisão que poderia ter sido tomada meses antes de a engenharia da Trilha B começar.

Ver `FIRST_PREMIUM_FEATURES.md` para o corte final de "primeira onda" e a resposta ao Objetivo 6 (o que faria alguém abandonar definitivamente o Compras Paraguai).
