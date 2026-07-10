# COMPARABLE_PRODUCT_COVERAGE_REPORT.md
# PROGRAM Ξ — Wave Ξ-5 — Comparable Product Coverage: Medição e Achado Real

**Categoria**: `docs/product/` (companion de Program Ω/Δ/Ξ)
**Data**: 2026-07-10
**Natureza**: Wave de execução real (código escrito e testado) + medição contra produção. Não estava definida em `EXECUTION_WAVES.md` (Ξ-1..Ξ-4 já reservadas para outros escopos) — nomeada Ξ-5 nesta entrega para não colidir com Wave Ξ-2 (Technical Spike Resolution, já definida e majoritariamente resolvida via Wave Xi-1/`2dcf9af`).
**Companions**: `MERCHANT_OVERLAP_MATRIX.md` (Δ-3, medição anterior), `COMPETITIVE_DENSITY_MATRIX.md`, `MARKETPLACE_TRUTH_REPORT.md` (fórmula do AI Readiness Score), `EXECUTION_WAVES.md`

---

## 1. O que foi entregue nesta Wave

- **Fix real**: `scripts/canonical-catalog-bootstrap.ts` fazia `.select()` sem paginação — PostgREST limita a 1000 linhas por padrão, então o bootstrap nunca processava mais que os primeiros 1000 produtos, silenciosamente, sem erro. Corrigido para paginar em blocos de 1000 até esgotar a tabela. Achado real desta Wave, não teórico — o catálogo já passa de 6.600 produtos.
- **`maxProducts` elevado nos 5 connectors**, com base em `MERCHANT_OVERLAP_MATRIX.md`/`COMPETITIVE_DENSITY_MATRIX.md`: Shopping China e Mega Eletrônicos (o único par com overlap real medido) para 1500; Mobile Zone (mesmo cluster de categoria) para 1500; Roma Shopping e Atacado Connect (0% overlap medido, mas sem teto imposto por isso) para 600 — crescimento moderado, não priorizado para CPC.
- **`scripts/cpc-report.ts`** (novo, read-only): mede Offer Density, % de canonical products com 2+/3+ merchants, e a matriz de overlap completa entre todos os stores ativos hoje — generalização de `MERCHANT_OVERLAP_MATRIX.md` (que hardcodeava 4 stores) para qualquer número de stores.
- **`scripts/marketplace-observatory-report.ts`** (novo, read-only): roda `MarketplaceHealthEngine` (reaproveitado, zero cálculo novo), a fórmula de AI Readiness Score de `MARKETPLACE_TRUTH_REPORT.md`, um check de comparabilidade para 8 produtos estratégicos nomeados, e Top 100 buscas quando há dado de `buyer_events`.
- Quality gate: lint 0, typecheck 0, 524/524 testes, build limpo.

## 2. Medição real (produção, 2026-07-10)

| Métrica | Valor | Referência anterior |
|---|---|---|
| Products | 6.608 | 1.262 (Mission Ξ-1, 2026-07-08) |
| Offers | 6.611 | — |
| Offer Density | 1,0005 | 1,0024 (Ξ-1) — **piorou**, não melhorou |
| Canonical products com oferta | 3.052 | — |
| Comparáveis (2+ merchants) | **4 (0,13%)** | 1 produto isolado (Δ-3) |
| Comparáveis (3+ merchants) | 0 | — |
| Ofertas vinculadas a canonical product | 46% | ~100% (Δ-3, catálogo bem menor) |
| Marketplace Health Score | 65/100 | — |
| AI Readiness Score | 18,1/100 | 34,2/100 citado em `GO_TO_MARKET_ALIGNMENT.md` — **caiu** |

## 3. O achado real — crescer catálogo não criou comparação

O objetivo implícito de elevar `maxProducts` era mais profundidade nos 2 clusters com overlap medido (Shopping China × Mega Eletrônicos, Mobile Zone no mesmo cluster). O resultado real contradiz a expectativa: **Comparable Product Coverage não subiu proporcionalmente ao catálogo — na verdade, Offer Density e AI Readiness Score caíram** frente às medições de Δ-3/Ξ-1, que eram sobre um catálogo 5x menor.

A causa provável não é falta de produtos duplicados entre merchants — o check de produtos estratégicos (`marketplace-observatory-report.ts`) mostra, por nome, os mesmos modelos (iPhone 17 Pro Max, MacBook Air, PlayStation 5, Nintendo Switch) vendidos por 3 a 5 merchants diferentes cada. A causa é que **`canonical_product_id` não está linkando esses produtos entre si**: só 46% das ofertas têm canonical product vinculado, e a métrica de overlap desta Wave é calculada exatamente sobre esse campo — ela não vê a duplicação que claramente existe por nome.

Duas causas reais, confirmadas por leitura direta do código (não especulação):

1. **`canonical-catalog-bootstrap.ts` nunca processou mais que os primeiros 1000 produtos** até o fix desta Wave, e o catálogo já tinha mais de 6x isso — os ~54% de ofertas sem canonical product batem com essa ordem de grandeza.
2. **Mesmo 100% processado, o bootstrap não cria comparação nenhuma por si só.** `CanonicalProductService.bootstrapFromProduct` cria **1 canonical product por produto, 1:1, usando o slug já único do produto** (`canonical_slug = product.slug`) — por design ("Bootstrap, not a merge"), nunca une dois produtos de lojas diferentes. Quem faz isso é `CanonicalMergeSuggestionService.suggestMergesFor`, chamado a cada bootstrap — mas ele só **grava uma sugestão de merge** (`MergeCandidate`, Shadow Mode), nunca aplica automaticamente. Existe fluxo de revisão (`app/api/admin/canonical-catalog/merge-candidates/[id]/route.ts`), mas é humano e manual. Ou seja: **mesmo com o bootstrap rodando sobre 100% do catálogo, Comparable Product Coverage só sobe na medida em que alguém revisa e aprova sugestões de merge** — não é um efeito automático de importar mais produtos ou rodar o bootstrap.

## 4. O que esta Wave deliberadamente não fez

Por decisão explícita do CTO, esta Wave não investigou a fundo a causa do gap de canonical matching nem rodou `canonical-catalog-bootstrap.ts --execute` contra produção — apenas mediu e documentou. Fica registrado como candidato a próxima Wave, não como pendência silenciosa.

## 5. Próximo passo recomendado, não executado aqui

1. Rodar o bootstrap com `--execute` contra produção para processar os ~5.600 produtos que o bug de paginação deixou de cobrir, gerando `MergeCandidate`s para todos, não só os primeiros 1000.
2. **Revisar e aprovar as `MergeCandidate`s pendentes** via `app/api/admin/canonical-catalog/merge-candidates` — este é o passo que efetivamente move Comparable Product Coverage, não o passo 1. Sem revisão humana, o passo 1 sozinho não muda a métrica.
3. Remedir com `npm run cpc:report` / `npm run observatory:report` depois de 1 e 2, para separar o efeito de cada um.
4. Formalizar Wave Ξ-5 em `EXECUTION_WAVES.md` (feito nesta entrega) e decidir se os passos 1-2 acima abrem uma Wave Ξ-6 dedicada (dado + revisão humana, não código) ou são tratados como operação contínua fora do ciclo de Wave.
