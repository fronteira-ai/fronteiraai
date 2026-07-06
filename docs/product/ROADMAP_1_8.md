# ROADMAP_1_8.md
# Release 1.8 Organizado em Programas

**Versão**: 1.8
**Criado**: 2026-07-02 (Sprint Zero — Release 1.8 Project Preparation & Foundation Consolidation)
**Atualizado**: 2026-07-04 — mandato do CTO rotulou a implementação de Mega Eletrônicos/Roma Shopping/Atacado Connect como "Program D — Marketplace Coverage Expansion — Wave 1", entregue; em conteúdo, esta é a carga real de **Program B / Wave 3** (o "primeiro lote de lojas" já reservado abaixo) — ver nota de nomenclatura na seção do Program B. "Program D" já era usado neste documento para SEO & Organic Growth (Wave 5, não iniciada) — sem colisão de conteúdo, apenas de rótulo; mantido como pedido, documentado aqui para não confundir os dois "Program D" no histórico. Program B / Wave 2 (Connector Platform Finalization) entregue, resolvendo as 2 limitações da Wave 5; Program A / Wave 5 (Connector Platform V2) entregue; marca Program C / Wave 0 (Merchant Partnership Program) como entregue; marca Program A / Wave 3 (Programa de Certificação de Connectors Tier 1) como entregue.
**Status**: Referência oficial de execução do Release 1.8
**Fonte**: reorganiza as 8 Waves já definidas em `docs/product/releases/RELEASE_1_8_BLUEPRINT.md` Capítulo 12 em Programas — não redefine escopo, técnica ou sequência de dependência já decidida ali.

---

## Por que Programas, e não só Waves

Uma Wave é uma unidade de entrega técnica. Um Programa é uma unidade de **valor de negócio reconhecível** — o CTO pode perguntar "como está o Programa de Marketplace Expansion?" e receber uma resposta de negócio, não uma lista de tarefas técnicas. Waves continuam sendo a unidade real de planejamento/execução (Quality Gate por Wave, `RELEASE_1_8_BLUEPRINT.md`); Programas são o agrupamento que torna o roadmap legível para decisões de priorização e comunicação externa.

**Nota de transparência**: o mandato do CTO deu 5 Programas de exemplo (Marketplace Expansion, Buyer Experience, Merchant Growth, SEO & Organic Growth, Marketplace Intelligence). Este documento usa 6 — os 5 exemplos mais um Programa de infraestrutura (Live Commerce Infrastructure) que não se encaixa honestamente em nenhum dos 5 sem forçar a categorização, e junta Fronteira Agora dentro de Buyer Experience (ambos são superfície voltada ao comprador, e Fronteira Agora sozinho não tem peso de negócio suficiente para um Programa próprio). Desvio justificado, não silencioso.

---

## Ordem oficial dos Programas (por impacto no negócio)

```
0. PROGRAM 0 — Foundation & Operations           (Wave 0, Wave 1 — contínuo, fora da sequência A-F)
1. PROGRAM A — Live Commerce Infrastructure     (Waves 1-2)
2. PROGRAM B — Marketplace Expansion             (Wave 3, contínuo)
3. PROGRAM E — Buyer Experience                  (Waves 6-7)
4. PROGRAM C — Marketplace Intelligence          (Wave 4)
5. PROGRAM D — SEO & Organic Growth              (Wave 5)
6. PROGRAM F — Merchant Growth                   (Wave 8)
```

**Por que Program 0 existe fora da ordem "por impacto de negócio"**: os outros 6 Programas respondem a uma pergunta de negócio ("como está o Programa de Marketplace Expansion?"). Program 0 responde a uma pergunta operacional interna ("o marketplace está saudável, e quem opera consegue enxergar isso?") — infraestrutura de observabilidade e ponte cognitiva (Brain), não uma experiência ou capacidade voltada a comprador/lojista. Roda em paralelo aos demais Programas, sem competir pela mesma sequência de dependência de negócio. Sua numeração de Wave (0, 1, ...) é própria — não colide com a numeração de Wave dos Programas A-F (que segue `RELEASE_1_8_BLUEPRINT.md` Capítulo 12).

---

## PROGRAM 0 — Foundation & Operations

**Por que existe**: nenhum dos outros Programas tem prioridade real se a plataforma que os sustenta não puder ser operada, monitorada e confiada em escala — Program 0 é a infraestrutura de observabilidade e cognição que os demais Programas dão como certa.

| Wave | Escopo | Status |
|---|---|---|
| Wave 0 | Brain Analytics Integration — ponte oficial `buyer_events` → Brain (`BuyerEventBrainBridgeService`), primeira exposição real do Knowledge Graph (`GET /api/trust/merchant/[merchantId]/graph`) | ✅ Entregue 2026-07-02. Ver `docs/product/releases/RELEASE_1_8_PROGRAM_0_WAVE_0_REPORT.md`. |
| Wave 1 | Marketplace Operations Platform — domínio `src/domains/marketplace-operations/`: Health Score (8 fatores documentados), Merchant Priority Engine (compute-on-read), Coverage Engine, Connector Health Engine (estende o Ecosystem Monitor da Wave 2 do Release 1.7), Marketplace Metrics, Alert Engine, dashboard interno `/admin/marketplace-operations` | ✅ Entregue 2026-07-03. Escopo trimado de 10 para os Epics com dado real disponível — gaps nomeados em `docs/engineering/TECH_DEBT.md` e `docs/engineering/MARKETPLACE_FOUNDATION_SCALE_AUDIT.md`. |

**Assets/Moats fortalecidos**: C-2 (Merchant Trust, via `MerchantPriorityTierChanged`), amadurece a capacidade operacional que sustenta todos os Moats já catalogados — não introduz Asset/Moat novo.

---

## PROGRAM A — Live Commerce Infrastructure

**Por que primeiro**: sem isso, nenhuma outra promessa de valor do Release 1.8 é estruturalmente verdadeira — comparação de preço desatualizado ou câmbio não confiável mina a credibilidade de tudo que vem depois.

| Wave | Escopo | Status |
|---|---|---|
| Wave 1 | Exchange Intelligence Platform — domínio `src/domains/exchange/`: Provider Registry + failover real (1 provedor ativo, ADR-043), Cache (TTL 60s), History (`exchange_rates` INSERT-only), Automatic Currency Engine (reaproveita `offers.currency`, nunca sobrescreve o original), Analytics (variação cambial, valorização de catálogo, economia do comprador), dashboard interno `/admin/exchange`, API pública `/api/exchange/*` | ✅ Entregue 2026-07-03. Escopo trimado (multi-provider real ficou registro+failover com 1 provedor — BCP/BCB/fonte própria já haviam sido descartados pela própria ADR-043); gaps nomeados em `docs/engineering/TECH_DEBT.md` e `docs/engineering/EXCHANGE_FOUNDATION_FOR_LIVE_PRICING.md`. |
| Wave 2 | Real-Time Commerce Engine — domínio `src/domains/realtime-commerce/`: Change Detection Engine (integrado ao `SyncOrchestrator`), Volatility Engine, Freshness Engine, Store Update Intelligence, Market Pulse Engine, Live Activity Feed, Buyer Alert Engine (fundação, sem envio), dashboard interno `/admin/realtime-commerce` | ✅ Entregue 2026-07-03. Detecção de remoção de produto/offer e emissão real dos 10 eventos Brain deferidas — gaps nomeados em `docs/engineering/TECH_DEBT.md`. |
| Wave 3 | Programa de Certificação de Connectors Tier 1 — auditoria técnica de 10 lojas (`docs/marketplace/Tier1_Merchants.md`, nova categoria ADR-048), processo de certificação de 15 critérios + Connector Score, tudo reaproveitando infraestrutura existente (zero Engine novo) | ✅ Entregue 2026-07-03, deliberadamente sem código de produto (Wave de auditoria/estratégia). 4 de 10 lojas (Cellshop, Nissei, Casa Americana, New Zone) bloqueiam crawlers de IA nomeadamente — `Restricted — Commercial Partnership Recommended`, seguem Tier 1/prioritárias. Alimenta diretamente o critério de priorização de Program B/Wave 3 abaixo. |
| Wave 4 | Connector Tier 1 Implementation — primeiros Connectors certificados reais para Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect | ⏸️ **EM ANDAMENTO, pausada pelo CTO em 2026-07-04** após Shopping China recertificado (sitemap real, 27.402 URLs de produto) + `HttpFetchStrategy` com retry/backoff + módulos compartilhados (`SitemapCrawler`/`textParsing.ts`) — CTO exigiu revisão de arquitetura completa (`docs/engineering/CONNECTOR_PLATFORM_ARCHITECTURE_REVIEW.md`) antes de implementar Mega Eletrônicos/Roma Shopping/Atacado Connect. Migrations das Waves 1-3 aplicadas em produção nesta Wave. Mobile Zone/Visão VIP confirmados client-side-rendered — sem headless browser no projeto, não implementados. |
| Wave 5 | Connector Platform V2 — industrialização (SDK, Capability Matrix, Certification Framework + Quality Score, Observability, Delta Import) | ✅ Entregue 2026-07-04, deliberadamente sem novos merchants (os 5 pendentes da Wave 4 continuam congelados). Auditoria contra 13 objetivos de arquitetura, cada um com veredito documentado (`docs/engineering/CONNECTOR_PLATFORM_V2.md`). Retomada da Wave 4 segue dependendo de decisão explícita do CTO. |

**Assets/Moats fortalecidos**: C-5 (Cross-Border Context, matura de implícito para instrumentado), C-7 (Live Commerce Velocity, novo — Change Detection/Volatility/Freshness são sua primeira instrumentação real), Moat 9 (novo).

---

## PROGRAM B — Marketplace Expansion

**Por que segundo**: testa a tese de compounding de conectores (`NORTH_STAR.md` §13) com volume real pela primeira vez desde o Release 1.7, e cada loja nova entra já se beneficiando da infraestrutura do Programa A.

**Nota de nomenclatura**: o mandato do CTO rotulou a finalização da Connector Platform como "Program B — Wave 2", embora seja, em conteúdo, uma continuação direta do trabalho de infraestrutura do Programa A (Waves 4-5) — mantido sob a letra pedida, sem reabrir uma nova, mesma lógica de nota já aplicada em Program C Wave 0.

| Wave | Escopo | Status |
|---|---|---|
| Wave 2 | Connector Platform Finalization — Delta Import Engine operacional (`connector_url_snapshots`), Connector Registry V2 (`ConnectorDirectoryService`), Observability V2, Source Discovery Policy formalizada | ✅ Entregue 2026-07-04. Resolve as 2 limitações honestas nomeadas ao final de Program A/Wave 5. Zero novos merchants — infraestrutura pura. Validado com sincronização real (não só dry-run) contra `shoppingchina.com.py`. |
| Wave 3 | Primeiro lote de lojas nomeadas pelo CTO, priorizadas por critério de score (`RELEASE_1_8_BLUEPRINT.md` Capítulo 1). Onboarding contínuo depois, não um evento único. | ✅ **Entregue 2026-07-04** — sob o rótulo "Program D — Marketplace Coverage Expansion — Wave 1" (mandato do CTO), conteúdo é exatamente este lote: Mega Eletrônicos (197 ofertas), Roma Shopping (205 ofertas), Atacado Connect (206 ofertas) certificados com dado real, 597 ofertas persistidas no total. Shopping China já certificado desde Program B Wave 2. Mobile Zone/Visão VIP seguem bloqueados (spike técnico + ADR de headless browser); Cellshop/Nissei/Casa Americana/New Zone seguem via parceria comercial (`docs/business/`). |

**Assets/Moats fortalecidos**: S-1 (Merchant Network), C-3 (Normalized Catalog, indiretamente via mais produtos/marcas).

---

## PROGRAM E — Buyer Experience

**Por que terceiro**: a decisão arquitetural mais consequente do Release (ADR-045/046) já está completa — este é o Programa que converte essa decisão em experiência real, e é pré-requisito para qualquer medição real de retenção usada pelos Programas seguintes.

| Wave | Escopo | Status |
|---|---|---|
| Wave 6 | Buyer Account System (contas, favoritos, wishlist, alertas, histórico, notificações, Compra Inteligente) | Buyer Identity Model completo (ADR-045/046). Falta apenas fornecedor de notificação (ADR pendente) e 2 achados de segurança de severidade alta (não corrigidos, nomeados na ADR-046) a resolver antes do lançamento público. |
| Wave 7 | Fronteira Agora — bloco de baixa incerteza (câmbio, horários, datas) primeiro; câmeras/Ponte da Amizade/clima/fluxo como sub-waves condicionais à viabilidade | Arquitetura definida (`RELEASE_1_8_BLUEPRINT.md` Capítulo 9). |

**Assets/Moats fortalecidos**: C-6 (Buyer Behavioral Knowledge, matura para Ativo Maduro), Moat 6 (Data Flywheel, acelera).

---

## PROGRAM C — Marketplace Intelligence

**Por que quarto**: precisa do volume de dado que os Programas A e B produzem para gerar rankings/insights estatisticamente significativos — executar antes produziria análise sobre uma base de dado pequena demais para ser confiável.

**Nota de nomenclatura**: o mandato do CTO rotulou o Merchant Partnership Program como "Program C — Wave 0", coincidindo com a letra já usada aqui desde o Sprint Zero para "Marketplace Intelligence". Mantido sob a mesma letra (Wave 0, antes da Wave 4) em vez de reabrir uma nova letra — a conexão temática é real: dado de parceiro (Cellshop, Nissei, etc.) que hoje é inacessível por scraping se tornaria insumo direto para a Wave 4 assim que uma parceria for firmada, então "abrir o acesso ao dado" (Wave 0) precede naturalmente "analisar o dado" (Wave 4), mesma lógica de por que Program 0 Wave 0/1 rodam fora da sequência A-F sem colidir.

| Wave | Escopo | Status |
|---|---|---|
| Wave 0 | Merchant Partnership Program — processo oficial de parceria comercial para merchants que não podem ser integrados via scraping (Cellshop, Nissei, Casa Americana, New Zone bloqueiam crawlers de IA explicitamente). `docs/business/` (nova categoria, ADR-049): `MERCHANT_PARTNERSHIP_PROGRAM.md`, `TIER1_PARTNERS.md`, `PARTNERSHIP_PROPOSAL.md`, `PARTNERSHIP_EMAIL_TEMPLATE.md` | ✅ Entregue 2026-07-03. Puramente documentação/processo — zero código, por decisão deliberada. Nenhum contato real feito ainda; pipeline de negociação pronto para execução humana. |
| Wave 1 | Market Intelligence Engine, núcleo — domínio novo `src/domains/market-insights/`: Price Intelligence (mediana/dispersão), Savings Engine, Volatility Rollup (canônico/categoria/merchant), Price History API interna, Market Pulse canônico | ✅ Entregue 2026-07-04. Auditoria prévia encontrou sobreposição real com quase todos os objetivos — só o genuinamente novo foi construído; Merchant Intelligence deliberadamente não duplicado (já coberto por serviços de Waves anteriores). Ver `docs/engineering/MARKET_INTELLIGENCE_ENGINE.md`. **Esta Wave é precisamente o núcleo que a Wave 4 abaixo precisava** — volatilidade/ranking já têm o motor pronto, falta apenas volume real de dado (mais Connectors). |
| Wave 4 | Volatilidade, sazonalidade, ranking de lojas/categorias/marcas | **Motor já construído na Wave 1 acima** (`VolatilityRollupService`) — o que falta agora é volume real de dado (Canonical Match ainda baixo, só Shopping China certificado), não arquitetura. Matura F-4 (Marketplace Liquidity Model) de "Não iniciado" para "Coleta Inicial" assim que a expansão de Connectors gerar dado suficiente. |

---

## PROGRAM D — SEO & Organic Growth

**Por que quinto**: depende do Programa C para gerar conteúdo diferenciado — SEO em escala sem esse insumo arrisca conteúdo fino/penalizável (`RELEASE_1_8_BLUEPRINT.md` Capítulo 7).

| Wave | Escopo | Status |
|---|---|---|
| Wave 5 | Páginas de categoria/marca, landing pages programáticas, conteúdo automático lastreado em dado real | Arquitetura definida. Fundação de sitemap-index já entregue na Wave 6 do Release 1.7. |

---

## PROGRAM F — Merchant Growth

**Por que último**: "valor antes de cobrança" (`PRODUCT_POLICY.md`) só é uma promessa cumprida se todos os Programas anteriores já entregaram valor real e demonstrável antes de qualquer gatilho de upgrade. Executar este Programa antes venderia uma promessa, não um resultado.

| Wave | Escopo | Status |
|---|---|---|
| Wave 8 | Billing real, gatilhos de upgrade baseados em limite/insight demonstrado, `PremiumActivated` emitido de verdade | Arquitetura definida (`RELEASE_1_8_BLUEPRINT.md` Capítulo 8). Recomendado: escrever ADR-041 (Trust Signal, reservado desde o Release 1.5) antes ou durante este Programa. Fornecedor de billing ainda sem ADR. |

---

## Decisões arquiteturais bloqueadoras — status consolidado

| Decisão | Programa afetado | Status |
|---|---|---|
| Fornecedor de câmbio | A | ✅ ADR-043 |
| Modelo de dados pessoais de comprador | E | ✅ ADR-045 |
| Buyer Identity Model completo | E | ✅ ADR-046 |
| Fornecedor de notificação (push/e-mail) | E | ⬜ Pendente |
| Fornecedor de billing | F | ⬜ Pendente |

Nenhuma Wave começa antes de sua decisão bloqueadora correspondente estar resolvida — Programas A e a maior parte de E já estão desbloqueados; Programas B, C, D não têm decisão bloqueadora própria (podem começar assim que sua dependência técnica de Program anterior estiver pronta); F aguarda o fornecedor de billing.
