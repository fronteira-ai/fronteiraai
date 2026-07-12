# PRODUCT_COMPARISON_AUDIT.md
# FASE 2 — SPRINT 2.3 — Product Comparison Validation — Objetivo 1

**Categoria**: `docs/product/` (companion de `COMPARABLE_PRODUCT_COVERAGE_REPORT.md`, `MERGE_CANDIDATES_REPORT.md`, `PRODUCT_IDENTITY_VALIDATION_FRAMEWORK.md`, `MERCHANT_OVERLAP_MATRIX.md`)
**Data**: 2026-07-11
**Natureza**: Investigação read-only contra produção. Nenhum código de produto alterado, nenhuma escrita, nenhum merge, nenhuma heurística mudada. Duas ferramentas novas de leitura foram criadas para esta Sprint (`scripts/product-comparison-audit.ts`, `scripts/product-comparison-simulation.ts`), mesmo padrão de `cpc-report.ts`/`marketplace-observatory-report.ts` — permissão explícita do CTO obtida antes de rodar contra produção, por `[[feedback_no_direct_db_queries]]`.
**Amostra**: 10 padrões de nome cobrindo os 8 produtos estratégicos pedidos (iPhone se divide em 2 padrões — Pro e Pro Max — para não conflitarem; Samsung Galaxy se divide em geral + Ultra). 370 ofertas, 302 produtos distintos no catálogo.

---

## 1. Metodologia

Para cada padrão estratégico, `products` foi consultado por `ILIKE` sobre o nome (mesma técnica de `marketplace-observatory-report.ts`), depois `offers` foi consultado por `product_id` para obter loja + `canonical_product_id` de cada oferta. `brands`/`categories` foram carregados por completo (140 e poucas centenas de linhas — abaixo do limite de paginação do PostgREST) para resolver nome/slug de cada `brand_id`/`category_id` observado na amostra.

## 2. Achado 1 — Brand NÃO está fragmentado

```
Brand "apple":    1 linha — id=225be05b… slug=apple    name="Apple"
Brand "samsung":  1 linha — id=48b0d590… slug=samsung  name="Samsung"
Brand "sony":     1 linha — id=08e9d444… slug=sony     name="Sony"
Brand "nintendo": 1 linha — id=a86b9cf3… slug=nintendo name="Nintendo"
```

Todos os produtos Apple da amostra (iPhone, MacBook, AirPods, Watch), de qualquer uma das 5 lojas, apontam para o mesmo `brand_id`. `catalogRepo.upsertBrand(name, slug)` usa `onConflict: "slug"` (`SupabaseCatalogRepository.ts:70-78`) e `slugify(brandName)` normaliza consistentemente — a hipótese inicial de fragmentação de marca (nomes ligeiramente diferentes por conector gerando `brand_id`s diferentes) **não se confirma**. Marca não é o gargalo.

## 3. Achado 2 — Category ESTÁ catastroficamente fragmentado

Apenas os produtos da amostra estratégica (370 ofertas) usam **41 `category_id` distintos**. Exemplos do mesmo conceito real ("celular"), em lojas diferentes ou até na mesma loja:

| category_id (início) | slug | name | Onde aparece |
|---|---|---|---|
| a5aa2c92… | smartphones | Smartphones | atacado-connect |
| 7e584a7e… | celular | Celular | mega-eletronicos |
| 125c49c6… | celulares | Celulares | mobile-zone, mega-eletronicos, shopping-china |
| 934a0c95… | iphone | iPhone | mobile-zone (subcategoria própria) |
| cde1bf38… | iphone-swap | iPhone SWAP | mobile-zone (subcategoria própria) |
| 022e66bf… | general | GENERAL | mobile-zone (fallback) |

`mobile-zone` sozinho usa 3 categorias diferentes (`Celulares`, `iPhone`, `iPhone SWAP`, `GENERAL`) para o que é, do ponto de vista do usuário, a mesma prateleira de celulares. Isso não é ruído aleatório — é a taxonomia própria de cada site de origem, capturada literalmente por `categoryName` em cada `detail-parser.ts`/`product-mapper.ts` e persistida via `upsertCategory(name, slug)` (`onConflict: "slug"`), sem nenhuma normalização entre lojas.

Em escala de marketplace inteiro (não só a amostra), `npm run cpc:report` mostra o mesmo padrão: dezenas de categorias com exatamente 1 canonical product — nomes como "Cargadores", "Mouse", "iPad", "Balança Digital" aparecendo como categoria isolada de uma única loja, ao invés de se somarem a uma categoria compartilhada.

## 4. Achado 3 — `specifications` está vazio para quase toda a amostra

De ~370 ofertas na amostra, apenas **1 produto** (`Galaxy S25 Ultra 256GB`) tem `specifications` populado (`{"cor":"Titânio Preto","tela":"6.8\"","armazenamento":"256GB"}`). Todos os outros — iPhones, MacBooks, AirPods, Apple Watch, PS5, Switch — têm `specifications = {}`. Isso custa 30 dos 100 pontos possíveis (`SPEC_WEIGHT` em `ProductIdentityEngine.ts:19`) em toda comparação fuzzy da amostra, incondicionalmente. Ver `MERGECANDIDATE_FLOW_REPORT.md` §4 para o impacto numérico direto disso num par real.

## 5. Achado 4 — os 2 casos "comparáveis hoje" na amostra não vieram do matching

Dois produtos da amostra já têm `canonical_product_id` compartilhado entre 2 lojas:

- **"Galaxy S25 Ultra 256GB"** — shopping-china e mega-eletronicos.
- **"MacBook Air M3 13" 256GB"** — nissei e shopping-china.

Em ambos os casos, as duas lojas produziram, de forma coincidente, a **string de nome idêntica**, que gera o mesmo `slug` via `slugify()`. `upsertProduct` usa `onConflict: "slug"` — as duas ofertas colidem na mesma linha de `products`, e o bootstrap 1:1 (`CanonicalProductService.bootstrapFromProduct`) naturalmente produz o mesmo canonical product. **Nenhum `MergeCandidate` foi necessário, nenhuma decisão da `ProductIdentityEngine` está envolvida** — é uma coincidência de string, não uma comparação bem-sucedida. Não é reproduzível como estratégia; a esmagadora maioria dos nomes reais tem template/formatação diferente por loja (ver `STRATEGIC_PRODUCTS_ANALYSIS.md`).

## 6. Achado colateral — bug de paginação em `cpc-report.ts`

`scripts/cpc-report.ts` carrega `canonical_products.select("id, category_id")` **sem paginação** (linha 49). Com o catálogo em 9.549 canonical products, o PostgREST corta em 1.000 linhas por padrão — o mesmo bug já corrigido em `canonical-catalog-bootstrap.ts` na Wave Ξ-5 (`COMPARABLE_PRODUCT_COVERAGE_REPORT.md` §1) reapareceu aqui, não corrigido. Efeito observado ao vivo: o relatório por categoria mostra "Sem categoria: 8.549 canonical c/ oferta" quando a Seção 5 desta auditoria (query paginada de propósito) confirma que **100% dos 9.549 canonical products têm `category_id` preenchido**. Ver `PRODUCT_IDENTITY_FINDINGS.md` §1 para a correção de registro que isso implica sobre um achado anterior. Não corrigido nesta Sprint (fora de escopo — leitura, não código de produção), nomeado para uma Sprint futura.

## 7. Tabela-resumo (ver `STRATEGIC_PRODUCTS_ANALYSIS.md` para detalhe produto a produto)

| Produto estratégico | Ofertas | Produtos distintos | Lojas presentes | Comparável hoje (2+ lojas) |
|---|---|---|---|---|
| iPhone 17 Pro Max | 26 | 26 | atacado-connect, mega-eletronicos, mobile-zone, shopping-china | 0 |
| iPhone 17 Pro | 10 | 10 | atacado-connect, mega-eletronicos, mobile-zone, shopping-china | 0 |
| Samsung Galaxy Ultra | 16 | 15 | shopping-china, mega-eletronicos, atacado-connect | 1 |
| Samsung Galaxy (geral) | ~110 | 106 | mega-eletronicos, atacado-connect, roma-shopping | dado agregado, ver análise |
| MacBook Air | 43 | 42 | nissei, shopping-china, mobile-zone, mega-eletronicos | 1 |
| MacBook Pro | 39 | 39 | mobile-zone, mega-eletronicos | 0 |
| AirPods Pro | 7 | 7 | mega-eletronicos, mobile-zone, atacado-connect | 0 |
| Apple Watch | 41 | 41 | mobile-zone, mega-eletronicos | 0 |
| PlayStation 5 | 42/43 | 43 | mega-eletronicos, mobile-zone, roma-shopping, atacado-connect | 0 |
| Nintendo Switch | 80 | 80 | mega-eletronicos | 0 |

**Total da amostra: 302 clusters (canonical_product_id) distintos, apenas 2 com 2+ lojas.**
