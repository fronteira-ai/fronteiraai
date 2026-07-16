# CATEGORY_DICTIONARY.md
# Program Κ — Mission Κ-2 — Objetivo 1: Auditoria completa da taxonomia

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-15 — medição direta contra produção via `scripts/kappa2-taxonomy-audit.ts` (read-only)

---

## 1. Quantas categorias existem hoje?

**929** (`categories`, confirmado, mesmo número que `docs/product/CATEGORY_INVENTORY_REPORT.md` — Mission Κ-1 — já havia medido; catálogo não cresceu em categoria desde então).

## 2. Quantas são duplicadas / representam exatamente o mesmo conceito?

Reaproveitado da Mission Κ-1, não remedido aqui (fora do escopo desta Mission recalcular): **66 clusters de sinônimo** (170 categorias) + **377 pares pai/filho** — ver `docs/product/CATEGORY_CLUSTER_MATRIX.md`.

## 3. Distribuição de idioma (nova medição desta Mission)

Heurística lexical de dicionário fechado (marcadores PT-only/ES-only já vistos nas análises da Mission Κ-1) — nunca um classificador de idioma real. Cada categoria "Indeterminado" é reportada como tal, nunca forçada em PT/ES/EN.

| Idioma | Contagem | % | Exemplos reais |
|---|---:|---:|---|
| PT | 108 | 11,6% | Tablets e Readers, Câmeras Fotográficas, Impressoras, Babá Eletrônica |
| ES | 58 | 6,2% | Kit Mouse y Teclado, Computación, Reloj Masculino, Lentes para natación |
| EN | 9 | 1,0% | Drones, Smart Watch, Speaker, Speakers |
| **Indeterminado** | **754** | **81,2%** | Videogames, Celulares, Ar Condicionado, Whisky, Garrafa |

**Leitura honesta**: a maioria esmagadora das 929 categorias (81,2%) não carrega nenhum marcador lexical PT/ES/EN suficientemente distintivo para uma heurística simples classificar com confiança — muitos nomes são curtos, técnicos, ou já compartilhados entre os 2 idiomas (ex.: "Notebooks", "Smartphones"). Isso não é uma falha da medição; é a razão de fundo pela qual a Mission Κ-1 já havia concluído que a fragmentação é "100% lexical" — a maior parte da fragmentação real não vem de tradução (PT vs. ES), vem de variação de escrita dentro do mesmo idioma (singular/plural, sinônimo comercial, bucket genérico de merchant).

## 4. Fragmentação de marca (nova medição desta Mission)

| Métrica | Valor |
|---|---:|
| Brands totais | 852 |
| Grupos com 2+ variantes do mesmo nome normalizado | **2** |
| Linhas de `brands` envolvidas | 4 / 852 (0,5%) |

**Todos os grupos encontrados**: `"meta quest" <- ["Meta Quest", "Meta(quest)"]`, `"rayban meta" <- ["Rayban - Meta", "Rayban(meta)"]`.

**Achado que contradiz a expectativa do mandato**: o exemplo ilustrativo da missão (Apple/APPLE/apple/Apple Inc/Apple®/APPLE COMPUTER) é hipotético — a medição real contra os 852 brands de produção mostra que **esse tipo de fragmentação praticamente não existe hoje** (0,5%, e nenhum caso é Apple/Samsung — são 2 casos de notação parentética de sub-marca). Isso é reportado honestamente, não inflado para bater com o exemplo do brief. A fragmentação real do marketplace está concentrada em **categoria**, não em marca.

## Fontes

`scripts/kappa2-taxonomy-audit.ts` (rodado ao vivo, 2026-07-15), `docs/product/CATEGORY_INVENTORY_REPORT.md`, `docs/product/CATEGORY_CLUSTER_MATRIX.md`.
