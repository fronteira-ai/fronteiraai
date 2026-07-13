# CATEGORY_INVENTORY_REPORT.md
# PROGRAM Κ (KAPPA) — MISSION Κ-1 — Objetivo 1: Universal Taxonomy Discovery

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Fonte de dado**: leitura direta e read-only de `categories`, `products`, `offers`, `stores` e `canonical_products` em produção via `scripts/kappa1-category-inventory.ts` (`npx tsx scripts/kappa1-category-inventory.ts`). Nenhuma escrita, nenhuma categoria criada, nenhuma migração executada.
**Escopo**: inventário completo — não uma amostra. Este relatório fecha a lacuna deixada pela Sprint 2.8 (`CATEGORY_NORMALIZATION_REPORT.md` media apenas 41 `category_id` de uma amostra estratégica de 8 produtos; este documento mede as 929 linhas reais de `categories`).

---

## 1. Números-base

| Métrica | Valor |
|---|---:|
| Linhas em `categories` | **929** |
| Categorias com pelo menos 1 produto | 926 |
| Categorias órfãs (0 produtos) | 3 |
| Produtos (`products`) com `category_id` nulo | 0 / 18.010 |
| `canonical_products` com `category_id` nulo | 0 / 18.010 |
| Categorias usadas por 2+ merchants (mesmo `category_id`/slug) | 98 / 929 (10,5%) |
| Categorias singleton (exatamente 1 produto) | 207 / 929 (22,3%) |

`category_id` já está 100% preenchido tanto em `products` quanto em `canonical_products` — não há gap de nulidade a corrigir aqui (consistente com a Sprint 2.8, que fechou exatamente esse tipo de gap para outros campos). O problema não é ausência de categoria; é **929 identidades para um número real de conceitos muito menor** — ver `CATEGORY_SIMILARITY_ANALYSIS.md`.

## 2. Estrutura do schema — flat, sem hierarquia

`categories` (`types/category.ts`, migração `0002_revised_store_data_layer.sql`) tem exatamente estes campos: `id, name, slug, icon, created_at`. **Não existe `parent_id` nem qualquer coluna de hierarquia.** Todo o inventário abaixo é, por construção de schema, uma lista plana — "nível hierárquico" e "categoria pai" (pedidos no mandato) não podem ser lidos do banco porque a informação não existe hoje. Isso não é um gap de dado incompleto; é uma ausência estrutural, e pesa diretamente na comparação arquitetural do Objetivo 5 (`UNIVERSAL_TAXONOMY_OPTIONS.md`).

## 3. Mecanismo de origem — por que existem 929 linhas

Cada conector persiste categoria via `upsertCategory(name, slug)` com `onConflict: "slug"` (`OfferNormalizer`, já documentado em `CATEGORY_NORMALIZATION_REPORT.md`). Isso significa que o dedupe **já funciona tecnicamente** sempre que dois merchants happen to usar o slug exatamente idêntico — e de fato acontece: 98 categorias hoje já são compartilhadas por 2+ merchants só porque o texto bateu (ex.: `Notebooks` — 5 merchants, `Calculadoras` — 5 merchants, `Fones de Ouvido` — 4 merchants, `Impressoras`/`Impresoras` continuam separados só porque um é PT e outro ES). **A fragmentação não é uma limitação técnica do dedupe — é 100% causada por variância léxica de nome/slug entre merchants** (idioma PT vs ES, singular vs plural, sinônimo comercial). Isso é uma evidência forte a favor de soluções puramente lexicais (Objetivo 5) antes de qualquer coisa mais pesada.

## 4. Top categorias por volume de produto

| Categoria | Slug | Produtos | Ofertas | Merchant dominante | # merchants |
|---|---|---:|---:|---|---:|
| GENERAL | general | 2.142 | 2.143 | mobile-zone | 2 |
| Fones de Ouvido | fones-de-ouvido | 711 | 711 | mobile-zone | 4 |
| Celulares e Smartphones | celulares-e-smartphones | 670 | 670 | mega-eletronicos | 2 |
| Perfume Masculino | perfume-masculino | 520 | 520 | mega-eletronicos | 3 |
| ELECTRONICOS | electronicos | 519 | 519 | mobile-zone | 1 |
| Perfume Feminino | perfume-feminino | 475 | 475 | mega-eletronicos | 1 |
| Smartphones | smartphones | 355 | 355 | atacado-connect | 2 |
| Smartwatch | smartwatch | 340 | 340 | mega-eletronicos | 3 |
| Perfume Unissex | perfume-unissex | 302 | 302 | mega-eletronicos | 1 |
| Perfume | perfume | 256 | 256 | mobile-zone | 1 |
| Notebooks | notebooks | 244 | 245 | atacado-connect | 5 |

As 3 maiores categorias por volume (`GENERAL`, `ELECTRONICOS`, mais adiante `SALUD Y BELLEZA`/`CASA Y ESCRITORIO`/`Geral`/`Acessórios`/`Accesorios`/`Eletrônicos`) somam **3.014 produtos (16,7% do catálogo)** e são buckets de fallback do merchant de origem, não categorias de produto reais — mesmo achado já registrado pela Sprint 2.4 §3 para `GENERAL` (mobile-zone). Ver `CATEGORY_SIMILARITY_ANALYSIS.md` §2 para o tratamento dessas 8 categorias genéricas.

## 5. Distribuição por merchant

| Merchant | Categorias exclusivas (storeSpread=1) |
|---|---:|
| shopping-china | 268 |
| mega-eletronicos | 187 |
| mobile-zone | 162 |
| roma-shopping | 142 |
| atacado-connect | 68 |

shopping-china sozinho é responsável por quase um terço (28,8%) de todas as categorias — consistente com ser o catálogo mais amplo e mais recentemente certificado (`SHOPPING_CHINA_RECERTIFICATION.md`), e com o fato de a Sprint 2.7/2.8 já terem medido zero overlap real de categoria entre merchants no gate cross-merchant.

## 6. Achado qualitativo relevante para Objetivo 5/6

Categorias de "gênero/variante" com massa alta (`Perfume Masculino` 520, `Perfume Feminino` 475, `Perfume Unissex` 302, `Perfume Femenino` 153 — 1.450 produtos, 8% do catálogo inteiro) **não devem ser unificadas de forma flat** com `Perfume`/`perfumes` genérico: gênero é um atributo real do produto, não um erro de nomenclatura. Isso é confirmado quantitativamente na análise de similaridade (`CATEGORY_SIMILARITY_ANALYSIS.md`) — essas categorias caem no bucket "Ambígua", nunca no de "Alta confiança". O mesmo padrão se repete em escala menor para relógios (`Reloj Masculino`/`Relojes femeninos`/`Reloj Unisex`) e é a mesma lição já registrada pela Sprint 2.4 para o cluster "Games" (console/jogo/acessório não podem virar uma categoria só). Isto é evidência direta de que a solução final precisa de **hierarquia (pai/filho ou atributo), não apenas um dicionário de sinônimos flat** — ver Objetivo 5.

## 7. Dados brutos

O inventário completo (929 linhas: id, name, slug, productCount, offerCount, canonicalCount, dominantStore, storeSpread) foi gerado por `scripts/kappa1-category-inventory.ts` e está disponível reproduzindo o comando acima; não foi versionado como CSV neste documento por ser um dump bruto de 929 linhas sem valor de leitura incremental — os agregados relevantes estão nas seções acima e são citados por nome/slug ao longo dos demais relatórios desta Mission.
