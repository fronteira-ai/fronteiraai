# SPRINT_2_2_MARKETPLACE_EXPANSION.md
# ParaguAI OS — Fase 2 — Sprint 2.2 — Marketplace Expansion

**Data**: 2026-07-10
**Categoria**: `docs/product/`
**Escopo**: implementação + medição, documentação mínima por mandato explícito.

## O que foi executado

- 5 syncs reais (`--execute`) contra os 5 connectors ativos, usando os caps já elevados na Wave Ξ-5: Shopping China 1500, Mega Eletrônicos 1496, Roma Shopping 600, Atacado Connect 599, Mobile Zone 1500 — **5.695 registros processados, 0 falhas**.
- `canonical-catalog-bootstrap --execute` rodado contra o catálogo pós-sync (9.549 produtos). Cobertura canônica subiu de 46% para 94% durante a medição; processo seguiu rodando em background além do corte desta Sprint (comum em catálogos grandes — cada produto ainda dispara uma avaliação de merge-candidate contra todo o pool da mesma marca).
- `cpc-report.ts` estendido com breakdown por categoria (Objetivo 3).
- `marketplace-observatory-report.ts` estendido com 5 novos produtos estratégicos (Samsung Galaxy geral, Notebooks geral, Apple Watch, GPU RTX/Radeon, Smart TV).
- Robots.txt revalidado ao vivo para os 5 merchants Classe D (Cellshop, Nissei, Casa Americana, New Zone, Visão VIP) — todos continuam bloqueando `ClaudeBot` nomeadamente, sem mudança desde 2026-07-08. Nenhum novo connector nesta Sprint; os 5 seguem como **Business Dependency**.

## KPIs — antes / depois

| Métrica | Antes (Wave Ξ-5) | Depois (Sprint 2.2) |
|---|---|---|
| Products | 6.608 | 9.549 |
| Offers | 6.611 | 9.552 |
| Offer Density | 1,0005 | 1,0003 |
| Canonical coverage (ofertas c/ canonical_product_id) | 46% | 94% |
| Comparable (2+ merchants) | 4 (0,13%) | 4 (0,04%) |
| Merchant Overlap (pares com produto compartilhado) | 4 pares, 1 produto cada | 4 pares, 1 produto cada (inalterado) |
| Marketplace Health | 65/100 | 74/100 |
| AI Readiness Score | 18,1/100 | 41,9/100 |

**Critério de sucesso da Sprint** (aumentar pelo menos 1 de CPC/Offer Density/Merchant Overlap/Marketplace Health): **atendido via Marketplace Health (+9)**. CPC e Merchant Overlap não se moveram; Offer Density caiu marginalmente.

## Achado central — o gargalo não é dado, é vínculo

O check de produtos estratégicos (nome, não `canonical_product_id`) confirma que iPhone 17 Pro Max/Pro, Samsung Galaxy, MacBook Air/Pro, AirPods Pro, Apple Watch, PlayStation 5 e Nintendo Switch já são vendidos por **4 a 5 merchants cada**. A métrica de Comparable Product Coverage baseada em `canonical_product_id`, porém, permanece em **4 produtos no catálogo inteiro** — os mesmos 4 de antes da Sprint, mesmo após +2.941 produtos importados e cobertura canônica saltar de 46% para 94%.

Causa confirmada (não hipótese): `canonical-catalog-bootstrap` cria canonical products 1:1 por produto — nunca une. A união entre merchants só acontece via `MergeCandidate` revisado e aprovado por humano (Shadow Mode, ver `PRODUCT_IDENTITY_VALIDATION_FRAMEWORK.md`, mantido em Backlog Estratégico por decisão do CTO). O Marketplace Health desta execução já registra **4 merge candidates pendentes de revisão** — não zero, mas também não suficiente para mover a métrica sozinho.

## Objetivo 3 — CPC por categoria

89% dos canonical products (7.984 de 8.983) não têm `category_id` — a maioria dos produtos importados nunca teve categoria atribuída na origem. Das poucas categorias com dado suficiente: Celulares 18 canonical, 2 comparáveis (11%); Notebooks 10 canonical, 1 comparável (10%); Drones 3 canonical, 1 comparável (33%). Nenhuma categoria estratégica (Smartphones, Apple, Notebooks, Games) passa de 1 dígito de produtos comparáveis em termos absolutos.

## Objetivo 5 — Launch Readiness

Um usuário pesquisando hoje por iPhone 17 Pro, Galaxy S26 Ultra, MacBook Air, AirPods Pro ou PlayStation 5 **não encontra comparação real entre lojas**, apesar de essas exatas linhas de produto serem vendidas por 3 a 5 merchants cada. Motivo, com dado desta Sprint: a página de comparação depende de `canonical_product_id` compartilhado, e esse vínculo cross-merchant não existe para nenhum desses produtos — cada oferta virou um canonical product isolado no bootstrap 1:1, e as sugestões de merge geradas (Shadow Mode) não foram revisadas nem aplicadas, por decisão deliberada de manter Product Identity intocado nesta Sprint.

## Recomendação para a Sprint 2.3

O próximo maior alavancador de CPC não é mais volume de catálogo (testado e esgotado nesta Sprint) — é revisão humana das `MergeCandidate`s já geradas, especificamente nos clusters de alto valor já comprovados (iPhone 17 Pro/Pro Max, Galaxy, MacBook, Apple Watch, AirPods Pro, PlayStation 5, Nintendo Switch, Smart TV), sem alterar `ProductIdentityEngine` nem sair do Shadow Mode. Complementarmente, popular `category_id` nos produtos sem categoria destravaria medição real do Objetivo 3, hoje limitada pelos 89% "Sem categoria".
