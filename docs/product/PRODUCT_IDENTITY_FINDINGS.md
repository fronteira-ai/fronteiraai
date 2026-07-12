# PRODUCT_IDENTITY_FINDINGS.md
# FASE 2 — SPRINT 2.3 — Product Comparison Validation — Objetivo 5 (síntese e recomendação)

**Categoria**: `docs/product/`
**Data**: 2026-07-11
**Companions**: `PRODUCT_COMPARISON_AUDIT.md`, `STRATEGIC_PRODUCTS_ANALYSIS.md`, `MERGECANDIDATE_FLOW_REPORT.md`, `COMPARISON_SIMULATION_REPORT.md` (evidência completa desta Sprint), `PRODUCT_IDENTITY_VALIDATION_FRAMEWORK.md` (Mission Θ-1), `MERGE_CANDIDATES_REPORT.md` (Mission Ω-4.1)

---

## 1. Correção de registro — um achado anterior estava errado

`phase2_sprint22_marketplace_expansion` (memória, 2026-07-10) registrou "89% dos canonical products (7.984/8.983) têm `category_id` NULL". **Esta Sprint mede, com query paginada corretamente (`PRODUCT_COMPARISON_AUDIT.md` §6), que `category_id` está preenchido em 100% dos 9.549 canonical products.** A causa provável do número anterior: `scripts/cpc-report.ts` carrega `canonical_products` sem paginação (linha 49), e o PostgREST corta em 1.000 linhas por padrão — reproduzido ao vivo nesta Sprint (`cpc:report` mostra "Sem categoria: 8.549" apesar do preenchimento real ser 100%). Registrado aqui para que uma sessão futura não repita a suposição de que falta `category_id` — o problema real é **qualidade/consistência** do `category_id`, não sua ausência (ver §2).

## 2. As duas causas confirmadas, com evidência

**A qualidade do dado, não o volume, é o gargalo — mas "qualidade" tem dois componentes distintos e ambos foram confirmados separadamente, com exemplos reais:**

1. **Taxonomia de categoria fragmentada por loja.** 41 `category_id` distintos usados só pela amostra de 8 produtos estratégicos (`PRODUCT_COMPARISON_AUDIT.md` §3). Uma única loja (mobile-zone) usa 3-4 categorias diferentes para "celulares". Isso alimenta diretamente o gate duro de `ProductIdentityEngine` (brand+category, `MISMATCH_CAP=40`).
2. **`specifications` vazio para ~100% da amostra.** Custa 30 dos 100 pontos possíveis em toda comparação fuzzy, incondicionalmente — confirmado com decomposição numérica exata no caso AirPods Pro 3 (`MERGECANDIDATE_FLOW_REPORT.md` §4).
3. **Variação de template de nome entre lojas** (mesma SKU, textos muito diferentes) — custa pontos adicionais em `name-similarity`, também quantificado no mesmo caso.

Nenhum dos três, isolado, seria suficiente para bloquear o par AirPods Pro 3 (`MERGECANDIDATE_FLOW_REPORT.md` §4 mostra que corrigir só `specifications` deixaria a pontuação em 68, ainda abaixo do threshold 70). **É a combinação dos três que mantém pares genuinamente idênticos abaixo do threshold de revisão.**

## 3. O que NÃO é o gargalo

- **Geração de `MergeCandidate` (o mecanismo em si)**: `CanonicalMergeSuggestionService` funciona exatamente como projetado e aprovado — nenhum bug encontrado nele. Ele é estrito por desenho (falso positivo é inaceitável, `RELEASE_1_7_BLUEPRINT.md` Cap. 8). O baixo volume de candidatos é consequência direta da baixa taxa de acerto por par avaliado (§2), não de um defeito no mecanismo de geração.
- **Marca (`brand_id`)**: confirmado consistente entre lojas para Apple/Samsung/Sony/Nintendo — 1 linha cada, `onConflict:"slug"` funcionando como esperado (`PRODUCT_COMPARISON_AUDIT.md` §2).
- **Revisão humana como gargalo de fila**: há apenas 5 `MergeCandidate`s pendentes no marketplace inteiro — não há fila represada esperando revisão. O gargalo está antes disso, na geração de candidatos suficientemente confiantes para chegar à fila.

## 4. Ação de valor imediato, zero risco, disponível agora (fora do escopo desta Sprint executar)

2 dos 5 `MergeCandidate`s pendentes hoje são pares cross-merchant genuinamente idênticos (cabos Hoco X109 e X99, mobile-zone × mega-eletronicos, confiança 70 cada — `MERGECANDIDATE_FLOW_REPORT.md` §3). Aprovар estes via `PATCH /api/admin/canonical-catalog/merge-candidates/[id]` é uma decisão humana, de custo zero de engenharia, que já está disponível hoje. **Não executado nesta Sprint** (mandato é leitura/análise/simulação, não execução) — nomeado como a ação de menor esforço e maior retorno imediato para quem revisar este documento.

## 5. Resposta ao Objetivo 5

> A. O gargalo está na geração dos MergeCandidates.
> B. O gargalo está na qualidade dos atributos disponíveis.
> C. O gargalo está na revisão humana.
> **D. O gargalo é uma combinação dos fatores acima.**

**Resposta: D — mas não como "um pouco de cada", com peso específico e evidenciado:**

- **B é o fator dominante e o único acionável sem risco.** Taxonomia de categoria não normalizada entre lojas + `specifications` estruturalmente vazio + variação de template de nome — os três, evidenciados com números reais em `MERGECANDIDATE_FLOW_REPORT.md` §4, são suficientes para explicar por que um par identicamente o mesmo produto (AirPods Pro 3, mesma SKU) pontua 38 de 100, bem abaixo do threshold 70.
- **A não é um gargalo real** — o mecanismo de geração funciona corretamente; ele produz poucos candidatos porque os pares avaliados genuinamente não atingem o threshold, não porque o mecanismo falha ou está mal configurado. Rebaixar o threshold seria alterar heurística (fora do mandato, e do princípio de "falso positivo inaceitável" já aprovado pelo CTO) — a `COMPARISON_SIMULATION_REPORT.md` §3 mostra concretamente que até uma heurística mais permissiva produz falso positivo (PS5 Slim CFI-2015A vs CFI-2115A, edições diferentes agrupadas incorretamente).
- **C não é um gargalo hoje** — não há fila represada; há apenas 5 candidatos no total, 2 imediatamente aprováveis (§4).
- **Um quarto fator, fora das 4 opções, também confirmado**: mesmo corrigindo B inteiramente, a sobreposição real de SKU exato (mesma capacidade+cor) entre as 5 lojas atuais é inerentemente baixa para os produtos estratégicos nomeados (`COMPARISON_SIMULATION_REPORT.md` §4) — um limite de composição de catálogo, não de matching, que nenhuma correção de Product Identity resolve sozinha.

## 6. Recomendação para a Sprint 2.4 (não implementada aqui)

Maior alavancagem para o usuário, em ordem:

1. **Aprovação humana dos 2 `MergeCandidate`s Hoco já pendentes** (§4) — ação imediata, zero risco, zero código.
2. **Normalização de taxonomia de categoria na ingestão** — mapear o vocabulário de categoria de cada conector para um conjunto canônico compartilhado (ex.: `Celular`/`Celulares`/`Smartphones`/`iPhone`/`iPhone SWAP` → uma categoria). É uma correção de **mapeamento de dado na normalização**, não uma mudança em `ProductIdentityEngine`, thresholds, ou Shadow Mode — mantém intacto o princípio "nenhuma mudança automática em Product Identity" (`PRODUCT_IDENTITY_VALIDATION_FRAMEWORK.md`, mandato do CTO).
3. **Extração de `specifications` estruturado por conector**, onde a página de origem já tem o dado (capacidade, cor) em campos estruturados — hoje perdido na normalização. Reduz a perda incondicional de 30 pontos que afeta toda comparação fuzzy.
4. **Decisão de produto, não de engenharia**: definir se comparação deve ser por SKU exato (hoje) ou por modelo com seletor de variante — `COMPARISON_SIMULATION_REPORT.md` §4 nomeia isso como pergunta em aberto, não resolvida aqui.

Nenhum destes 4 itens foi executado nesta Sprint. Nenhuma heurística foi alterada. Nenhum merge foi aplicado. Nenhuma mudança em Product Identity ou Shadow Mode ocorreu.
