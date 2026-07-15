# MARKET_COVERAGE_REPORT.md
# PROGRAM ΔR — MISSION ΔR-2 — Objetivo 1 + Objetivo 7

**Categoria**: `docs/marketplace/` (ADR-048)
**Data desta consolidação**: 2026-07-14
**Natureza**: auditoria — nenhum código, migration ou dado alterado. Todo número abaixo é reaproveitado de medição real já executada por missões anteriores (citada por documento e data), nunca uma nova estimativa. Onde uma medição está desatualizada frente ao catálogo de hoje, isso é declarado explicitamente — nunca escondido atrás de um número extrapolado.

---

## 0. Como ler este documento

Cada número tem uma **data de medição** e uma **fonte**. Números medidos em datas diferentes não foram re-somados como se fossem simultâneos — quando o catálogo cresceu entre duas medições (o que aconteceu repetidamente nesta fase), isso é nomeado, não escondido. Nível de confiança segue a mesma escala já usada por `docs/product/KPI_BASELINE.md`: **Alto** (contagem direta), **Médio** (proxy/estimativa), **Baixo/Não medido nesta escala** (inferência ou dado desatualizado).

---

## 1. Objetivo 1 — Marketplace Coverage Audit

### 1.1 Universo de lojas conhecido

O único universo de lojas já auditado tecnicamente é o dos **10 merchants Tier 1** (`docs/marketplace/Tier1_Merchants.md`, auditoria original 2026-07-03, revisada 2026-07-08). **Nenhuma loja fora desses 10 foi auditada até hoje** — este é o primeiro limite real da cobertura: o ParaguAI não sabe, com dado medido, o que existe além desses 10 candidatos.

| Categoria | Contagem | Lojas |
|---|---:|---|
| **Total de lojas auditadas (Tier 1)** | **10** | Shopping China, Cellshop, Nissei, Mega Eletrônicos, Casa Americana, Roma Shopping, Mobile Zone, New Zone, Atacado Connect, Visão VIP |
| **Ativas (`stores` row real + Connector registrado)** | **5** | Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect, Mobile Zone |
| **Sincronizadas pelo menos 1 vez com dado real** | **5** | as mesmas 5 acima |
| **Bloqueadas (robots.txt nomeia `ClaudeBot` e/ou Cloudflare 403 ativo)** | **5** | Cellshop, Nissei, Casa Americana, New Zone, Visão VIP |
| **Integração parcial** (connector existe, mas não certificado / catálogo real muito abaixo do potencial estimado) | **1** | Shopping China |
| **Integração completa** (certificado nos 15 critérios de `Tier1_Merchants.md` §2) | **4** | Mega Eletrônicos, Roma Shopping, Atacado Connect, Mobile Zone |

**Achado que corrige um documento existente**: `docs/product/RELEASE_2_FOUNDATION_COMPLETE.md` §7 registra "4 merchants certificados mas comercialmente bloqueados", citando Cellshop/Nissei/Casa Americana/New Zone — mas omite **Visão VIP**, que `docs/marketplace/Tier1_Merchants.md` §5.10 e `docs/business/TIER1_PARTNERS.md` já registram como `Restricted — Commercial Partnership Recommended` desde a revisão de 2026-07-08 (Wave Ξ-1). O número correto de lojas Tier 1 bloqueadas é **5**, não 4. Recomenda-se corrigir aquele documento numa próxima Wave de manutenção documental — fora do escopo desta missão (auditoria, não edição de docs de terceiros).

### 1.2 Conectores registrados no código (fonte: `src/domains/connectors/crawler/bootstrap.ts`)

| Tipo | Connector | Status |
|---|---|---|
| Produção | `shoppingchina` | Ativo, parcialmente certificado |
| Produção | `megaeletronicos` | Ativo, certificado |
| Produção | `romashopping` | Ativo, certificado |
| Produção | `atacadoconnect` | Ativo, certificado |
| Produção | `mobilezone` | Ativo, certificado |
| Referência/dev | `json-file:sample`, `csv-file:sample` | Não contam como loja real — usados para teste/dry-run |

Exatamente **5 conectores de produção**, confirmados por leitura direta do registro (`bootstrapConnectors()`), consistente com os 5 merchants ativos do item 1.1. Nenhum sexto connector existe hoje em código.

### 1.3 Escala do catálogo (medição mais recente disponível)

| Métrica | Valor | Data | Fonte | Confiança |
|---|---:|---|---|---|
| Canonical Products | **18.010** | 2026-07-13 | `docs/product/CATEGORY_INVENTORY_REPORT.md` (Program Κ, Mission Κ-1) | Alto |
| Categorias distintas (`categories`) | **929** | 2026-07-13 | idem | Alto |
| Marcas distintas (`canonical_products`) | **852** (596 com 2+ produtos) | 2026-07-10 | `docs/product/CROSS_MERCHANT_SIMULATION.md` | Alto |
| Produtos sem `category_id` | 0 / 18.010 | 2026-07-13 | `CATEGORY_INVENTORY_REPORT.md` | Alto |
| `merge_candidates` (fila de revisão humana, Shadow Mode) | 3.106, 0 aprovados/mesclados | 2026-07-13 | Fase 2 Sprint 2.8 (commit `6c72997`) | Alto |
| Produtos comparáveis (canonical com 2+ merchants) | **4** (0,13% de 3.052 canonical com oferta) | 2026-07-10, sobre um catálogo de 6.608 produtos | `docs/product/COMPARABLE_PRODUCT_COVERAGE_REPORT.md` | **Alto para 2026-07-10; não remedido desde então — ver nota abaixo** |

**Nota de honestidade sobre o número acima**: o catálogo cresceu de 6.608 (2026-07-10) para 18.010 (2026-07-13) via Sprints 2.5/2.6/2.8, mas **nenhuma missão remediu Comparable Product Coverage nessa escala maior**. Esta auditoria não fabrica um número novo. A inferência mais defensável, com base em evidência estrutural já produzida (não em intuição): a Mission Κ-1 (`docs/product/RELEASE_2_FOUNDATION_COMPLETE.md` hipóteses confirmadas/refutadas §3-4) já provou, via simulação exaustiva de 11,28M pares (Sprint 2.7) e via sincronização completa do canonical catalog (Sprint 2.8), que **crescer o catálogo não move produtos comparáveis** — o gate é a fragmentação de categoria (929 linhas para poucas centenas de conceitos reais) e a ausência de um executor de merge, não o volume de produtos. Portanto o valor real hoje muito provavelmente continua próximo de 4 — mas isso é uma inferência, rotulada como tal, não uma medição. **Recomenda-se rodar `npm run cpc:report`/`scripts/cpc-report.ts` (já existente, read-only) contra a base atual como primeira ação de acompanhamento**, fora do escopo de código desta missão.

### 1.4 Distribuição de catálogo por merchant (proxy mais recente)

Não existe uma contagem direta de ofertas por merchant na escala de 18.010 produtos em nenhum documento existente. O proxy mais recente e mais confiável é a distribuição de **categorias exclusivas por merchant** (Κ-1, 2026-07-13), que reflete quanto catálogo cada um contribuiu:

| Merchant | Categorias exclusivas | Leitura |
|---|---:|---|
| Shopping China | 268 | Maior contribuinte de catálogo hoje — reversão completa frente à medição de 2026-07-08 (35 ofertas, a menor das 4) |
| Mega Eletrônicos | 187 | Segundo maior |
| Mobile Zone | 162 | Terceiro — conectado desde 2026-07-08 |
| Roma Shopping | 142 | Quarto — apesar do maior catálogo potencial estimado (~24.370 URLs de sitemap) |
| Atacado Connect | 68 | Menor contribuinte relativo |

**Nível de confiança**: Médio — é um proxy (contagem de categorias exclusivas), não uma contagem direta de ofertas por loja. A última contagem direta de ofertas por loja (`docs/product/MARKETPLACE_COVERAGE_MAP.md`, 2026-07-08: Atacado Connect 206, Roma Shopping 205, Mega Eletrônicos 203, Shopping China 35) está desatualizada — o catálogo cresceu ~27x desde então (653 → 18.010 ofertas/produtos). Uma recontagem direta (`COUNT(*) FROM offers GROUP BY store_id`) sharpearia este número; não executada nesta missão por não ter sido necessária para as decisões abaixo.

---

## 2. Objetivo 7 — Marketplace Health (indicadores atualizados)

| Indicador | Valor mais recente | Data/Fonte | Confiança | O que mede |
|---|---:|---|---|---|
| **Marketplace Health Score** | 65/100 | 2026-07-10, `docs/product/COMPARABLE_PRODUCT_COVERAGE_REPORT.md` (via `MarketplaceHealthEngine`, 8 fatores já existentes) | Médio — catálogo cresceu ~3x desde então, não remedido | Composto ponderado (imagem, marca, categoria, canonical, offer density, freshness, etc.) |
| **AI Readiness Score** | 18,1/100 | 2026-07-10, idem | Médio — mesma ressalva | Comparable Products (2+ merchants) + Price Trend Readiness (2+ pontos de histórico) + Canonical Coverage, média simples |
| **Comparable Coverage (CPC)** | 4 produtos (0,13% de 3.052 canonical com oferta) | 2026-07-10 | Médio — ver §1.3 | % de canonical products com 2+ merchants vendendo |
| **Offer Density** | 1,0005 ofertas/produto | 2026-07-10 | Médio — mesma ressalva | `COUNT(offers) / COUNT(products)` |
| **Merchant Coverage** | 5 de 10 Tier 1 auditados = 50% (subiu de 40% em 2026-07-08 com a certificação do Mobile Zone) | 2026-07-08/13 | Alto | Merchants com dado real vs. universo Tier 1 conhecido |
| **Category Coverage** | 100% dos produtos com `category_id` preenchido; 929 categorias distintas para 18.010 produtos (~19,4 produtos/categoria, mas com fragmentação lexical severa — ver `CATEGORY_GAP_REPORT.md`) | 2026-07-13 | Alto | `products.category_id` não-nulo + contagem de `categories` |
| **Opportunity Coverage** (categorias com pelo menos 1 comparação de preço real) | 0 categorias "dominadas" pela definição formal (`docs/product/CATEGORY_DOMINATION_PLAN.md`) | 2026-07-08, não remedido | Baixo — depende diretamente do CPC não remedido | Ver `CATEGORY_GAP_REPORT.md` |

**Leitura honesta consolidada**: os indicadores de "preenchimento" (categoria, marca, canonical resolution) estão excelentes e estáveis. Os indicadores de "concorrência real de preço" (CPC, Offer Density, AI Readiness, Opportunity Coverage) são estruturalmente baixos e **provadamente não respondem a mais volume de catálogo** (achado central de Sprints 2.2–2.8 e Program Κ). Isso redefine o que "melhorar o marketplace" significa a partir de agora — ver Objetivo 8/10.

---

## 3. Fontes primárias desta consolidação

`docs/marketplace/Tier1_Merchants.md`, `docs/business/TIER1_PARTNERS.md`, `docs/product/RELEASE_2_FOUNDATION_COMPLETE.md`, `docs/product/CATEGORY_INVENTORY_REPORT.md`, `docs/product/CROSS_MERCHANT_SIMULATION.md`, `docs/product/COMPARABLE_PRODUCT_COVERAGE_REPORT.md`, `docs/product/MERCHANT_OVERLAP_MATRIX.md`, `docs/product/MARKETPLACE_COVERAGE_MAP.md`, `docs/product/KPI_BASELINE.md`, `src/domains/connectors/crawler/bootstrap.ts`.
