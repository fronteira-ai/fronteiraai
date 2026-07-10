# CONNECTOR_INTELLIGENCE.md
# Connector Intelligence — Cobertura, Overlap e Métricas Adaptativas

**Versão**: 1.0 (proposta — aguardando aprovação do CTO)
**Criado**: 2026-07-10 (Program Σ — Mission Σ-1)
**Status**: PROPOSTA ARQUITETURAL — nenhum código escrito
**Categoria**: `docs/architecture/`
**Companion**: `CONNECTOR_PLATFORM_V3.md`, `CONNECTOR_STRATEGY_ENGINE.md`, `CONNECTOR_CAPABILITY_MATRIX.md`

---

## 0. O que já existe hoje e não será duplicado

`ConnectorObservabilityService` (`lib/`) já compõe `productsProcessedLastSync`, `productsChanged`/`offersChanged` (janela 24h sobre `market_changes`), `qualityScore`, `healthScore`, `volatilityScore` — zero tabelas novas. `ConnectorQualityScore` já é a média de 4 fatores (Reliability, Completeness, Canonical Match %, Freshness). `MarketplaceCoverageService` já calcula "coverage", mas mede algo diferente do que este documento propõe: contagem de lojas/categorias/marcas **dentro do catálogo já importado do ParaguAI**, não "quanto do catálogo real da fonte já foi importado". Essa distinção é o motivo pelo qual as métricas abaixo são novas — não são um "coverage v2" do que já existe, são uma dimensão que hoje não é medida por nada no sistema: **completude da coleta na origem**, não completude do catálogo interno.

---

## 1. Fase 6 — as 5 perguntas do mandato

**Como descobrir automaticamente qual estratégia gera a maior cobertura do catálogo?**
Não por tentativa em produção (ver `CONNECTOR_STRATEGY_ENGINE.md` §4 — violaria `SOURCE_DISCOVERY_POLICY.md`). Por uma regra simples e verificável na auditoria de onboarding: prefira sempre a Discovery Strategy cujo `estimateTotalKnown()` não é `null` (sitemap com contagem de URLs, ou API com campo `count`/`total`) sobre qualquer alternativa sem denominador conhecido. É a mesma regra que já levou os 4 connectors Classe A a usar sitemap — só nunca foi escrita como regra, era intuição de quem implementou cada um.

**Como medir representatividade?**
Comparar a distribuição de categoria/marca da amostra já coletada contra a distribuição que a própria fonte declara (contagem de produtos por categoria no sitemap/API, quando exposta) ou, na ausência disso, contra a distribuição observada no universo total de URLs descobertas mesmo que não buscadas (o sitemap entrega isso de graça — a URL geralmente contém a categoria). Ver §2 (Sampling Quality).

**Como medir overlap potencial?**
Já é derivável hoje, sem nenhum código novo de matching: `canonical_product_id` (Product Identity, Shadow Mode) já liga produtos entre connectors — a prova concreta é o achado real de Program D Wave 1 (Galaxy S25 Ultra vendido por Shopping China e Mega Eletrônicos, ligado automaticamente). O que falta é só **nomear e expor** isso como métrica por connector (`Overlap %`, §4) — uma consulta de agregação sobre dado que já existe, não um novo motor.

**Como evitar importar milhares de produtos irrelevantes?**
Allow-list declarativo de categoria/marca por connector (curadoria humana na Certificação) + `CategoryBalancedSamplingPolicy` (`CONNECTOR_STRATEGY_ENGINE.md` §2) para garantir que o orçamento por execução não se esgote em uma única categoria populosa. Deliberadamente sem classificação automática de relevância — este código-base já rejeitou "decisão mágica" sem dado observável (mesma lição do `supportsStock: false` honesto na Capability Matrix v1).

**Como priorizar produtos de maior valor comercial?**
`CatalogValueSamplingPolicy` reaproveitando o score 0-100 já calculado por `CatalogIntelligenceService` (Release 1.6 Epic 4) — zero scoring novo, só uma nova forma de consumir um dado que já existe.

---

## 2. Fase 7 — catálogo de métricas, mapeado contra o que existe

| Métrica pedida | Definição proposta | Fonte de dado | Já existe (composição) ou é nova? |
|---|---|---|---|
| **Coverage %** | `produtos_importados_ate_hoje / estimateTotalKnown()` | Novo campo persistido por sync run: `estimatedSourceCatalogSize` (do `count` da API ou contagem de URLs do sitemap) | **Nova** — depende de capturar o denominador, que hoje é descartado após cada sync (usado só para paginação, nunca persistido) |
| **Overlap %** | `% de produtos do connector com canonical_product_id compartilhado com ≥1 outro connector` | `canonical_product_id` (já existe, Product Identity) | **Nova métrica, dado já existente** — agregação simples, sem novo matching |
| **Discovery Score** | Composto: peso maior para `discovery.kind === sitemap ou paginated-api-with-count` (denominador conhecido) sobre `category-crawl`/sem denominador | `ConnectorStrategyProfile.discovery` (proposto) | **Nova** |
| **Catalog Health** | Reaproveita a distribuição de score 0-100 já calculada pelo Catalog Intelligence (Release 1.6 Epic 4), agregada por connector em vez de por produto | `CatalogIntelligenceService` (já existe) | **Composição, zero cálculo novo** |
| **Sampling Quality** | Divergência (ex.: distância L1 simples, sem necessidade de método estatístico mais pesado na escala atual) entre distribuição de categoria da amostra importada e distribuição do universo descoberto | Categoria por URL (sitemap) ou por item de API, já extraída hoje | **Nova**, mas dado-fonte já coletado, só nunca comparado |
| **Identity Yield** | Renomeação, no contexto de connector, do Canonical Match % que já compõe o `ConnectorQualityScore` hoje | `ConnectorQualityScore` (já existe) | **Já existe sob outro nome** — não duplicar, só expor com este rótulo quando o contexto for "quanto do que importamos vira produto canônico reconhecido" |
| **Sync Efficiency** | `skipped / (skipped + toFetch)` do `DeltaImportPlanner` — hoje computado e descartado a cada execução, nunca persistido | `DeltaImportPlanner.plan()` (já existe, sitemap-only até V2.1) | **Nova métrica, cálculo já existente** — só precisa parar de ser descartado |
| **Freshness** | Já existe como fator do `ConnectorQualityScore` (via `volatilityScore`/janela de `market_changes`) | `ConnectorObservabilityService` (já existe) | **Já existe** — reaproveitar, não recriar |
| **Connector Confidence** | Composto novo: `f(Coverage %, Sync Efficiency, Sampling Quality, ConnectorQualityScore existente)` — um único número para decidir se um connector precisa de revisão de estratégia | Todos os acima | **Nova**, mas 3 dos 4 insumos já existem ou são derivações baratas |

Regra geral aplicada em toda a tabela, coerente com o mandato de não overengineering já visto nas Waves anteriores: **nenhuma métrica nova exige uma tabela nova**. `estimatedSourceCatalogSize` e o resultado persistido de `DeltaImportPlanner.plan()` cabem como colunas adicionais em `connector_sync_runs` (já existe) — decisão de design registrada aqui, não implementada nesta Mission.

---

## 3. Connector Confidence — por que ele existe

É a métrica que fecha o loop entre Fase 6 (decisão) e Fase 7 (medição): baixa Coverage % + baixa Sync Efficiency por várias execuções seguidas é o sinal objetivo de que um `ConnectorStrategyProfile` está mal declarado — exatamente o padrão que a Mobile Zone exibiria hoje se esta métrica existisse (Coverage ~2,87% travada, Sync Efficiency indefinida porque não há Progress Strategy nenhuma para medir). Connector Confidence baixo **dispara revisão na Certificação**, não uma troca automática de estratégia em produção — mantém a postura "declarativo + revisado por humano" de `CONNECTOR_STRATEGY_ENGINE.md` §4.

---

## 4. Fase 10 — respostas finais completas

**1. A Mobile Zone é realmente um caso isolado?**
Não. A auditoria (`CONNECTOR_PLATFORM_V3.md` §1-§2) mostra que o problema nunca foi "a Mobile Zone", foi "Delta Import só existe dentro do módulo de sitemap". A Mobile Zone é o primeiro connector real que não usa sitemap — por isso é a primeira instância *observada*, não a única possível. Os outros 4 connectors não sofrem disso hoje porque, por acaso de arquitetura de origem, todos escolheram sitemap. Isso é sorte de amostragem, não uma garantia estrutural.

**2. Quantos conectores podem sofrer do mesmo problema?**
Hoje, concretamente: 1 de 5 (20%) — só a Mobile Zone. Estruturalmente, sem a mudança proposta em V2.1: **qualquer connector futuro cuja fonte não seja Sitemap** herda o mesmo gap por padrão, porque hoje não existe um caminho de Progress Strategy fora do sitemap para reutilizar — quem escrever o próximo connector API-based vai, sem querer, reescrever o mesmo bug de "offset 0 sempre" que a Mobile Zone tem hoje, a menos que o Strategy Engine (ou equivalente) exista antes disso acontecer.

**3. Qual arquitetura elimina definitivamente essa classe de problema?**
Desacoplar Progress Strategy de Discovery Strategy (`CONNECTOR_STRATEGY_ENGINE.md` §2) — fazer de "sabemos o que já vimos" uma capacidade da plataforma que qualquer estratégia de descoberta alimenta, em vez de uma capacidade que só existe dentro do módulo de sitemap. Combinado com Coverage % como métrica obrigatória de Observability (não opcional), qualquer connector futuro com cobertura estagnada fica visível por métrica, não por auditoria manual como aconteceu com a Mobile Zone desta vez.

**4. Como tornar o Connector Platform inteligente e auto-adaptável?**
"Auto-adaptável" neste código-base não deveria significar dispatch dinâmico ou troca de estratégia em runtime sem revisão — esse caminho já foi avaliado e rejeitado (event bus, reflection, plugin framework, todos banidos em Program B Wave 2, pelos mesmos motivos que se aplicariam aqui: poucos consumidores reais, não cresce com o número de merchants ainda, risco de abstração sem uso). "Inteligente" aqui significa: declaração estática e legível por humano (Strategy Profile, Capability Matrix v2) + métricas objetivas que tornam visível quando uma declaração está errada (Connector Confidence) + um processo formal (Certificação) que já existe para revisar isso. É automação de **detecção**, decisão continua sendo humana — coerente com o resto da plataforma.

**5. Essa evolução aproxima o ParaguAI da visão do VISION_2035?**
Sim, diretamente. `VISION_2035.md` descreve a progressão "comparador de preços → plataforma de inteligência para lojistas → infraestrutura regional", com a ressalva explícita de que "sem dados [de qualidade], o resto é interface" e que o Brain é "o sistema nervoso central do ecossistema" que precisa de dados de preço, comportamento e reputação para gerar inteligência. A Capability Matrix v1 já foi construída "reservada para o Brain" sem consumidor ainda (`docs/engineering/CONNECTOR_PLATFORM_V2.md` §4) — Coverage %, Overlap % e Connector Confidence são exatamente o tipo de metadado de qualidade de dado que dá ao Brain, quando ele existir, uma forma de saber o quanto confiar em cada fonte antes de gerar uma recomendação. Cobertura ampla e mensurável por connector é uma pré-condição explícita da "Inteligência Regional" descrita na visão, não uma iniciativa paralela a ela.
