# MERCHANT_PRIORITY_MATRIX.md
# PROGRAM ΔR — MISSION ΔR-2 — Objetivo 2 + Objetivo 5 + Objetivo 6

**Categoria**: `docs/marketplace/` (ADR-048)
**Data**: 2026-07-14
**Distinto de** `docs/product/MERCHANT_PRIORITY_MATRIX.md` (Mission Δ-1, 2026-07-08): aquele documento usa os fatores de `MerchantPriorityService` (Diamond/Gold/Silver/Bronze, pensados para lojas já onboarded/reivindicadas) reorganizados por execução. Este documento aplica os 6 critérios explicitamente mandatados por esta missão (relevância para o comprador, volume de produto, frequência de atualização, reputação, cobertura de categoria, importância estratégica) a **todas** as lojas já conhecidas — universo idêntico (os mesmos 10 Tier 1), lente diferente.

---

## 0. Limitação estrutural, declarada antes de qualquer tabela

**O universo de lojas conhecido e auditado tecnicamente é exatamente 10** (`docs/marketplace/Tier1_Merchants.md`). Esta missão pede classificação de "todas as lojas" e um TOP 20 de oportunidade — mas **não existe um TOP 20 medido**, porque nenhuma 11ª loja jamais foi auditada. Preencher 10 posições adicionais com nomes não verificados violaria diretamente o mandato desta missão ("Não assumir. Medir."). Este documento classifica os 10 reais e nomeia a expansão do universo auditado (Tier 2/3) como a própria primeira recomendação do roadmap (`MARKETPLACE_EXPANSION_ROADMAP.md`).

---

## 1. Critérios (idênticos aos 6 nomeados no mandato, aplicados sem desvio)

| Critério | Como foi avaliado, por loja |
|---|---|
| **Relevância para o comprador** | Presença de dado real hoje (compra possível agora) vs. bloqueada (zero relevância prática até parceria); marca/categoria de alta procura conhecida (eletrônicos/celulares) |
| **Volume de produto** | Contagem real (categorias exclusivas, Κ-1) para as 5 lojas ativas; estimativa de sitemap/auditoria técnica (`Tier1_Merchants.md` §5) para as bloqueadas — nunca inventado onde "Não verificável" já é o registro oficial |
| **Frequência de atualização** | `Sync Frequency` observado tecnicamente (diária/horária) para as ativas; N/A para as bloqueadas (nenhum sync existe) |
| **Reputação** | Doutrina permanente **Zero Reputation Score** (`RELEASE_CERTIFICATION_1.5.md`) — nenhum score opaco. Avaliada aqui apenas por fatos nomeáveis: tempo de mercado declarado, se é distribuidor oficial de marca reconhecida, menção recorrente no roadmap histórico |
| **Cobertura de categoria** | Número de departamentos/categorias declarados na auditoria técnica (`Tier1_Merchants.md` §5) |
| **Importância estratégica** | Combinação de: já ser o único par de comparação real medido no marketplace hoje; ser distribuidor oficial de marca de peso; ser o merchant mais citado historicamente no roadmap (`PROJECT_STATUS.md`) |

---

## 2. Matriz completa — Tier S/A/B/C, todos os 10 merchants conhecidos

### Tier S — maior volume real + maior importância estratégica comprovada

| Merchant | Relevância p/ comprador | Volume | Frequência | Reputação | Categoria | Importância estratégica |
|---|---|---|---|---|---|---|
| **Shopping China** | Alta — dado real fluindo hoje | Alta — 268 categorias exclusivas, maior contribuinte real de catálogo hoje (Κ-1, 2026-07-13), reversão completa frente a 2026-07-08 | Baixa hoje (sem sync automático confirmado nos últimos ciclos — gap operacional nomeado, não técnico) | Connector mais antigo do marketplace, primeiro parceiro técnico real | Alta — ~20+ categorias declaradas (Importados/Geral) | **Máxima** — maior catálogo real hoje + único par do lado "Eletrônicos" da única comparação de preço já medida no marketplace (Shopping China × Mega Eletrônicos) |
| **Roma Shopping** | Alta — dado real fluindo hoje | Alta — maior catálogo potencial de todos os 10 (~24.370 URLs de sitemap confirmadas) | Alta — sinais de `lastmod` em múltiplos horários, cadência horária-diária observada | Estrutura de e-commerce mais sofisticada dos 10 (4 moedas, WooCommerce maduro) | **Máxima** — 7 departamentos, o perfil de categoria mais amplo de qualquer um dos 10 | Alta — maior potencial de densidade de catálogo do marketplace inteiro |

### Tier A — ativos, certificados, volume real sólido

| Merchant | Relevância p/ comprador | Volume | Frequência | Reputação | Categoria | Importância estratégica |
|---|---|---|---|---|---|---|
| **Mega Eletrônicos** | Alta — dado real fluindo hoje | Média-Alta — 187 categorias exclusivas, 2º maior contribuinte real | Diária (cadência de sitemap confirmada) | Maior loja de eletrônicos de Ciudad del Este (fundada 1990) | Média — ~14 categorias top-level | Alta — outro lado do único par de comparação de preço real já medido |
| **Mobile Zone** | Alta — dado real fluindo hoje, único merchant com contagem de catálogo real confirmada via API (6.956 produtos) | Média-Alta — 162 categorias exclusivas, 3º maior contribuinte real | Diária (config declarada) | 12+ anos de operação real | Média — Celulares/Eletrônicos | Alta — único conector via API pública (menor custo de manutenção técnica de todos os 5) |
| **Atacado Connect** | Alta — dado real fluindo hoje | Média — 68 categorias exclusivas, menor contribuinte relativo entre os 5 ativos, apesar de sitemap com ~18.000 URLs potenciais | Diária, considerar 2x/dia se arbitragem de moeda for prioridade | App moderna (Next.js/Vercel), JSON-LD schema.org — sinal técnico mais limpo dos 5 | Alta — estrutura multi-nível (informática/hardware) | Média-Alta — maior gap entre potencial (18k) e volume real contribuído hoje |

### Tier B — bloqueados, mas de importância estratégica máxima (parceria comercial, não esforço técnico, é o caminho)

| Merchant | Relevância p/ comprador | Volume | Frequência | Reputação | Categoria | Importância estratégica |
|---|---|---|---|---|---|---|
| **Cellshop** | **Zero hoje** (bloqueado) — potencial Alto se parceria avançar | Não verificável (bloqueio de política, nunca dado técnico) | N/A | Um dos 2 merchants mais citados historicamente em `PROJECT_STATUS.md`/roadmap desde o Release 1.8 | Tecnologia (Celulares, Informática, Eletrônicos, Eletrodomésticos) — inferido, não confirmado | **Máxima entre os bloqueados** — prioridade 1 de contato comercial (`TIER1_PARTNERS.md`) |
| **Nissei** | **Zero hoje** (bloqueado) — potencial Alto se parceria avançar | Não verificável | N/A | Distribuidor oficial declarado de Apple/Sony/Canon/Nikon — o único merchant dos 10 com esse tipo de reputação de marca nomeável | Informática/Eletrodomésticos | **Máxima entre os bloqueados** — mesma prioridade 1, maior valor de marca do lote inteiro |

### Tier C — bloqueados, prioridade comercial menor (não porque sejam irrelevantes, mas por menor evidência estratégica hoje)

| Merchant | Relevância p/ comprador | Volume | Frequência | Reputação | Categoria | Importância estratégica |
|---|---|---|---|---|---|---|
| **New Zone** | Zero hoje (bloqueado) | Não verificável | N/A | Auto-descrita como "plataforma de atacado" — B2B-minded | Importados/Atacado | Média — prioridade 2 de contato (abaixo de Cellshop/Nissei, acima de Casa Americana/Visão VIP) |
| **Casa Americana** | Zero hoje (bloqueado) | Não verificável | N/A | Loja tradicional (fundada 1972), mas sem confirmação técnica de tamanho de catálogo | Eletrônicos/Geral — inferido | Média-Baixa — `Disallow: /catalogo` no próprio robots.txt sugere que o operador já pensa em proteger o catálogo da concorrência, o que é um sinal (não conclusivo) de resistência comercial maior |
| **Visão VIP** | Zero hoje (bloqueado) | Não verificável — sitemap sem nenhuma URL de produto | N/A | Loja de porte menor entre as eletrônicas auditadas | Informática | Baixa-Média — revisado de "spike técnico" para bloqueio de política em 2026-07-08; menor volume de citação estratégica histórica que os 4 acima |

---

## 3. Ranking de oportunidade (Objetivo 5) — os 10 reais, ordenados por impacto ao comprador

Ordenado por **impacto ao comprador**, não por facilidade técnica — critério explícito do mandato. "Impacto ao comprador" combina: dado já fluindo hoje (peso máximo — zero bloqueio é a maior alavanca de impacto imediato) + potencial de criar comparação de preço real (a métrica que `docs/product/KPI_BASELINE.md`/`MARKETPLACE_VISION.md` já estabelecem como o valor central do produto) + reputação de marca nomeável.

| # | Merchant | Tier | Por que este impacto ao comprador, não outro |
|---:|---|---|---|
| 1 | Shopping China | S | Já é metade do único par de comparação de preço real do marketplace; maior catálogo real hoje; terminar de automatizar o sync (não construir nada novo) é a ação de maior impacto/esforço de toda esta lista |
| 2 | Roma Shopping | S | Maior catálogo potencial (~24k); já ativo; categoria mais ampla (7 departamentos) — mover o gap entre potencial e volume contribuído hoje (142 categorias exclusivas vs. Shopping China 268) é puro ganho sem esforço de aquisição |
| 3 | Mega Eletrônicos | A | Outro lado do único par de comparação real medido; 2º maior contribuinte ativo |
| 4 | Cellshop | B | Maior importância estratégica entre os bloqueados (mais citado historicamente); desbloquear via parceria comercial cria o 2º cluster de comparação real em Celulares (junto com Mobile Zone/Mega Eletrônicos) |
| 5 | Nissei | B | Distribuidor oficial de marca de peso — maior ganho de reputação percebida pelo comprador de qualquer merchant desta lista, se viabilizado |
| 6 | Mobile Zone | A | Único catálogo com contagem real confirmada (6.956) — maior "headroom" técnico conhecido (só 200 de 6.956 sincronizados hoje, cap de configuração, não limite técnico) |
| 7 | Atacado Connect | A | Maior gap entre potencial (~18k) e volume real contribuído (68 categorias exclusivas) entre os já conectados — ganho de impacto sem custo de aquisição comercial |
| 8 | New Zone | C | Auto-descrita como plataforma de atacado B2B — pode já ter um feed pronto, reduzindo esforço de parceria |
| 9 | Casa Americana | C | Loja tradicional relevante, mas sem nenhum dado técnico que confirme tamanho/relevância real de catálogo |
| 10 | Visão VIP | C | Menor prioridade estratégica histórica do lote; catálogo real desconhecido |

---

## 4. Objetivo 6 — Estratégia de Integração e Risco, por loja

| Merchant | Método de integração | Risco | Justificativa do risco |
|---|---|---|---|
| Shopping China | Crawler (sitemap real, já implementado) | **Baixo** | Componentes 100% reaproveitados (`SitemapParser`, pipeline fixo); risco real é operacional (cron/automação), não técnico |
| Roma Shopping | Crawler (sitemap-index, já implementado) | **Baixo-Médio** | Volume alto sem `Crawl-delay` declarado exige throttling próprio por cortesia — risco de sobrecarregar o site do parceiro, não de falha técnica |
| Mega Eletrônicos | Crawler (sitemap, já implementado) | **Baixo** | Certificado, 0 falhas confirmadas |
| Atacado Connect | Crawler (sitemap + JSON-LD, já implementado) | **Baixo** | Certificado, sinal de dado mais limpo dos 5 (JSON-LD schema.org) |
| Mobile Zone | API REST (já implementado) | **Baixo** | API pública sem autenticação, descoberta legitimamente (bundle JS público lido como texto) — menor custo de manutenção técnica do lote inteiro |
| Cellshop | **Requer contato comercial / autorização** | **Alto** (se tentativa técnica) | Cloudflare 403 ativo + `robots.txt` nomeia `ClaudeBot` explicitamente — qualquer scraping seria uma violação de política, proibida por doutrina permanente do projeto |
| Nissei | **Requer contato comercial / autorização** | **Alto** (se tentativa técnica) | Mesmo padrão de bloqueio de Cellshop |
| Casa Americana | **Requer contato comercial / autorização** | **Alto** (se tentativa técnica) | `Disallow: /` nomeado + 403 direto em fetch de homepage |
| New Zone | **Requer contato comercial / autorização** | **Alto** (se tentativa técnica) | `Content-Signal: ai-train=no` + `Disallow: /` nomeado para `ClaudeBot` |
| Visão VIP | **Requer contato comercial / autorização** | **Alto** (se tentativa técnica) | Bloqueio Cloudflare nomeado, confirmado na revisão de 2026-07-08 |

**Nenhuma ação de contorno de bloqueio é recomendada ou permitida para os 5 merchants Tier B/C** — consistente com a doutrina permanente já registrada em `docs/business/MERCHANT_PARTNERSHIP_PROGRAM.md` e reafirmada por esta missão.

---

## 5. Fontes

`docs/marketplace/Tier1_Merchants.md`, `docs/business/TIER1_PARTNERS.md`, `docs/product/CATEGORY_INVENTORY_REPORT.md`, `docs/product/MERCHANT_OVERLAP_MATRIX.md`, `docs/product/MARKETPLACE_COVERAGE_MAP.md`, `docs/product/MERCHANT_PRIORITY_MATRIX.md` (Δ-1).
