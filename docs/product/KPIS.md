# KPIS.md
# Indicadores Oficiais do ParaguAI — Release 1.8

**Versão**: 1.0
**Criado**: 2026-07-02 (Sprint Zero — Release 1.8 Project Preparation & Foundation Consolidation)
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
| **Freshness médio** | Mediana (não média — sensível a outliers de ofertas "cold" raramente checadas) de `agora − last_checked_at`, calculada separadamente por tier. | Freshness Engine |
| **Tempo médio entre alteração real e sincronização** | Só mensurável quando o merchant tem uma fonte de verdade externa com timestamp próprio (ex.: feed com `updated_at` do lojista) — para lojas sem essa informação, este KPI não é computável e deve ser reportado como "N/A", não estimado. | Live Pricing Engine + dado do conector, quando disponível |
| **Tempo médio de atualização do dólar** | Idade mediana da cotação de câmbio em uso no momento de cada requisição de preço convertido — deve refletir a cadência real do fornecedor (ADR-043: alvo de 5 minutos), não o intervalo nominal contratado. | `exchange_rates` (Exchange Engine) |

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

## Nota sobre KPIs ainda não computáveis

Vários KPIs deste documento (Compradores Ativos real, Lojistas Premium com billing, MRR/ARR) dependem de infraestrutura que ainda não existe no código — Buyer Identity Model (ADR-046) e billing real (Wave 8) são pré-requisitos nomeados, não implementados neste Sprint Zero (mandato do CTO: nenhum código escrito). Até que essas Waves entreguem, os KPIs correspondentes devem ser reportados com a fonte de proxy explicitamente qualificada (ex.: "anonymous_id distintos, proxy de Compradores Ativos até a Wave 6") — nunca apresentados como o KPI oficial já mensurável, consistente com `AI_CONSTITUTION.md` V ("Estado honesto, sempre").
