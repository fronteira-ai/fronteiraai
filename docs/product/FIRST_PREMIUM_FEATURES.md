# FIRST_PREMIUM_FEATURES.md
# PROGRAM Λ (LAMBDA) — MISSION Λ-1 — Objetivo 4 (corte final) / Objetivo 6

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: estratégia apenas — nenhuma implementação.

---

## 1. A primeira onda — corte final (Trilha A, Onda 0 + Onda 1 de `BUYER_INTELLIGENCE_ROADMAP.md`)

Sete experiências, nenhuma bloqueada por decisão pendente, todas construídas sobre serviço já real:

1. **Economia estimada** — `SavingsOpportunity` (`market-insights`)
2. **Melhor Compra Hoje** — `CanonicalMarketMover` + `MarketPulseService` (`market-insights`/`realtime-commerce`)
3. **Confiança no card de decisão** — badges `TrustSignalType` (`trust`), hoje só na página da loja
4. **Loja Recomendada** — `OfferRankingService`/`CompareFoundationService` (`canonical-catalog`)
5. **Preço Justo** — `PriceStatistics` (`market-insights`)
6. **Histórico de preço (gráfico)** — `CanonicalPriceHistoryService` (`canonical-catalog`) — débito de produto desde Release 1.4
7. **Busca mostrando preço** — fecha a lacuna já registrada em `FEATURES.md`

**Por que este corte e não outro**: cada uma tem ICE ≥7,7 (`BUYER_INTELLIGENCE_ROADMAP.md` §2), nenhuma depende do Buyer Identity Model, e juntas cobrem as etapas 2-6 da jornada de compra inteligente (`BUYER_JOURNEY.md`) — descoberta, comparação, confiança, decisão e finalização — sem tocar a etapa 7 (retorno), que é estruturalmente a única que precisa de identidade.

**O que fica deliberadamente fora desta primeira onda, e por quê**: Vale Esperar? e IA explica (precisam da onda acima já madura para ter conteúdo a compor); Alertas, Reviews, Favoritos sincronizados (Trilha B, aguardando decisão do CTO sobre Buyer Identity Model); Alternativas/equivalentes e Acessórios (dependem de trabalho de dado que não existe hoje — Product Identity por atributo e Universal Taxonomy Fase 2, respectivamente).

## 2. Objetivo 6 — o que faria alguém abandonar definitivamente o Compras Paraguai

A pergunta certa não é "que feature copiamos" — é **que capacidade estrutural um agregador de preço tradicional (lista estática, grupo de WhatsApp, comparador manual) não pode replicar sem os mesmos anos de dado e a mesma arquitetura**. `MOAT_STRATEGY.md` já nomeia essas capacidades; a primeira onda desta Mission é, precisamente, a primeira vez que elas ficam visíveis ao comprador:

- **Moat 1 (Historical Data)** — um concorrente que nasce hoje não tem `CanonicalPriceHistoryService` com meses/anos de série temporal. "Preço Justo" e "Histórico" são experiências que ficam estruturalmente melhores a cada mês que passa — um concorrente novo nunca alcança o mesmo contexto, só copia a interface.
- **Moat 2 (Merchant Trust Network)** — badges de verificação (`TrustSignalType`) são fatos auditados ao longo do tempo (identidade validada, localização confirmada, operação recorrente) — não são um selo que se compra ou se replica em uma tarde. Um comparador de preço genérico não tem processo de verificação nenhum; ele mostra preço, não confiança.
- **Moat 4 (Cross-Border Context Intelligence)** + Exchange domain — conversão de câmbio explicável, em tempo real, com taxa e data de captura auditáveis (`ConvertedPrice`) é uma barreira técnica pequena, mas uma barreira de **confiabilidade percebida** real: um comprador que já foi enganado por uma "cotação combinada" informal não confia em números sem proveniência.
- **Moat 6 (Data Flywheel)** — cada comparação/economia mostrada ao comprador só existe porque o Canonical Catalog já uniu produtos de lojas diferentes (`CompareFoundationService`) — isso não é uma feature de UI, é a saída de um pipeline de Product Identity que um agregador de lista estática nunca constrói, porque não tem conector nem dedupe algum.
- **Moat 7 (ParaguAI Brain, em maturação)** — "Vale Esperar?"/"IA explica" são a primeira materialização visível ao comprador de um raciocínio computado sobre dado próprio (volatilidade, histórico) — não uma resposta de um LLM genérico sem contexto do mercado da fronteira.

**A resposta direta**: alguém abandona definitivamente um comparador tradicional no momento em que percebe que o ParaguAI **já fez a conta que ele estava prestes a fazer manualmente** — economia real em número, confiança em fato verificável (não em "confia no vendedor"), e um preço com contexto histórico em vez de um número solto. Nenhuma dessas três coisas é replicável por um concorrente sem os mesmos anos de dado agregado e a mesma arquitetura de Canonical Catalog + Trust — que é exatamente por isso que `MOAT_STRATEGY.md` já as declara Moats, não apenas features.

**O risco simétrico, que este documento também precisa nomear**: se a primeira onda (§1) não for entregue, esses Moats continuam existindo *no backend* mas **não existem para o comprador** — um Moat que ninguém percebe não retém ninguém. O maior risco estratégico hoje não é um concorrente copiar o ParaguAI; é o ParaguAI ter construído a vantagem e nunca tê-la exposto — o achado central desta Mission (`BUYER_VALUE_MATRIX.md` §2).

## 3. Checklist de alinhamento com a Fundação (antes de qualquer Wave real começar)

- [ ] Pergunta Obrigatória (`NORTH_STAR.md` §3): cada item da primeira onda "aproxima" da missão de eliminar assimetria de informação — sim, por construção (todos tornam uma informação já correta e já calculada visível a quem decide).
- [ ] Nenhum item exige alterar Product Identity, Connector Platform ou Canonical Catalog — confirmado, todos são camada de leitura sobre serviço existente.
- [ ] Nenhum item introduz cobrança ao comprador — confirmado, doutrina B2C-gratuito preservada (`AI_EXPERIENCE_BLUEPRINT.md`, nota sobre "Premium").
- [ ] Nenhum item depende de `buyer_events` além do que já é anônimo/agregado — confirmado; o gap de LGPD/rate-limiting (`RELEASE_1_8_BUYER_IDENTITY_MODEL.md` §2.5/2.8) permanece um bloqueador para a Trilha B, não para esta primeira onda.
