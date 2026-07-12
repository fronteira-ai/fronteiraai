# CATEGORY_NORMALIZATION_REPORT.md
# FASE 2 — SPRINT 2.4 — Data Quality Discovery — Objetivo 3

**Categoria**: `docs/product/`
**Data**: 2026-07-11
**Fonte de dado**: os 41 `category_id` distintos já medidos em produção pela amostra estratégica da Sprint 2.3 (`PRODUCT_COMPARISON_AUDIT.md` §3) + a lista completa de categorias do marketplace já capturada por `npm run cpc:report` na mesma Sprint. Nenhuma query nova foi necessária — dado já coletado e citável.

---

## 1. O problema, reafirmado com números

Cada conector persiste a categoria com o texto exato do site de origem (`categoryName` em `OfferNormalizer` → `upsertCategory(name, slug)`, `onConflict:"slug"`), sem nenhum mapeamento entre lojas. Resultado: **41 `category_id` distintos só para 8 produtos estratégicos**, e centenas de categorias com exatamente 1 canonical product no marketplace inteiro (`cpc:report`, Sprint 2.3).

## 2. Clusters de alta confiança — mapeáveis automaticamente

Um cluster é "mapeável automaticamente" quando todas as variantes do nome se referem, sem ambiguidade, ao mesmo conceito real de categoria — a decisão é lexical (sinônimo/tradução/singular-plural), não uma decisão de julgamento sobre o produto.

| Cluster proposto | Variantes observadas (loja) | Confiança |
|---|---|---|
| **Celulares e Smartphones** | `Smartphones` (atacado-connect), `Celular` (mega-eletronicos), `Celulares` (mobile-zone, mega-eletronicos, shopping-china), `iPhone` (mobile-zone), `iPhone SWAP` (mobile-zone) | Alta — todas descrevem a mesma prateleira de celulares; `iPhone`/`iPhone SWAP` são subcategorias de marca/condição dentro do mesmo conceito, não categorias de produto diferentes |
| **Fones de Ouvido** | `Fones de Ouvido`, `Auriculares`, `Headsets`, `Headset`, `Fone de Ouvido Sem Fio` | Alta — sinônimos PT/ES do mesmo tipo de produto |
| **Tablets** | `Tablet`, `Tablet & iPad`, `tablets e readers` | Alta |
| **Cartões de Memória** | `cartao de memoria e sd`, `Cartões de Memória` | Alta |
| **Video Games (genérico)** | `Videogames`, `Video games`, `jogos` (quando não subdividido por plataforma) | Média-Alta — mapeável como categoria-pai; ver §3 sobre por que não deve virar candidato de *produto* idêntico |

**Estas 5 clusters, sozinhas, reduziriam os 41 `category_id` da amostra estratégica para ~30** — sem nenhuma heurística nova, só um dicionário estático de sinônimo → categoria canônica.

## 3. Clusters que exigem revisão manual — cuidado com falso positivo de categoria

Diferente de §2, aqui o nome sozinho não garante que os produtos sejam do mesmo tipo:

- **`GENERAL` (mobile-zone) e `Outros`/fallback de outras lojas**: bucket de "sem categoria reconhecida" — mapear isso para uma categoria real exigiria reclassificar pelo **nome do produto**, não pela categoria já atribuída (que é, por definição, não-informativa aqui). Não é um mapeamento 1:1 de sinônimo.
- **Cluster de "gaming"**: `PlayStation`, `Jogo para PlayStation`, `Nintendo Switch`, `Jogo para Nintendo Switch`, `Console`, `controles`, `Controle & Acessórios`, `Accesorios para juegos` — misturam **console** (hardware), **jogo** (mídia/software) e **acessório** (periférico). Agrupar tudo sob uma única categoria "Games" ajudaria a navegação, mas juntaria produtos que **nunca deveriam ser candidatos de identidade** (um jogo e um console não são o "mesmo produto" nem remotamente). Recomendação: mapear como hierarquia (categoria-pai "Games" com subcategorias Console/Jogo/Acessório preservadas), nunca como merge flat.
- **Categorias singleton específicas de nicho** (`Fatiador`, `Abridor`, `Balança`, `Sorveteira`, etc., vistas no `cpc:report` de Sprint 2.3): são produtos genuinamente diferentes entre si — não há erro de dado aqui, só baixa densidade de catálogo por categoria. Não classificar como "gargalo de normalização" — é um gap de cobertura de merchant/categoria, fora do escopo desta Sprint.

## 4. O que a normalização resolveria e o que não resolveria

- **Resolveria**: o gate duro `category_id` de `ProductIdentityEngine` deixaria de bloquear pares genuinamente idênticos por causa de vocabulário de categoria diferente entre lojas (o caso AirPods Pro 3 da Sprint 2.3 seria uma correção real, embora não suficiente sozinha — ver `MERGECANDIDATE_FLOW_REPORT.md` §4, a combinação com `specifications` ainda é necessária).
- **Não resolveria sozinho**: a ausência de `specifications`/atributos estruturados (ver `ATTRIBUTE_COVERAGE_MATRIX.md`) continua custando pontos independentemente da categoria bater.
- **Não é uma mudança de Product Identity**: o mapeamento aconteceria na normalização/ingestão (`OfferNormalizer` ou uma etapa nova antes de `upsertCategory`), como uma tabela de correspondência estática — o gate do `ProductIdentityEngine` continua comparando `category_id` exatamente como hoje, só que os IDs de entrada seriam mais consistentes. Nenhum peso, threshold ou fator do engine muda.

## 5. Não implementado nesta Sprint

Nenhum mapeamento foi escrito em código. Esta é uma auditoria — a tabela de correspondência (dicionário sinônimo → categoria canônica) e a decisão de aplicá-la só em ingestão futura vs. também como backfill retroativo em `canonical_products`/`products` existentes são decisões de implementação para uma Sprint futura, com seu próprio mandato.
