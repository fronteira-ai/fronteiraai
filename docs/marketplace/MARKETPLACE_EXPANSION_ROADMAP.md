# MARKETPLACE_EXPANSION_ROADMAP.md
# PROGRAM ΔR — MISSION ΔR-2 — Objetivo 8 + Objetivo 10

**Categoria**: `docs/marketplace/` (ADR-048)
**Data**: 2026-07-14
**Natureza**: plano — nenhuma Wave abaixo está aberta, mesma disciplina de governança de `docs/product/EXECUTION_WAVES.md` (que esta Roadmap consolida e substitui como referência operacional principal, sem apagar o histórico). Abertura de qualquer Wave exige mandato explícito e separado do CTO.

---

## Premissa que redefine este roadmap

Um roadmap de expansão convencional assumiria que "melhorar o marketplace" = "conectar mais lojas". **Esta fase de Discovery já refutou isso com medição, não opinião** (`docs/product/RELEASE_2_FOUNDATION_COMPLETE.md` §3): o catálogo cresceu 27x (653 → 18.010) sem mover Comparable Product Coverage de forma proporcional. O gargalo real é estrutural — fragmentação de categoria (929 linhas) e ausência de um executor de merge, não volume. Este roadmap portanto **não é apenas "conectar as lojas que faltam"** — é uma sequência que primeiro extrai o valor já pago (dado já ingerido, nunca revisado) e só depois expande o universo de merchants.

---

## Wave 1 — Quick Wins (custo zero de aquisição, maior alavancagem imediata)

**Objetivo**: extrair valor do dado que já existe, antes de qualquer expansão nova.

| Item | Ação | Por que é Quick Win |
|---|---|---|
| 1.1 | Confirmar/ativar sincronização automática dos 5 conectores já certificados (gap de cron/`CRON_SECRET` já nomeado em `docs/operations/PRODUCTION_BASELINE_1.9.md` §9) | Custo de engenharia zero — configuração, não código; afeta os 5 conectores simultaneamente |
| 1.2 | Revisar e aprovar/rejeitar a fila de 3.106 `merge_candidates` pendentes (Sprint 2.8) | **Única alavanca já comprovada capaz de mover Comparable Product Coverage** — `COMPARABLE_PRODUCT_COVERAGE_REPORT.md` prova que crescer catálogo não move CPC; revisão humana da fila já gerada, sim |
| 1.3 | Remedir CPC/Offer Density/AI Readiness na escala atual (18.010 produtos) via `scripts/cpc-report.ts`/`marketplace-observatory-report.ts` (já existentes, read-only) | Fecha a lacuna de honestidade nomeada em `MARKET_COVERAGE_REPORT.md` §1.3 — sem isso, toda decisão seguinte usa dado de 2026-07-10 |
| 1.4 | Elevar `maxProducts` do Mobile Zone (200 de 6.956 confirmados via API) — maior headroom técnico conhecido, sem risco de bloqueio | Ganho de volume no cluster com maior prova de comparabilidade (Celulares) |

## Wave 2 — Alta Cobertura (abrir os 2 merchants de maior importância estratégica bloqueados)

**Objetivo**: iniciar contato comercial formal com Cellshop e Nissei — Tier B, os únicos 2 merchants cuja importância estratégica é "Máxima" nesta auditoria e cujo caminho é exclusivamente comercial.

| Item | Ação |
|---|---|
| 2.1 | Primeiro contato real com Cellshop (`docs/business/MERCHANT_PARTNERSHIP_PROGRAM.md` fluxo de 9 estágios, `PARTNERSHIP_EMAIL_TEMPLATE.md` já pronto) |
| 2.2 | Primeiro contato real com Nissei, em paralelo |
| 2.3 | Atualizar `docs/business/TIER1_PARTNERS.md` com o primeiro estado real de contato (`Partner Status`, `First Contact`) assim que acontecer — nunca projetar |

**Por que estes 2 e não os outros 3 bloqueados**: são os únicos com importância estratégica "Máxima" nomeada consistentemente em 3 documentos independentes desta auditoria (`Tier1_Merchants.md`, `TIER1_PARTNERS.md`, `MERCHANT_PRIORITY_MATRIX.md` §3) — mais citados no roadmap histórico (Cellshop) e único distribuidor oficial de marca de peso do lote (Nissei).

## Wave 3 — Premium Merchants (fechar o universo Tier 1 conhecido + começar a expandir o universo auditado)

**Objetivo**: fechar formalmente os 3 merchants Tier C restantes (New Zone, Casa Americana, Visão VIP) e iniciar a primeira auditoria técnica de um **novo lote de merchants (Tier 2)**, especificamente direcionada às 5 categorias sem nenhuma cobertura conhecida (Games, Drones, Auto, Instrumentos, Esportes — `CATEGORY_GAP_REPORT.md`).

| Item | Ação |
|---|---|
| 3.1 | Contato comercial com New Zone, Casa Americana, Visão VIP (menor prioridade que Wave 2, mesma disciplina de não pular etapa) |
| 3.2 | Auditoria técnica (robots.txt/sitemap/estrutura pública, mesma metodologia de `Tier1_Merchants.md`) de um novo lote de candidatos — **nenhum nome é proposto aqui sem essa auditoria**, exatamente pela mesma disciplina que impediu esta missão de inventar um TOP 20 |
| 3.3 | Executar o Universal Taxonomy Fase 1 (66 clusters de sinônimo, Mission Κ-1) — pré-requisito para qualquer nova categoria não virar uma nova fragmentação |

## Wave 4 — Marketplace Dominance (validação e GA)

**Objetivo**: reexecutar toda a medição desta missão (`MARKET_COVERAGE_REPORT.md`, `CATEGORY_GAP_REPORT.md`, `MERCHANT_OVERLAP_MATRIX.md`) com dado real pós-Waves 1-3, e avaliar os marcos formais já definidos em `docs/product/GO_TO_MARKET_ALIGNMENT.md` (Beta Público → Launch Candidate → GA).

| Item | Ação |
|---|---|
| 4.1 | Remedir todos os indicadores desta missão |
| 4.2 | Avaliar critérios de Beta Público (`GO_TO_MARKET_ALIGNMENT.md`: ≥50 produtos comparáveis, Offer Density ≥1,05, ≥6 merchants ativos) |
| 4.3 | Formalizar Mission Κ-2 (Universal Taxonomy Fase 2 — pares pai/filho) se a Fase 1 (Wave 3.3) não tiver sido suficiente |

---

## Objetivo 10 — Recomendação Executiva: 30 dias, impacto ao comprador, exclusivamente

**Se o critério é exclusivamente impacto ao comprador em 30 dias, a resposta correta não é "conectar mais lojas".** É isto, nesta ordem:

1. **Revisar a fila de 3.106 `merge_candidates` pendentes (Wave 1.2)** — esta é, com evidência real e não intuição, a única ação já comprovada capaz de criar uma comparação de preço nova a partir de dado que já existe. Zero custo de aquisição, zero risco comercial, impacto direto e imediato em Comparable Product Coverage.
2. **Confirmar sincronização automática dos 5 conectores já certificados (Wave 1.1)** — sem isso, todo ganho das outras ações se degrada silenciosamente a cada dia que o cron não roda.
3. **Iniciar contato comercial com Cellshop e Nissei (Wave 2)** — um acordo comercial não fecha em 30 dias, mas **começar o relógio agora é pré-requisito** para qualquer ganho real nos 90 dias seguintes; adiar mais um ciclo de missão sem contato real repete o mesmo erro nomeado em `docs/business/TIER1_PARTNERS.md` desde 2026-07-03 (zero contato feito até hoje).
4. **Elevar o cap do Mobile Zone (Wave 1.4)** — maior headroom técnico conhecido, no cluster (Celulares) com a única prova real de comparabilidade do marketplace.

**O que este roadmap explicitamente NÃO recomenda para os 30 dias**: abrir um novo lote de auditoria de merchants (Wave 3.2) ou perseguir os 3 merchants Tier C (Wave 3.1) — nenhum dos dois move uma métrica de comprador em 30 dias, mesmo que sejam corretos no médio prazo. Priorizar aquisição de merchant novo agora repetiria exatamente o erro que a Sprint 2.2 já mediu e refutou ("mais catálogo aumenta CPC").

---

## Fontes

`docs/product/RELEASE_2_FOUNDATION_COMPLETE.md`, `docs/product/EXECUTION_WAVES.md`, `docs/product/GO_TO_MARKET_ALIGNMENT.md`, `docs/product/COMPARABLE_PRODUCT_COVERAGE_REPORT.md`, `docs/business/TIER1_PARTNERS.md`, `docs/marketplace/MERCHANT_PRIORITY_MATRIX.md` (este programa), `docs/marketplace/CATEGORY_GAP_REPORT.md` (este programa).
