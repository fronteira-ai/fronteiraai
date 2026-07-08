# MISSION_OMEGA_4_EXECUTION_BLUEPRINT.md
# PROGRAM Ω — Mission Ω-4 — Marketplace Density Execution Blueprint

**Categoria**: `docs/product/` (mesma família de `RELEASE_ALIGNMENT.md`/`VISION_ALIGNMENT_AUDIT.md` — companion direto de Program Ω, nenhuma categoria nova criada)
**Data**: 2026-07-08
**Autor**: CTO / Claude Sonnet 5 (Principal Engineer)
**Natureza**: Planejamento operacional. **Nenhum código foi alterado por esta missão** — nenhuma feature nova, nenhuma migration, nenhum refactor. Este documento é o "como" técnico detalhado por trás do "o quê"/"quando" já aprovado em `ROADMAP_2_0.md`.

---

## 0. Como este documento se relaciona com o que já existe (leitura obrigatória antes do resto)

A Mission Ω-3 corrigiu um problema real de ambiguidade de ownership entre Program Ω e as Waves do `ROADMAP_2_0.md` (ver ADR-055 e o histórico em `RELEASE_ALIGNMENT.md`). Este documento **não reabre essa decisão** — ele a detalha, sem redefini-la:

| O que já está decidido (`ROADMAP_2_0.md`) | O que este documento adiciona |
|---|---|
| **Program Ω §1** é dono exclusivo de **crescer o número** de merchants certificados e converter o funil claim→cliente em lojas reais (breadth) | Este documento detalha o trabalho técnico de **densificar o que já está conectado** — qualidade e completude do dado já ingerido (depth): canonicalização, imagens, marca/categoria, histórico de preço, limpeza de duplicatas |
| **Wave 1 §2 (Marketplace Intelligence)** é dono de hardening dos engines de agregação | Este documento fornece o detalhamento técnico de execução para essa Wave (Waves Ω-4 2, 5, 6 abaixo) |
| **Wave 4 §4 (Merchant Platform)** é dono de dedupe de widgets + billing | Fora do escopo deste documento — não tocado |

**Distinção central, para nunca mais repetir o erro da Mission Ω-2**: "quantos merchants temos" é Program Ω. "Quão bom é o dado que já temos desses merchants" é este documento. Nenhuma Wave abaixo cria um merchant novo ou reivindica uma loja — isso é, permanentemente, escopo de Program Ω.

---

## 1. Marketplace Density Matrix

**Nota metodológica obrigatória** (`AI_CONSTITUTION.md` — "dados reais antes de suposições", "estado honesto, sempre"): esta auditoria não tem acesso a uma conexão ao vivo com o Supabase de produção neste ambiente (`scripts/db-verify.ts` confirma isso explicitamente em seu próprio comentário — "this environment has no Supabase credentials"), e a política vigente (`memory` deste projeto, reafirmada em sessões anteriores) é nunca rodar `supabase db query/execute` contra o projeto live sem permissão explícita e separada. Por isso, a coluna **Cobertura Atual** abaixo é qualitativa (baseada em código/schema/`TECH_DEBT.md`/`CHANGELOG.md` reais), nunca um número inventado. A **Wave 0** (§2) existe precisamente para substituir todo "não medido" abaixo por um número real, via query read-only, antes de qualquer Wave de execução começar.

| Domínio | Estado Atual (mecanismo) | Cobertura Atual | Cobertura Ideal | Gap | Impacto Esperado | Prioridade |
|---|---|---|---|---|---|---|
| **Products** | `products` normalizado, slug único, schema limpo | Baixa — poucos milhares de produtos, concentrados em 4-5 merchants certificados | Catálogo com densidade suficiente para que "qualquer busca encontre resultado" (`BUSINESS_MODEL.md` §4) | Alto | Alto — fundação de tudo abaixo | **Crítica** (mas breadth = Program Ω, não este documento) |
| **Offers** | `offers` com `price_usd`/`price_brl` próprios da oferta (nunca do produto — invariante permanente) | 1 oferta por produto na maioria dos casos (baixa concorrência de preço observada) | Múltiplas ofertas reais por produto canônico, habilitando comparação de verdade | Alto | Alto — sem múltiplas ofertas, "comparar preço" não existe de fato | **Alta** |
| **Categories** | `categories` existe, populado por seed + connectors | Cobertura desconhecida por profundidade (quantos produtos têm categoria vs. quantos deveriam) | 100% dos produtos com categoria válida (Quality Rule, §7) | Não medido | Médio — afeta navegação `/categorias` e SEO | **Média** |
| **Brands** | `brands` existe; normalização de marca acontece dentro do `OfferNormalizer`/pipeline de conectores, sem um serviço dedicado de brand-matching/fuzzy-merge | Provavelmente fragmentada — mesma marca grafada diferente entre merchants é um risco real e não auditado | Marca canônica única por fabricante real | Não medido, risco alto | Médio-Alto — marca fragmentada quebra filtro por marca e Brand Match Rate | **Alta** |
| **Images** | `MediaStage` no pipeline de conectores; todos os 4 detail-parsers reais (`shoppingchina`, `megaeletronicos`, `romashopping`, `atacadoconnect`) capturam `image_url`; bucket `catalog` existe (`utils/storage.ts`/`resolveImageUrl`) | **Bifurcada**: produtos entrados via Connector Platform (Release 1.7+) provavelmente têm imagem; os 6 produtos de seed original (Sprint 3.8, pré-Connector Platform) confirmadamente **não têm** (`TECH_DEBT.md`, achado nunca revisitado) | 100% dos produtos com pelo menos 1 imagem real (Quality Rule) | Concentrado no legado pré-Connector | Médio — imagem é o maior driver de confiança percebida numa página de produto | **Média** |
| **Stores** | `stores` com dado real para lojas certificadas; Discovery cria lojas "não reivindicadas" via sitemap/robots.txt | 5 merchants certificados com dado completo (contato, horário, endereço); N lojas descobertas via Discovery com dado mínimo | Toda loja no catálogo com perfil mínimo completo | Não medido para o conjunto Discovery | Baixo-Médio — afeta confiança da página `/lojas/[slug]`, não a comparação em si | **Baixa-Média** |
| **Connectors** | Connector Platform V2 (SDK, Certification, Delta Import, Observability) — arquitetura industrial pronta para escala | **5 conectores reais** (Shopping China + 3 do Program D + Discovery-only para o resto); 4 merchants Tier 1 bloqueados comercialmente; Mobile Zone/Visão VIP bloqueados por CSR (sem headless browser) | Dezenas de conectores reais cobrindo a maioria das lojas relevantes de Ciudad del Este | Altíssimo | Altíssimo — este é literalmente o gargalo nomeado pela Mission Ω-1 | **Crítica** (breadth = Program Ω) |
| **Price History** | `price_history` append-only, `updateOfferPrice()` único caminho de escrita (ADR-017); `CanonicalPriceHistoryService` computa min/max/avg/trend | Existe desde que uma oferta teve pelo menos 1 mudança de preço registrada — para ofertas recém-sincronizadas uma única vez, histórico é raso (1 ponto) | Histórico de profundidade suficiente (múltiplos ciclos de sync) para tendência real, não apenas snapshot | Não medido, mas estruturalmente raso hoje (a maioria dos 5 conectores sincronizou uma vez cada) | Alto a médio prazo — Price Engine é um dos ativos permanentes nomeados na Constituição | **Média** (cresce organicamente com re-sync, não exige nova engenharia) |
| **Canonical Products** | Product Identity Engine em **Shadow Mode** (calcula match, nunca funde automaticamente); `MergeCandidate`/`CanonicalMergeSuggestionService` prontos | Canonical Match rate "honesto e baixo", autodocumentado em `TECH_DEBT.md`/`MARKET_INTELLIGENCE_ENGINE.md` | Match rate alto o suficiente para que Market Intelligence/Recommendation Engine tenham insumo real | Alto | Altíssimo — todo domínio de inteligência (Market Intelligence, futuro Recommendation Engine) tem teto de valor definido por este número | **Crítica** |
| **Marketplace (saúde agregada)** | `MarketplaceHealthEngine` (8 fatores), `MarketplaceCoverageService`, snapshot diário | Mecanismo maduro, mas o *resultado* que ele mede é a soma dos gaps acima | N/A — este é o medidor, não o medido | N/A | Alto — é o dashboard que torna todo o resto visível | **Alta** (ativar consumo, não construir) |
| **Knowledge (Brain/Trust)** | `CognitiveBrainService`/`KnowledgeGraphService` existem desde a Release 1.5; 21 `TrustEventType` sem mapeamento de impacto | Plumbing sem consumidor de produto real (achado da Mission Ω-1, Domínio 5) | Pelo menos 1 consumidor real informado por densidade de dado real | Estrutural, não de volume | Médio — já endereçado em `ROADMAP_2_0.md` §3/§7 (Wave 5a/5b), não duplicado aqui | Fora de escopo (já possui dono) |
| **Analytics** | `buyer_events` append-only, `merchant_analytics_daily`; North Star vector (`NORTH_STAR.md` §2) **não instrumentado** (achado da Mission Ω-1, Fase 4 item 2) | Eventos brutos existem; agregação com lente de "decisão melhorada" não existe | Vetor North Star computável e reportável | Estrutural | Alto — sem isso, nenhuma Wave abaixo consegue provar que "densidade" virou "decisão melhor" | **Alta** (instrumentação, não feature) |

---

## 2. Execution Waves

Nomeadas com um prefixo próprio (**Ω-4.N**) para nunca colidir com a numeração de `ROADMAP_2_0.md` — cada Wave abaixo referencia explicitamente qual item do roadmap aprovado ela operacionaliza.

### Ω-4.0 — Baseline Measurement (pré-requisito de todas as outras)

**Objetivo**: substituir todo "não medido" da Matrix (§1) por um número real, uma única vez, antes de qualquer Wave de execução.

**Escopo**: um conjunto de queries **read-only** (SELECT puro, nenhuma escrita) contra Supabase, cobrindo: contagem de produtos por presença de imagem/categoria/marca/canonical; contagem de ofertas por produto; profundidade média de `price_history` por oferta; contagem de `MergeCandidate` pendentes; Canonical Match rate real. Rascunho de queries fica em `database/health_checks/` (mesmo padrão já usado por `rls.sql`/`policies.sql` — consultas genéricas, reaproveitáveis).

**Dependências**: nenhuma técnica. **Depende de permissão explícita do CTO para execução** — este ambiente não tem credencial de produção, e a política deste projeto exige autorização explícita antes de qualquer query contra o banco live, mesmo read-only.

**Entregáveis**: `database/health_checks/marketplace_density.sql` (novo arquivo de query, mesmo padrão dos existentes); Matrix (§1) atualizada com números reais.

**Critério de conclusão**: toda linha da Matrix com "não medido" tem um número real.

**Indicadores**: N/A (esta Wave produz os indicadores das seguintes).

**Definition of Done**: queries versionadas em `database/health_checks/`, resultado colado em uma atualização desta Matrix, zero escrita em produção.

---

### Ω-4.1 — Canonical Density (opera sob `ROADMAP_2_0.md` Wave 1, §2)

**Objetivo**: aumentar o Canonical Match Rate — o gargalo identificado como "Crítica" na Matrix, teto de valor de todo o resto do sistema de inteligência.

**Escopo**: revisar os thresholds/heurísticas do `ProductIdentityEngine` contra dado real pós-Ω-4.0; processar a fila de `MergeCandidate` já existente (revisão humana ou regra automática de alta confiança — ver §5); **decisão explícita pendente**: sair de Shadow Mode para merge automático em candidatos de altíssima confiança é uma mudança de comportamento de escrita em produção e **exige sua própria ADR** antes de ser implementada — não incluído neste escopo sem essa aprovação.

**Dependências**: Ω-4.0 (saber o match rate real antes de agir); Product Identity Engine (já existe).

**Entregáveis**: relatório de revisão de `MergeCandidate` pendentes; proposta de ADR para merge automático de alta confiança (se justificado pelos números).

**Critério de conclusão**: fila de `MergeCandidate` pendente revisada; Canonical Match rate remedido e comparado ao baseline Ω-4.0.

**Indicadores**: Canonical Match Rate, Duplicate Canonicals.

**Definition of Done**: fila zerada ou triada; nenhuma escrita automática em produção sem ADR aprovada.

---

### Ω-4.2 — Product Coverage (opera sob Program Ω §1, breadth — apenas a parte de *qualidade* do que já está conectado, nunca contagem de merchants)

**Objetivo**: garantir que todo produto já ingerido por um conector certificado tenha os campos mínimos completos (slug, categoria, marca) — não aumentar o número de merchants (isso é Program Ω).

**Escopo**: auditoria de produtos sem categoria/marca válida pós-Ω-4.0; correção via re-normalização (não via reescrita manual) para os casos sistemáticos.

**Dependências**: Ω-4.0.

**Entregáveis**: relatório de produtos incompletos por conector; correção automatizada onde aplicável (ver §5 — Category/Brand Normalization).

**Critério de conclusão**: Products Without Category / Products Without Brand abaixo de um limiar aceitável (definido após Ω-4.0 medir a linha de base — não fixado a priori sem dado real, mesma disciplina já usada em `docs/marketplace/Tier1_Merchants.md`).

**Indicadores**: Products Without Category, Products Without Brand, Products Without Image.

**Definition of Done**: relatório publicado, limiar definido com dado real, correções automatizadas aplicadas onde não exigem julgamento humano.

---

### Ω-4.3 — Image Completion

**Objetivo**: fechar o gap bifurcado identificado na Matrix — produtos de seed pré-Connector Platform sem imagem.

**Escopo**: confirmar via Ω-4.0 quantos produtos realmente não têm imagem; para os capturados por conector mas com falha pontual de `MediaStage`, re-processar mídia (mecanismo já existe); para os produtos de seed legado, decidir descontinuar (se não vendidos por nenhum conector real hoje) ou providenciar imagem real — decisão de produto, não técnica.

**Dependências**: Ω-4.0; `MediaStage`/`utils/storage.ts` (já existem).

**Entregáveis**: relatório de produtos sem imagem por origem (seed legado vs. falha de conector); reprocessamento de mídia para o segundo grupo.

**Critério de conclusão**: Products Without Image aproxima-se de zero para produtos ativos de conectores reais.

**Indicadores**: Images per Product, Products Without Image.

**Definition of Done**: reprocessamento automatizado rodado e verificado; decisão explícita registrada para o legado (manter, descontinuar ou providenciar imagem).

---

### Ω-4.4 — Historical Prices

**Objetivo**: aumentar a profundidade real do histórico de preço — hoje raso porque a maioria dos conectores sincronizou uma única vez.

**Escopo**: **este é o único item da Matrix que não precisa de trabalho de engenharia nova** — profundidade de histórico cresce automaticamente a cada novo ciclo de sync dos conectores já certificados. O trabalho aqui é operacional: garantir que os crons de sync (`vercel.json`, `.github/workflows/high-frequency-crons.yml`) estejam de fato rodando com regularidade — dependência direta da pendência já nomeada em `PRODUCTION_BASELINE_1.9.md` §9 (`CRON_SECRET`/`CRON_APP_URL` não configurados).

**Dependências**: configuração dos secrets de cron (fora do escopo de código, é configuração de ambiente).

**Entregáveis**: confirmação de que os crons de sync estão ativos; nenhum código novo.

**Critério de conclusão**: pelo menos 2 ciclos de sync completos registrados por conector certificado, após a configuração dos secrets.

**Indicadores**: Price Freshness, Price Volatility (measurable), profundidade média de `price_history`.

**Definition of Done**: crons confirmadamente ativos (não apenas presentes no código); resultado observável em `market_changes`/`price_history`.

---

### Ω-4.5 — Brand Intelligence (opera sob `ROADMAP_2_0.md` Wave 1, §2)

**Objetivo**: normalizar marca de forma canônica — hoje sem um serviço dedicado, risco real de fragmentação (mesma marca grafada diferente por merchant diferente) nunca auditado.

**Escopo**: auditoria de `brands` pós-Ω-4.0 para variantes óbvias (case, acentuação, abreviação); proposta de regra de normalização determinística (não fuzzy-match especulativo — mesma disciplina de "nunca inferir silenciosamente" já usada em `docs/marketplace/`).

**Dependências**: Ω-4.0.

**Entregáveis**: relatório de variantes de marca encontradas; regra de normalização proposta (determinística primeiro, fuzzy só se a auditoria justificar).

**Critério de conclusão**: Brand Match Rate medido e um plano de correção com critério de aceite definido.

**Indicadores**: Brand Match Rate, Products Without Brand.

**Definition of Done**: relatório publicado; nenhuma fusão de marca automática sem revisão, mesma cautela de Ω-4.1.

---

### Ω-4.6 — Merchant Quality (opera sob `ROADMAP_2_0.md` Wave 4, §4 — hardening, não ativação)

**Objetivo**: garantir que todo merchant certificado tenha score/observabilidade completos — mecanismo já existe (`ConnectorHealthService`/`ConnectorObservabilityService`/`MerchantPriorityService`), esta Wave é sobre cobertura de uso, não construção.

**Escopo**: confirmar que os 5 conectores reais aparecem corretamente em `ConnectorDirectoryService` com health/quality score atualizados; nenhuma tabela nova, nenhum serviço novo.

**Dependências**: Ω-4.0 (para saber se há gap real de observabilidade, não suposto).

**Entregáveis**: confirmação de cobertura de observabilidade para os 5 conectores reais.

**Critério de conclusão**: Merchant Quality Score computável e não-nulo para 100% dos merchants certificados.

**Indicadores**: Merchant Quality Score, Merchant Coverage.

**Definition of Done**: nenhum merchant certificado com score ausente/nulo.

---

### Ω-4.7 — Marketplace Health (ativação de consumo, não construção)

**Objetivo**: o `MarketplaceHealthEngine` já existe e já computa 8 fatores — esta Wave é sobre expor os KPIs de §3 de forma consumível (dashboard, §4), não sobre construir novo cálculo.

**Escopo**: mapear cada KPI da §3 a um fator já computado ou a um novo agregado leve sobre dado já existente (nunca nova tabela); nenhuma feature de UI nova é construída nesta missão (restrição explícita) — este item entrega a **especificação**, implementação fica para uma Wave de execução separada e explicitamente mandatada.

**Dependências**: Ω-4.0 a Ω-4.6 (a maioria dos KPIs de §3 depende dos números que essas Waves produzem).

**Entregáveis**: especificação completa do Execution Dashboard (§4) — pronta para implementação futura, não implementada aqui.

**Critério de conclusão**: cada KPI de §3 tem uma fonte de dado nomeada e um dono de Wave nomeado.

**Indicadores**: Overall Marketplace Health (o agregado final).

**Definition of Done**: especificação revisada e aprovada pelo CTO antes de qualquer implementação.

---

## 3. Marketplace Health KPIs

Cada KPI abaixo nomeia sua fonte real (nunca um número a inventar) e o domínio da Matrix (§1) que o alimenta.

| KPI | Fórmula / Fonte | Domínio |
|---|---|---|
| **Products Coverage** | `COUNT(products)` vs. estimativa de mercado real (requer input externo, `docs/marketplace/`) | Products |
| **Offer Density** | `COUNT(offers) / COUNT(DISTINCT products)` | Offers |
| **Offers per Product** | Mesmo que acima, expresso por produto individual (distribuição, não só média) | Offers |
| **Images per Product** | `COUNT(products WHERE image_url IS NOT NULL) / COUNT(products)` | Images |
| **Categories Coverage** | `COUNT(products WHERE category_id IS NOT NULL) / COUNT(products)` | Categories |
| **Canonical Match Rate** | Já existe conceitualmente em `TECH_DEBT.md`/`MARKET_INTELLIGENCE_ENGINE.md` — `COUNT(products WHERE canonical_product_id IS NOT NULL) / COUNT(products)` | Canonical Products |
| **Brand Match Rate** | `COUNT(products WHERE brand_id IS NOT NULL) / COUNT(products)` (proxy inicial; taxa de variantes normalizadas é um KPI de segunda ordem, Ω-4.5) | Brands |
| **Merchant Coverage** | `COUNT(stores WHERE certified=true) / COUNT(stores discovered)` — já parcialmente exposto por `MarketplaceCoverageService` | Connectors/Stores |
| **Price Freshness** | Já existe: `FreshnessEngine` (Real-Time Commerce, Release 1.8) | Price History |
| **Price Volatility** | Já existe: `VolatilityEngine` | Price History |
| **Products Without Image** | Inverso de Images per Product | Images |
| **Products Without Brand** | Inverso de Brand Match Rate | Brands |
| **Products Without Category** | Inverso de Categories Coverage | Categories |
| **Orphan Products** | Produtos sem nenhuma `offer` ativa vinculada | Products/Offers |
| **Inactive Offers** | `offers WHERE in_stock=false` persistente por N dias — janela a definir com dado real | Offers |
| **Duplicate Canonicals** | `MergeCandidate` pendentes com confiança acima do threshold, nunca resolvidos | Canonical Products |
| **Marketplace Freshness Score** | Composto: `FreshnessEngine` + regularidade de sync (Ω-4.4) | Marketplace |
| **Marketplace Density Score** | Composto: média ponderada de Offer Density + Images + Categories + Brand + Canonical Match | Marketplace |
| **Merchant Quality Score** | Já existe: `ConnectorHealthService`/`MerchantPriorityService` | Connectors |
| **Overall Marketplace Health** | Já existe: `MarketplaceHealthEngine` (8 fatores) — os KPIs acima alimentam ou refinam esses fatores, não os substituem | Marketplace |

**Princípio explícito**: nenhum KPI acima exige uma tabela nova. Todos são leituras agregadas sobre schema já existente, mesma disciplina de "compute-on-read" já usada em `MerchantPriorityService`/`MarketplaceHealthEngine`.

---

## 4. Execution Dashboard — especificação (não implementado nesta missão)

Estrutura proposta, para implementação em uma Wave futura explicitamente mandatada:

```
┌─────────────────────────────────────────────────────────┐
│  MARKETPLACE DENSITY DASHBOARD                            │
├─────────────────────────────────────────────────────────┤
│  KPIs           → tabela da §3, valor atual + delta       │
│  Status         │  🟢 saudável / 🟡 atenção / 🔴 crítico  │
│                 │  (limiares definidos após Ω-4.0)        │
│  Alertas        │  reaproveita AlertRules já existente     │
│                 │  (marketplace-operations, mesmo padrão)  │
│  Evolução       │  série temporal — reaproveita            │
│                 │  marketplace_health_snapshots (já existe)│
│  Pendências     │  fila de MergeCandidate + produtos       │
│                 │  incompletos (Ω-4.1/Ω-4.2/Ω-4.3)         │
│  Riscos         │  Duplicate Canonicals, Orphan Products,  │
│                 │  Inactive Offers acima do limiar         │
│  Priorização    │  ordenação por Impacto × Esforço,        │
│                 │  mesma lógica de MerchantPriorityService │
└─────────────────────────────────────────────────────────┘
```

**Reuso, não construção nova**: `marketplace_health_snapshots` (Release 1.8 Program 0 Wave 1) já é o snapshot diário certo para "Evolução"; `MarketplaceAlertService`/`AlertRules` já é o mecanismo certo para "Alertas" — este dashboard é uma nova composição de leitura, não um novo domínio.

**Página**: se implementado, estende `/admin/marketplace-operations` (já existe, 5 abas) com uma 6ª aba "Densidade" — não uma rota nova, mesmo padrão de composição já usado por todo dashboard admin do projeto (`Promise.allSettled`).

---

## 5. Automation Opportunities

| Automação | Já existe mecanismo? | Nota |
|---|---|---|
| Recrawl (re-sync periódico) | ✅ Sim — cron `connectors/sync`, Delta Import evita reprocessar o que não mudou | Só precisa dos secrets configurados (Ω-4.4) |
| Recanonicalization | 🟡 Parcial — `ProductIdentityEngine` calcula, não reaplica automaticamente sobre produtos já existentes numa nova rodada | Candidato real de automação, escopo de Ω-4.1 |
| Image completion | 🟡 Parcial — `MediaStage` roda no pipeline de sync; reprocessamento retroativo para produtos já existentes não é automático | Escopo de Ω-4.3 |
| Brand normalization | ❌ Não existe hoje como serviço dedicado | Escopo de Ω-4.5 — construir a regra determinística é trabalho novo, mas pequeno e sem tabela nova |
| Category normalization | 🟡 Parcial — normalização acontece na ingestão (`NormalizationStage`), não há correção retroativa | Escopo de Ω-4.2 |
| Attribute extraction | ❌ Não existe como capacidade de primeira classe (achado desta auditoria — nenhum campo de atributo estruturado além dos já modelados) | **Fora do escopo desta missão** — seria uma feature nova (schema novo), violaria a restrição "não criar funcionalidades novas"; nomeado aqui como gap real, não construído |
| Offer cleanup (ofertas mortas) | 🟡 Parcial — `in_stock` existe, sem job de limpeza/arquivamento automático | Candidato de automação leve, baixo risco |
| Merchant validation | ✅ Sim — `ConnectorCertificationService`/Quality Score já existe | Ativar consumo (Ω-4.6), não construir |
| Price history cleanup | N/A — histórico é append-only por design (`AI_CONSTITUTION.md` Regra #14, dados históricos não são apagados) | Nenhuma automação de "limpeza" deve remover histórico — só a leitura/agregação pode ser otimizada |
| Canonical merge | 🟡 Parcial — `MergeCandidate` existe, fusão é manual/Shadow Mode | Automação de alta confiança exige ADR própria (ver Ω-4.1) |
| Duplicate detection | ✅ Sim — é literalmente o que `ProductIdentityEngine`/`MergeCandidate` fazem | Ativar consumo da fila já existente |
| Dead offers | 🟡 Parcial — dado existe (`in_stock`, `updated_at`), sem regra explícita de "morta" | Definir limiar com dado real (Ω-4.0), não arbitrário |
| Orphan products | ❌ Não há query/job dedicado hoje | Query simples, candidato de baixo esforço/alto valor para Ω-4.0/Ω-4.2 |

---

## 6. Technical Debt Reduction (que aumenta densidade, sem criar feature nova)

Extraído de `docs/engineering/TECH_DEBT.md`, filtrado para itens que aumentam densidade/qualidade de dado — nenhum item novo inventado, apenas recorte do que já está documentado:

- **5 serviços pré-Wave 4/5 embutem `supabase.from(...)` direto** em vez de repositório (`ProductHealthService`, `GrowthContextBuilder`, `DecisionContextBuilder`, `CatalogIntelligenceService`, `ExecutiveSummaryService`) — não afeta densidade diretamente, mas dificulta auditar/instrumentar essas mesmas leituras para os KPIs de §3. Corrigir antes de expandir consumo por essa via.
- **Bug pré-existente do parser Shopping China**: preço em Guarani gravado em `price_usd` com `currency: "PYG"` — afeta diretamente a confiabilidade de Price Freshness/qualquer KPI de preço para essa loja. Corrigir tem impacto direto em densidade de dado *correto*, não apenas presente.
- **Agregações de categoria/marca em memória, não `GROUP BY` Postgres** (`CatalogMetrics.getCategoryCoverage()`/`getBrandCoverage()`) — já nomeado como ponto de virada em `MARKETPLACE_FOUNDATION_SCALE_AUDIT.md`. Relevante diretamente para os KPIs de Categories/Brand Coverage (§3) escalarem — mesmo item já é escopo de `ROADMAP_2_0.md` Wave 1.
- **`utils/storage.ts`/`resolveImageUrl` não é usado por nenhum componente ainda** — mecanismo pronto, não conectado. Relevante para Ω-4.3.

---

## 7. Marketplace Quality Rules

Regras propostas, cada uma mapeada a um KPI de §3 e a uma Wave que a persegue — nenhuma é nova infraestrutura, todas são invariantes de qualidade sobre schema já existente:

1. **Todo produto ativo deve possuir slug único** — já é invariante hoje (schema), sem gap conhecido.
2. **Todo produto vendido por um conector certificado deve possuir imagem** — Ω-4.3. Não estendido a produtos de seed legado sem decisão de produto explícita.
3. **Todo produto deve possuir categoria válida** — Ω-4.2.
4. **Todo produto deve possuir marca válida** — Ω-4.2/Ω-4.5.
5. **Todo produto com match de alta confiança deve ter canonical resolvido** — Ω-4.1, condicionado a ADR se a resolução for automática.
6. **Toda oferta deve possuir `store_id` válido (merchant real)** — já é invariante de FK hoje.
7. **Todo registro de `price_history` deve possuir timestamp e nunca ser alterado/apagado após criado** — já é invariante hoje (ADR-017, append-only).
8. **Todo merchant certificado deve possuir Quality Score computável** — Ω-4.6.
9. **Nenhum produto órfão (zero ofertas ativas) permanece indexado sem revisão** — Ω-4.2/§5 (Orphan Products).
10. **Nenhum `MergeCandidate` de alta confiança permanece pendente indefinidamente** — Ω-4.1.

---

## 8. Execution Roadmap

| Etapa | Objetivo | Impacto | Complexidade | Tempo estimado | Risco | Dependências | Critério de aceite |
|---|---|---|---|---|---|---|---|
| Ω-4.0 Baseline | Medir tudo | Altíssimo (habilita todo o resto) | Baixa | Curto | Baixo (read-only) | Permissão explícita do CTO | Matrix §1 sem "não medido" |
| Ω-4.1 Canonical Density | Resolver fila de match | Altíssimo | Média (decisão de automação exige ADR) | Médio | Médio (decisão de merge automático é Tipo 1) | Ω-4.0 | Match rate remedido, fila triada |
| Ω-4.2 Product Coverage | Completar categoria/marca | Alto | Baixa-Média | Curto-Médio | Baixo | Ω-4.0 | Limiar definido e perseguido |
| Ω-4.3 Image Completion | Fechar gap de imagem | Médio | Baixa | Curto | Baixo | Ω-4.0 | Reprocessamento rodado |
| Ω-4.4 Historical Prices | Ativar profundidade de histórico | Médio-Longo prazo | Nenhuma (config apenas) | Curto | Baixo | Secrets de cron configurados | 2+ ciclos de sync confirmados |
| Ω-4.5 Brand Intelligence | Normalizar marca | Médio-Alto | Média | Médio | Baixo-Médio | Ω-4.0 | Regra de normalização proposta e revisada |
| Ω-4.6 Merchant Quality | Ativar consumo de score já existente | Médio | Baixa | Curto | Baixo | Ω-4.0 | 100% dos merchants com score |
| Ω-4.7 Marketplace Health | Especificar dashboard | Alto (visibilidade) | Baixa (é spec, não build) | Curto | Baixo | Ω-4.0 a Ω-4.6 | Spec aprovada pelo CTO |

---

## Governança — o que esta missão explicitamente NÃO decide

- **Não abre nenhuma Wave.** Este é um Blueprint, mesmo status de `RELEASE_ALIGNMENT.md` quando foi criado — recomendação estruturada, execução exige mandato explícito e separado do CTO por Wave, mesma disciplina de toda Wave desde a Release 1.7.
- **Não autoriza nenhuma query contra produção.** Ω-4.0 nomeia a necessidade e propõe o mecanismo; a execução em si aguarda permissão explícita.
- **Não decide sobre merge automático de canonicals.** Ω-4.1 identifica que isso mudaria comportamento de escrita em produção e explicitamente exige uma ADR própria antes de qualquer implementação — não implementada, nem decidida, aqui.
- **Não constrói Attribute Extraction.** Identificado como gap real (§5), mas construí-lo seria uma feature nova — fora da restrição explícita desta missão.
- **Não implementa o Execution Dashboard.** §4 é especificação, não código.

## ADRs potencialmente necessárias (não abertas nesta missão)

1. **Merge automático de `MergeCandidate` de alta confiança** (Ω-4.1) — muda comportamento de escrita em produção, Tipo 1 por definição (`NORTH_STAR.md` §12).
2. **Destino do catálogo de seed legado sem imagem** (Ω-4.3) — decisão de produto (manter/descontinuar/providenciar imagem), não puramente técnica.
3. **Se e quando construir Attribute Extraction como domínio novo** — fora de escopo aqui, mas nomeado para uma futura Release caso a densidade de atributo se mostre um gargalo real após Ω-4.0.

## Próximo passo recomendado

Aprovação explícita do CTO para **Ω-4.0** apenas — é a única Wave sem nenhuma decisão de produto pendente, sem risco de escrita em produção, e é o pré-requisito de todas as outras sete. Todas as demais Waves permanecem propostas até Ω-4.0 substituir "não medido" por números reais.
