# KPIS.md
# Indicadores Oficiais do ParaguAI — Release 1.8

**Versão**: 1.3
**Criado**: 2026-07-02 (Sprint Zero — Release 1.8 Project Preparation & Foundation Consolidation)
**Atualizado**: 2026-07-03 — adiciona a seção "Operações do Marketplace (Program 0)", a seção "Exchange Intelligence (Program A — Wave 1)" e a seção "Real-Time Commerce (Program A — Wave 2)", com os indicadores oficiais entregues por todas as Waves.
**Status**: Referência oficial de medição a partir do Release 1.8
**Hierarquia**: Subordinado a `NORTH_STAR.md` §2 (a North Star Metric — "número de decisões melhores" — permanece a métrica final; todo KPI abaixo é insumo dela, nenhum a substitui).

---

## Como usar este documento

Cada KPI tem uma **definição oficial** (o que exatamente é medido, de onde vem o dado) — não apenas um nome. Um KPI sem definição oficial é ambíguo por design e cada leitor mede algo diferente. Nenhum KPI listado aqui é uma meta numérica — este documento define **o que medir e como**, não **quanto é bom**. Metas específicas (ex.: "500 lojas até X") são decisão de planejamento de Release, não deste documento.

Consistente com `NORTH_STAR.md` §2: nenhum KPI de volume (lojas, produtos, sessões) é a North Star em si — é insumo. O teste permanente para qualquer KPI novo proposto no futuro: "isso mede uma decisão melhor tomada, ou apenas um número maior?"

---

## Catálogo e Cobertura

| KPI | Definição oficial | Fonte |
|---|---|---|
| **Número de lojas** | Contagem de `stores` com pelo menos 1 oferta ativa (`in_stock = true` em pelo menos uma `offers` vinculada) — lojas sem oferta ativa não contam, para não inflar cobertura com catálogo morto. | `stores` + `offers` |
| **Número de produtos** | Contagem de `canonical_products` (identidade permanente, Wave 4) — não de `products` brutos por connector, que sobre-contam o mesmo produto real vendido por lojas diferentes. | `canonical_products` |
| **Cobertura de comparabilidade** | % de `canonical_products` com 2+ ofertas de lojas diferentes vinculadas — o indicador mais alinhado à missão (`MARKETPLACE_VISION.md` §7: "marketplace não é volume, é comparabilidade real") do que contagem bruta de produtos. | `canonical_products` + `offers` |

---

## Live Pricing / Freshness

| KPI | Definição oficial | Fonte |
|---|---|---|
| **Preço atualizado por hora** | Contagem de execuções bem-sucedidas de refresh de oferta (Live Pricing Engine) por hora, segmentado por tier (hot/warm/cold) — um agregado único misturaria tiers com expectativas de frequência muito diferentes. | Live Pricing Engine (Wave 2, Release 1.8) |
| **Freshness médio** | Mediana (não média — sensível a outliers de ofertas "cold" raramente checadas) de `agora − last_checked_at`, calculada separadamente por tier. Freshness Score 0-100 e classificação (Live/Fresh/Recent/Old/Stale) já implementados por oferta (Program A — Wave 2, `FreshnessEngine`) — falta apenas o tiering hot/warm/cold do Live Pricing Engine em si (Wave ainda não construída). | Freshness Engine (`src/domains/realtime-commerce`) |
| **Tempo médio entre alteração real e sincronização** | Só mensurável quando o merchant tem uma fonte de verdade externa com timestamp próprio (ex.: feed com `updated_at` do lojista) — para lojas sem essa informação, este KPI não é computável e deve ser reportado como "N/A", não estimado. | Live Pricing Engine + dado do conector, quando disponível |
| **Tempo médio de atualização do dólar** | Idade mediana da cotação de câmbio em uso no momento de cada requisição de preço convertido — deve refletir a cadência real do fornecedor (ADR-043: alvo de 5 minutos), não o intervalo nominal contratado. Implementado (Program A — Wave 1): `ConvertedPrice.usingFallback` já sinaliza quando uma cotação passou de 15 minutos (3x a cadência esperada). | `exchange_rates` (Exchange Intelligence Platform) |

---

## Exchange Intelligence (Program A — Wave 1)

| KPI | Definição oficial | Fonte |
|---|---|---|
| **Exchange Provider Health Score** | 0-100 por provedor: 60% uptime (taxa de sucesso na amostra das últimas 20 execuções) + 40% (1 − taxa de erro) — mesma fórmula do Connector Health Score (Program 0 — Wave 1). | `ExchangeProviderHealthService` |
| **Conversões/dia** | Contagem de `exchange_conversion_log` por dia — mede uso real da API pública de conversão, não apenas disponibilidade. | `exchange_conversion_log` |
| **Economia do comprador (USD)** | Soma de `(maior preço observado na janela − preço atual)` para ofertas com queda real de preço — nunca inclui ofertas cujo preço subiu. | `ExchangeAnalyticsService.computeBuyerSavings` |
| **Valorização do catálogo (%)** | Variação entre o valor total do catálogo ativo (`Σ price_usd`) no início e no fim de uma janela — reconstruído a partir de deltas observados em `price_history`, não um snapshot diário persistido (gap nomeado em `TECH_DEBT.md`). | `ExchangeAnalyticsService.computeCatalogValueGrowth` |

---

## Real-Time Commerce (Program A — Wave 2)

| KPI | Definição oficial | Fonte |
|---|---|---|
| **Mudanças de mercado detectadas/dia** | Contagem de linhas em `market_changes` por dia, segmentado por `change_type` — o insumo bruto de todo o resto desta seção, nunca um número isolado sem o breakdown por tipo. | `market_changes` |
| **Preços caindo vs. subindo (hoje)** | Contagem de `price_decreased` vs. `price_increased` em `market_changes` na janela do dia corrente — o Market Pulse Engine computa isso ao vivo (`MarketPulseService.computeToday`), sem esperar snapshot. | `MarketPulseService` |
| **Volatility Score por produto** | 0-100 e classificação (Muito Estável → Muito Volátil), 4 fatores documentados (frequência/amplitude/velocidade/persistência, pesos iguais) — compute-on-read a partir de `market_changes`, sem tabela própria (mesma disciplina do Merchant Priority Score). | `VolatilityEngine` |
| **Freshness Score por oferta** | 0-100 e classificação (Live/Fresh/Recent/Old/Stale), thresholds explícitos (5 min/1h/6h/24h) — ver seção "Live Pricing / Freshness" acima. | `FreshnessEngine` |
| **Store Update Score / ranking** | 0-100 por loja, composto de intervalo médio de atualização, Price Reaction Speed (mediana de lag até reagir a uma mudança de preço do mesmo produto em outra loja), estabilidade de catálogo e freshness média — só rankeia lojas com pelo menos 1 mudança detectada na janela (sem atividade, sem score fabricado). | `StoreUpdateIntelligenceService` |
| **Candidatos de alerta gerados/dia** | Contagem de `buyer_alert_candidates` criados por dia, por `alert_type` — mede o volume que o futuro Buyer Alert Engine real (com envio) processaria, não engajamento de comprador (nenhum alerta é entregue nesta Wave). | `buyer_alert_candidates` |

---

## Comprador

| KPI | Definição oficial | Fonte |
|---|---|---|
| **Compradores ativos** | Contagem de `buyers.id` distintos (não `anonymous_id` — que sobre-conta por dispositivo/limpeza de browser) com pelo menos 1 evento em `buyer_events` na janela de medição. Requer Buyer Identity Model implementado (Wave 6) — até lá, o proxy é `anonymous_id` distintos, reportado explicitamente como proxy, não como o KPI real. | `buyers` + `buyer_events` |
| **Sessões** | Contagem de `buyer_sessions` na janela de medição — inclui sessões anônimas e autenticadas, sem distinção nesta métrica (a distinção pertence a "Compradores ativos" acima). | `buyer_sessions` |
| **Buyer Recorrente (%)** | % de `buyers.id` com sessões em pelo menos N das últimas M semanas (N/M definidos operacionalmente, não fixados aqui — ver `RELEASE_1_8_BUYER_IDENTITY_MODEL.md` §5, "rótulo derivado", nunca uma transição de estado real). | `buyers` + `buyer_sessions` |

---

## Lojista

| KPI | Definição oficial | Fonte |
|---|---|---|
| **Lojistas Premium** | Contagem de `merchants` com `plan != 'free'` **e** billing ativo confirmado (não apenas plano atribuído manualmente) — distinção crítica a partir do Release 1.8, quando billing real existe pela primeira vez. | `merchants` + `merchant_plans` + provedor de billing (Wave 8) |
| **Conversão Free → Premium** | % de merchants que fizeram upgrade de `free` para qualquer plano pago, sobre o total de merchants com claim aprovado (denominador correto — não sobre todas as lojas descobertas, que incluem muitas nunca reivindicadas). | `merchants` + `store_claims` |
| **Tempo médio de Claim** | Mediana do intervalo entre `store_claims.created_at` e a aprovação (`store_claims` status → `approved`), segmentado por caminho (revisão manual vs. o auto-approve que a Wave 6 do Release 1.7 desligou — hoje, 100% passa por revisão manual, ADR-042). | `store_claims` |

---

## SEO

| KPI | Definição oficial | Fonte |
|---|---|---|
| **Páginas indexadas** | Contagem confirmada pelo Google Search Console (ou equivalente) — nunca a contagem de URLs no sitemap, que mede o que foi *oferecido* para indexação, não o que foi *aceito*. | Google Search Console (fonte externa, não o banco) |
| **Sessões orgânicas** | Sessões com `referrer`/UTM indicando origem de busca orgânica, sobre o total de sessões — mede a eficácia real do canal SEO, não apenas o volume de páginas publicadas. | `buyer_sessions` + Search Console |

---

## Receita

| KPI | Definição oficial | Fonte |
|---|---|---|
| **Receita** | Valor efetivamente cobrado e confirmado pelo provedor de billing (Wave 8) — nunca o somatório de `merchant_plans.price_monthly` × contagem de merchants "no plano", que mede intenção de preço, não receita realizada. | Provedor de billing |
| **MRR (Monthly Recurring Revenue)** | Receita recorrente mensal normalizada — soma de assinaturas ativas convertidas para base mensal (uma assinatura anual conta como 1/12 por mês). Padrão de mercado, não uma definição própria do ParaguAI. | Provedor de billing |
| **ARR (Annual Recurring Revenue)** | MRR × 12 — projeção, não receita já realizada; deve sempre ser reportado com essa qualificação explícita, nunca apresentado como dinheiro já em caixa. | Derivado de MRR |

---

## Operações do Marketplace (Program 0)

Diferente das seções acima (voltadas a decisão de negócio), estes são indicadores **operacionais internos** — respondem "o marketplace está saudável e sob controle?", não "estamos crescendo?". Entregues pela Wave 1 (Marketplace Operations Platform, `src/domains/marketplace-operations/`). Não substituem nem duplicam "Número de lojas"/"Cobertura de comparabilidade" acima — são complementares (saúde operacional vs. volume de negócio).

| KPI | Definição oficial | Fonte |
|---|---|---|
| **Marketplace Health Score** | 0-100, soma ponderada de 8 fatores documentados (Connector Health 20%, Freshness 15%, Coverage 15%, Canonical Catalog 10%, Discovery 10%, Claims 10%, Analytics/Brain Volume 10%, Connector Errors 10%) — pesos e fórmula completa em `src/domains/marketplace-operations/scoring/HealthScoring.ts`. Persistido diariamente (`marketplace_health_snapshots`, uma linha/dia) para série histórica. | `MarketplaceHealthEngine` |
| **Merchant Priority Score / Tier** | 0-100 por loja (Diamond ≥80 / Gold ≥60 / Silver ≥35 / Bronze abaixo), computado sob demanda (sem tabela própria — ver `MerchantPriorityService.ts`) a partir de 7 fatores reais (valor de negócio, popularidade, frescor, cobertura, tamanho de catálogo, frequência de sync, volatilidade de preço). Premium e SEO deliberadamente **não** pesam nesta fórmula — nenhum dos dois tem instrumentação real ainda (ver `TECH_DEBT.md`). | `MerchantPriorityService` |
| **Connector Health Score** | 0-100 por conector: 60% uptime (taxa de sucesso na amostra das últimas 20 execuções) + 40% (1 − taxa de erro) — estende o Ecosystem Monitor já existente desde a Wave 2/Release 1.7, não o duplica. | `ConnectorHealthService` |
| **Syncs/hora** e **Atualizações de preço/hora** | Contagem de `connector_sync_runs`/`price_history` iniciadas na última hora corrida. | `MarketplaceMetricsService` |
| **Taxa de Claim** | % de `stores` com claim aprovado sobre o total de lojas — reporta cobertura de reivindicação, distinto de "Conversão Free → Premium" (que já mede a etapa seguinte, monetização). | `MarketplaceMetricsService` |
| **Alertas operacionais abertos** | Contagem de `marketplace_alerts` com status `pending`/`acknowledged`, por tipo (conector parado, loja sem sync, cobertura baixa, discovery estagnado, claim pendente, merge backlog, health caiu, freshness baixa). | `MarketplaceAlertService` |

---

## Nota sobre KPIs ainda não computáveis

Vários KPIs deste documento (Compradores Ativos real, Lojistas Premium com billing, MRR/ARR) dependem de infraestrutura que ainda não existe no código — Buyer Identity Model (ADR-046) e billing real (Wave 8) são pré-requisitos nomeados, não implementados neste Sprint Zero (mandato do CTO: nenhum código escrito). Até que essas Waves entreguem, os KPIs correspondentes devem ser reportados com a fonte de proxy explicitamente qualificada (ex.: "anonymous_id distintos, proxy de Compradores Ativos até a Wave 6") — nunca apresentados como o KPI oficial já mensurável, consistente com `AI_CONSTITUTION.md` V ("Estado honesto, sempre").
