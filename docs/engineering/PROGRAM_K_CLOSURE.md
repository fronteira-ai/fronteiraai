# PROGRAM_K_CLOSURE.md
# Program Κ (Kappa) — Closure Audit — Mission Κ-4

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-16
**Ver também**: `docs/engineering/PRODUCT_IDENTITY_INTEGRATION.md`, `docs/engineering/PRODUCT_IDENTITY_PIPELINE.md`.

---

## Componentes de Program Κ e seu estado real, um por um

| Componente | Mission | Estado antes de Κ-4 | Estado depois de Κ-4 |
|---|---|---|---|
| Universal Taxonomy (`src/domains/taxonomy/data/universal-tree.ts`) | Κ-2 | Construído, **não consumido** | **Conectado** — único consumidor real: `CanonicalMergeSuggestionService` |
| Alias Engine (`realCategorySlugs[]` + `findNodeByRealCategorySlug`) | Κ-2 | Construído, não consumido (é a mesma estrutura da Taxonomy, não um serviço à parte) | **Conectado** (mesma wiring acima) |
| Brand Normalization (`normalizeBrandName`, `KNOWN_BRAND_DUPLICATES`) | Κ-2 | Construído, **não consumido** | **Ainda não consumido** — gap real, não fechado por esta Mission |
| Model Normalization (`normalizeAppleModelToken`, `KNOWN_MODEL_ALIASES`) | Κ-2 | Consumido internamente por `ProductSignatureExtractor` (Κ-3), mas Κ-3 em si não estava wired | **Conectado** (transitivamente, via o wiring do Product Signature) |
| `ATTRIBUTE_DICTIONARY` (`src/domains/taxonomy/data/attribute-dictionary.ts`) | Κ-2 | Construído, **não consumido em lugar nenhum** (nem por `product-intelligence/`, que tem seu próprio mapa separado, `attribute-key-aliases.ts`) | **Ainda não consumido** — gap real, não fechado por esta Mission |
| Product Intelligence Layer / Product Signature (`buildProductSignature`) | Κ-3 | Construído, validado só por simulação, **não consumido** | **Conectado** — único consumidor real: `CanonicalMergeSuggestionService` |
| Attribute Extraction (`attribute-key-aliases.ts`, `value-normalizers.ts`, `manufacturer-code-extractor.ts`) | Κ-3 | Consumido internamente por `ProductSignatureExtractor`, mas este não estava wired | **Conectado** (transitivamente) |
| `ProductIdentityEngine` (validado desde Release 1.7, não é output de Κ) | — | Em produção, recebendo dado bruto | Em produção, recebendo dado normalizado — **arquivo inalterado** |

## Existe algum componente do Program Κ ainda não utilizado?

**Sim, dois, nomeados exatamente:**

1. **Brand Normalization** (`src/domains/taxonomy/data/brand-normalization.ts`, `normalizeBrandName`/`KNOWN_BRAND_DUPLICATES`) — mede apenas 2 grupos de duplicata / 4 de 852 marcas (0,5%, `Κ-2 taxonomy audit`), impacto real baixo. Fora do escopo desta Mission (Objetivo 3 pedia explicitamente "Universal Taxonomy", não normalização de marca) — nomeado aqui, não implementado, para não expandir escopo silenciosamente.
2. **`ATTRIBUTE_DICTIONARY`** (labels PT/ES + descrição por atributo) — nunca teve um consumidor desde que foi criado; é metadado de exibição (rótulo humano), não uma função de normalização, então não tinha um lugar natural no wiring desta Mission (que conecta lógica de comparação, não UI).

## Existe alguma infraestrutura construída mas não integrada?

Uma: a migration `supabase/migrations/20260715140000_universal_taxonomy.sql` (5 tabelas: `universal_categories`, `category_universal_map`, `canonical_brands`, `brand_universal_map`, `model_aliases`, `attribute_dictionary`) permanece **não aplicada**. O wiring desta Mission não precisou dela — operou inteiramente sobre a árvore estática em código, zero I/O, exatamente como Κ-2 desenhou. A migration continua sendo uma melhoria futura legítima (consulta SQL direta, admin UI para editar a taxonomia), não um bloqueio.

## Existe alguma duplicidade?

Sim, uma, real: **dois caminhos avaliam Product Identity** — `CanonicalMergeSuggestionService` (agora wired, gera `merge_candidates`, o único que afeta Comparable Coverage) e `ProductIdentityShadowStage` (avaliação em tempo de sync, por oferta, gera só um log de auditoria, **não wired** à Universal Taxonomy/Product Signature). Documentado em detalhe em `PRODUCT_IDENTITY_PIPELINE.md` §Duplicidade — não é uma duplicidade de decisão (só um caminho grava algo que importa para o catálogo), mas é uma duplicidade real de insumo (os dois caminhos, hoje, responderiam "é o mesmo produto?" de forma diferente para o mesmo par, um usando taxonomia normalizada, o outro não).

## Existe alguma dívida técnica?

Três itens, nomeados:

1. Brand Normalization não conectada (acima) — impacto medido baixo (0,5% das marcas), mas deixa a fórmula "Universal Taxonomy" incompleta em relação ao que Κ-2 de fato construiu (categoria + marca).
2. `ProductIdentityShadowStage` desalinhado do caminho principal (acima) — o log de Shadow Mode por oferta hoje reflete um padrão de comparação mais antigo que o que `merge_candidates` usa.
3. Migration Κ-2 não aplicada — sem custo funcional hoje (o wiring não depende dela), mas significa que a Universal Taxonomy não é consultável via SQL direto nem editável por um admin sem alterar código.

Nenhum dos três bloqueia o que esta Mission entregou — todos são candidatos a Mission futura, não pendências desta.

## Program Κ está oficialmente encerrado?

Ver resposta objetiva em `PRODUCT_IDENTITY_INTEGRATION.md` e no veredito final da resposta desta Mission — a leitura curta: os dois componentes que definiam o objetivo central de Program Κ (Universal Taxonomy, Product Signature) estão **construídos, testados e agora conectados ao fluxo real que produz `merge_candidates`**, com efeito medido (cross-merchant 0→66). Os três itens de dívida técnica acima são reais, mas nenhum é do mesmo porte estrutural que a integração agora fechada — são refinamentos, não gaps fundacionais.
