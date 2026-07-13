# CATEGORY_SIMILARITY_ANALYSIS.md
# PROGRAM Κ (KAPPA) — MISSION Κ-1 — Objetivo 2: Similarity Analysis

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Fonte de dado**: `scripts/kappa1-category-similarity.ts`, read-only, rodando sobre as 929 categorias reais (`CATEGORY_INVENTORY_REPORT.md`). Nenhum ID criado, nenhuma categoria alterada.

---

## 1. Método

Para cada par de categorias (não-genéricas — ver §2) foi calculado um **score léxico**:

1. **Token Jaccard** — nome normalizado (minúsculas, sem acento, sem pontuação), *stopwords* removidas (`de`, `e`, `y`, `para`, `com`, artigos), cada token passado por um stemmer heurístico + um pequeno dicionário de sinônimos comerciais PT/ES/EN (fone↔auricular↔headset, celular↔smartphone, notebook↔laptop, tv↔televisor, etc. — 17 grupos, listados no código, cada um justificado por um caso real já visto na Sprint 2.4 ou nesta mesma Sprint). Interseção/união dos conjuntos de token resultantes.
2. **Levenshtein ratio** — usado **apenas** como sinal adicional para pares onde ambos os nomes se reduzem a um único token de conteúdo, e apenas quando o menor dos dois nomes tem ≥7 caracteres e a razão de similaridade é ≥0,80. Ver §1.1 sobre por que essa restrição existe.

Um **score de contexto** corrobora (não substitui) o score léxico: sobreposição Jaccard da marca predominante e das chaves de `specifications` dos produtos de cada categoria — só computado quando ambas as categorias têm ≥5 produtos (abaixo disso, dois produtos de uma marca coincidente já dão Jaccard=1 por acaso, o que é ruído, não sinal).

**Tiers**: lexScore ≥0,60 → **Alta** (única fonte que alimenta o agrupamento por Union-Find); lexScore 0,35–0,60 com contextScore ≥0,40 → **Média** (par candidato, não unido automaticamente); lexScore 0,35–0,60 sem suporte de contexto suficiente → **Ambígua** (não unido, revisão manual). Abaixo de 0,35 o par não é sequer listado (nenhum sinal de relação).

### 1.1 — Correção metodológica (registrada por transparência, exigida pelo mandato: nenhuma conclusão sem medição)

A primeira versão do script uniu categorias no Union-Find usando **tanto** o tier Alta quanto o Média, e o Levenshtein irrestrito sobre a string inteira. Isso produziu, na primeira rodada real contra produção, **um cluster de 584 categorias sem relação nenhuma entre si** (Videogames, Ar Condicionado, Drones, SAMSUNG, Perfume Unissex, Monitor todos no mesmo grupo) — causado por: (a) `contextScore` sendo 100% ruído para categorias com 1-2 produtos (dois produtos coincidentemente da mesma marca únicos dão Jaccard=1), unido transitivamente pelo Union-Find; e (b) Levenshtein sobre nomes multi-token sendo dominado por uma frase-template compartilhada ("Accesorios para Notebook" vs "Accesorios para iPhone" têm distância de edição pequena porque 2/3 da string é idêntica, mesmo os conceitos sendo diferentes).

Uma segunda correção (restringir Levenshtein a nomes de 1 token) ainda produziu um cluster de 66 e outro de 18 categorias sem relação — causado por colisão por acaso entre palavras curtas não relacionadas ("Facas" [facas de cozinha] vs "Tazas" [xícaras, ES], 5 letras, 2 edições = razão 0,60). A correção final (exigir comprimento mínimo de 7 caracteres e razão ≥0,80, e nunca unir clusters usando o tier Média) eliminou as duas superclusterizações. O código documenta essa história inline (`scripts/kappa1-category-similarity.ts`).

**Isso não elimina 100% dos falsos positivos** — ver §4 para os que sobraram e foram encontrados por revisão manual, não pelo algoritmo.

## 2. Categorias genéricas/fallback — excluídas do clustering

8 categorias são buckets de fallback do merchant de origem, não conceitos de produto (mesmo achado da Sprint 2.4 §3 para `GENERAL`):

| Categoria | Slug | Produtos |
|---|---|---:|
| GENERAL | general | 2.142 |
| ELECTRONICOS | electronicos | 519 |
| SALUD Y BELLEZA | salud-y-belleza | 171 |
| CASA Y ESCRITORIO | casa-y-escritorio | 147 |
| Geral | geral | 12 |
| Accesorios | accesorios | 29 |
| Acessórios | acessorios | 26 |
| Eletrônicos | eletronicos | 6 |

Essas 8 categorias (3.052 produtos, 16,9% do catálogo) não podem ser resolvidas por similaridade lexical — resolver exigiria reclassificar produto-a-produto pelo **nome do produto**, não pela categoria já atribuída (que é, por definição, não-informativa). Fica fora do escopo desta Mission (medir), mas é um achado relevante para o backlog.

## 3. Resultado agregado

| Métrica | Valor |
|---|---:|
| Categorias avaliadas (não-genéricas) | 921 |
| Pares com lexScore ≥0,35 | 503 |
| — Alta confiança | 108 |
| — Média confiança | 18 |
| — Ambígua | 377 |
| Clusters formados (só tier Alta, Union-Find) | 74 |
| Categorias que entraram em algum cluster | 170 |
| Categorias "únicas" (nenhum edge de nenhum tier) | 463 / 921 (50,3%) |

**Menos da metade das categorias (463/921) não tem nenhum candidato de equivalência, em nenhum tier.** As outras ~50% se dividem entre clusters de alta confiança (170 categorias, 74 clusters — ver `CATEGORY_CLUSTER_MATRIX.md`) e um número muito maior de pares "Ambígua" (377) que **não são ruído aleatório**: ver §5.

## 4. Falsos positivos encontrados por revisão manual (tier Alta)

Mesmo após a correção de §1.1, uma revisão manual (conhecimento de domínio PT/ES) dos 74 clusters encontrou 8 casos que o algoritmo classificou como "Alta" mas que um humano rejeitaria:

| Par | Por que está errado |
|---|---|
| Câmeras/CAMARAS + **Camperas** | "Camperas" = jaquetas (ES). Colisão de 1 caractere inserido ("camaras"→"camperas") — coincidência lexical, conceito totalmente diferente. |
| Aspiradores/Aspirador/Aspiradora + **Aparadores** | "Aparadores" = aparadores de cabelo/objetos, não aspirador de pó. |
| Fritadeira + Frigideira | Fritadeira = air fryer; Frigideira = frigideira de fogão. Produtos diferentes, 2 edições em string de 10 caracteres = razão 0,80 exata. |
| Caldeira + Cadeira | Caldeira = boiler; Cadeira = cadeira (móvel). 1 edição = razão 0,875. |
| Condimenteros + Condimentos | Porta-condimentos (utensílio) vs condimentos (o produto em si). |
| Estabilizadores + Esterilizadores | Estabilizador de tensão vs esterilizador (ex.: de mamadeira). |
| Nintendo Switch + Jogo para Nintendo Switch | Console (hardware) vs um jogo *para* o console (mídia) — mesmo erro de categoria que a Sprint 2.4 já advertiu para "Games": dispositivo ≠ item para o dispositivo. |
| Câmeras de Ação + Acessórios para Câmera de Ação | Dispositivo vs acessório do dispositivo — mesmo padrão. |

**8 de 108 edges Alta (7,4%) são falsos positivos por revisão manual — mas zero desses 8 aparece nos 20 maiores clusters por volume de produto.** Todos os clusters de alto impacto (Celulares/Smartphones, Fones de Ouvido, Perfume/perfumes, Smartwatch, Speaker/Parlantes, Cargadores, Tablet, TVs/Televisor, Teclado, Monitor, Impressoras/Impresoras, Auriculares/Headsets) foram confirmados corretos na revisão manual. `CATEGORY_CLUSTER_MATRIX.md` usa a lista já corrigida (66 clusters validados, excluindo os 8 acima) — nunca a saída bruta do script.

## 5. O achado principal: fragmentação "dispositivo × acessório/variante", não só sinônimo

Os 377 pares "Ambígua" não são majoritariamente ruído — a leitura manual mostra um padrão estrutural dominante, repetido dezenas de vezes: **categoria-pai vs. seu próprio acessório/variante/subtipo**, sempre com o mesmo score léxico (0,50, esperado matematicamente para um par de 2-3 tokens compartilhando exatamente 1: `Celulares` × `Suporte para Celular`, `Celulares` × `Accesorios para celulares`; `Notebooks` × `Accesorios para Notebook`/`Fundas Notebook`/`Mochila para Notebook`; `TVs`/`Televisor` × `TV Box`/`Soportes de TV`/`Antena de TV`; `Câmeras` × `Câmeras de Ação`/`Accesorios para cámaras`; `Tablet`/`Tablets` × `Acessórios para Tablet`/`Fundas Tablet`; `Perfume` × `Perfume Masculino`/`Feminino`/`Unissex`/`Arabe`/`Infantil`/`unisex`; `Reloj` × `Reloj Masculino`/`Femenino`/`Unisex`.

Isso confirma, em escala (377 pares, não um caso isolado), o padrão que a Sprint 2.4 só tinha observado uma vez (cluster "Games": console/jogo/acessório). **A maior fonte de fragmentação de categoria no marketplace não é ortografia — é a ausência de uma relação pai/filho ou de atributo estruturado entre "o produto" e "o acessório/variante do produto".** Um mapeamento flat (sinônimo → 1 ID) resolve os 66 clusters de Alta confiança (170 categorias, ver `CATEGORY_CLUSTER_MATRIX.md`) mas **não tem como resolver corretamente nenhum desses 377 pares sem inventar uma relação estrutural** — forçar um flat merge aqui reintroduziria exatamente o tipo de falso positivo que a Sprint 2.7 tentou evitar (juntar produtos que não deveriam nunca ser candidatos de identidade). Isso é decisivo para a recomendação de arquitetura (`TAXONOMY_ARCHITECTURE_RECOMMENDATION.md`, Objetivo 5).

## 6. Categorias "únicas" de maior massa (conceitos genuinamente distintos, não fragmentados)

| Categoria | Produtos |
|---|---:|
| Perfume Masculino* | 520 |
| Perfume Feminino* | 475 |
| Perfume Unissex* | 302 |
| Notebooks | 244 |
| Perfume Femenino* | 153 |
| Conservadoras y Termos | 143 |
| Fundas Smartphone* | 128 |
| Séruns | 105 |
| Shampoo, acondicionador y tratamientos | 103 |
| Aparelhos de Som | 101 |

\* Aparecem como "única" apenas porque nenhum edge de tier Alta as tocou — todas têm candidatos reais no bucket Ambígua (§5) e não devem ser lidas como isoladas de verdade, e sim como nós de uma relação pai/filho ainda não modelada.
