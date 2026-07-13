# Product Identity Flow Audit

**Fase 2 — Sprint 2.7.** Auditoria completa, sem alteração de código. Toda referência de arquivo/linha é do estado do repositório em 2026-07-12 (commit `a66e714`).

## Objetivo

Documentar, etapa por etapa, o fluxo real (não o fluxo assumido) desde a Offer de um conector até um `MergeCandidate` persistido, com entradas, saídas, critérios de decisão e pontos de descarte de cada etapa.

## Descoberta estrutural prévia: existem DOIS fluxos independentes, não um

O brief desta Sprint descreve um único pipeline linear (`Offer → Canonical Product → ProductIdentityEngine.evaluate() → Ranking → CanonicalMergeSuggestionService → MergeCandidate → Shadow Mode`). O código real tem **dois fluxos que usam o mesmo `ProductIdentityEngine` mas nunca se cruzam**:

| | Fluxo 1 — Shadow Mode (sync) | Fluxo 2 — Bootstrap merge suggestion |
|---|---|---|
| Disparado por | `ProductIdentityShadowStage` durante cada sync de conector | `canonical-catalog-bootstrap.ts --execute`, uma vez por `canonical_product` |
| Serviço | `ProductIdentityService.evaluateAndLog` (`src/domains/product-identity/services/ProductIdentityService.ts:20-52`) | `CanonicalMergeSuggestionService.suggestMergesFor` (`src/domains/product-identity/services/CanonicalMergeSuggestionService.ts:55-80`) |
| Candidatos vêm de | `IProductCandidateRepository.findByBrandSlug` (offers já normalizadas, `products` table) | `ICanonicalCatalogRepository.findByBrandId` (`canonical_products` table) |
| Escreve em | `product_identity_match_log` (append-only, todo item "new" do sync) | `merge_candidates` (só se confiança ≥ 70 e o par não existir) |
| Produz `MergeCandidate`? | **Nunca.** Só loga. | **Sim — é a única origem de `merge_candidates` no sistema.** |

Isso significa: **o volume de 1.211 `merge_candidates` encontrado na Sprint 2.6 vem inteiramente do Fluxo 2** (rodado pelo bootstrap), não de qualquer coisa observada durante o sync diário dos conectores. O Fluxo 1 (Shadow Mode) é hoje só um log de auditoria de baixo custo, sem efeito sobre o catálogo canônico. Esta auditoria segue o Fluxo 2 em detalhe, porque é o único que importa para a pergunta desta Sprint.

## Etapa a etapa (Fluxo 2 — o que realmente gera um MergeCandidate)

### 1. `products` → `canonical_products` (bootstrap 1:1)
- **Arquivo**: `scripts/canonical-catalog-bootstrap.ts:65-110`, `CanonicalProductService.bootstrapFromProduct` (`src/domains/canonical-catalog/services/CanonicalProductService.ts:27-36`).
- **Entrada**: toda linha de `products` (paginada corretamente, 1000/página).
- **Saída**: uma linha de `canonical_products` por `products.slug` (via `findOrCreateBySlug`, `SupabaseCanonicalCatalogRepository.ts:50-78`).
- **Critério de decisão**: `canonical_slug` já existe? Se sim, reaproveita a linha existente **sem atualizar nada nela** — nome, specifications, brand_id, category_id ficam congelados no valor que tinham na primeira vez que o slug foi bootstrapped. Se não, cria com os dados atuais de `products`.
- **Achado crítico (não fazia parte da hipótese original desta Sprint, mas é decisivo para ela — ver `PRODUCT_IDENTITY_DECISION_REPORT.md`)**: como o bootstrap roda de novo a cada execução e a maioria dos slugs já existe, a maior parte de `canonical_products.specifications` está **congelada desde o primeiro bootstrap**, mesmo quando o `products.specifications` correspondente foi enriquecido depois (Sprint 2.5/2.6). Medido: amostra de 30 canonical products "iPhone 17 Pro Max" — 26/30 (87%) com `specifications` vazio no canonical, 17/30 (57%) com o `products` correspondente estritamente mais rico. Nenhum código precisou ser alterado para observar isso — é uma consequência de `findOrCreateBySlug` nunca fazer `update`.

### 2. `canonical_products` → candidatos do mesmo brand
- **Arquivo**: `SupabaseCanonicalCatalogRepository.findByBrandId` (`:80-87`).
- **Entrada**: `brand_id` (UUID) do canonical product fonte.
- **Saída**: todo `canonical_products` com o mesmo `brand_id`, **de qualquer loja**, sem filtro de categoria na query.
- **Critério de decisão**: nenhum — é um `SELECT ... WHERE brand_id = X`, sem paginação (assume que nenhum brand único terá >1000 produtos; hoje o maior brand real é "Jbl" com 454 — seguro, mas o bucket "Outros" tem 3.064, ver `CANDIDATE_RANKING_ANALYSIS.md`).
- **Consequência estrutural**: como o filtro já é por `brand_id`, o **hard gate de brand dentro do `ProductIdentityEngine` nunca pode falhar neste fluxo** — todo candidato retornado já tem o mesmo `brand_id` do source. O único hard gate que ainda pode reprovar um par aqui é o de **categoria**.

### 3. `ProductIdentityEngine.evaluate(source, candidates[])`
- **Arquivo**: `src/domains/product-identity/domain/ProductIdentityEngine.ts:204-280`.
- **Entrada**: um `EvaluableProduct` (source) + um array de `MatchCandidate` (todo o cohort do brand).
- **Critérios de decisão, em ordem**:
  1. **Slug exato** (`:206-222`) — se algum candidato tem o mesmo `canonical_slug` do source, confiança = 100 automática. Nunca acontece neste fluxo porque `candidates` já exclui o próprio source (`CanonicalMergeSuggestionService.ts:59`) e slugs são únicos.
  2. **Zero candidatos** (`:224-241`) → `new-product`, sem score.
  3. **Score fuzzy por candidato** (`scoreCandidate`, `:65-125`): 4 fatores —
     - `brand` (peso 0 no score, mas é gate) — comparação de `brandId` (UUID). Sempre `true` neste fluxo (ver Etapa 2).
     - `category` (peso 0 no score, mas é gate) — comparação de `categoryId` (UUID). **Este é o único gate que opera de fato.**
     - `name-similarity` (peso máx. 50) — Jaccard de tokens normalizados do nome.
     - `specifications` (peso máx. 30) — % de chaves compartilhadas com valor igual.
     - `model-number` (peso máx. 20) — % de tokens alfanuméricos do source presentes no candidato.
  4. **Gate de mismatch** (`confidenceFromFactors`, `:127-131`): se `brandId` OU `categoryId` diferem, `confidence = min(rawScore, 40)` — MISMATCH_CAP. Como brand nunca diverge aqui, na prática **`categoryId` diferente sozinho já capa a 40**, bem abaixo do threshold "possible" (70).
  5. **Escolha do vencedor** (`:243-259`): `if (!best || confidence > best.confidence) best = candidate` — mantém só o de maior confiança, estritamente maior (empate = mantém o primeiro na ordem de retorno do banco, que não tem `ORDER BY` — ordem não determinística entre execuções).
- **Saída**: um único `MatchResult` — o vencedor, com `confidence`, `tier`, `factors`, `penalties`, `explainabilityReason`.
- **Descarte de candidatos**: **acontece aqui, silenciosamente, sem log.** Todo candidato que não é o vencedor desaparece da memória ao final da chamada — não há registro de que ele foi avaliado, nem do seu score. Esta é a etapa que motivou a hipótese original da Sprint ("só o melhor candidato sobrevive").

### 4. `CanonicalMergeSuggestionService.suggestMergesFor`
- **Arquivo**: `:55-80`.
- **Entrada**: `canonicalProductId` (um por chamada — o bootstrap chama isso para **todo** canonical product, existente ou novo, em todo `--execute`).
- **Critério de decisão**: `result.confidence >= CONFIDENCE_THRESHOLDS.possible` (70) **e** `result.candidateProductId !== source.id` **e** não existe já um `merge_candidates` para exatamente esse par direcional (`findByPair(source.id, target.id)` — checa só uma direção; não há checagem de reciprocidade, então em tese A→B e B→A podem coexistir como duas linhas independentes se ambos se escolherem mutuamente como melhor match).
- **Saída**: 0 ou 1 linha em `merge_candidates`, sempre `status = Pending`.
- **Descarte**: se confiança < 70, a função retorna sem gravar nada — **nenhum log, nenhum rastro** de que a avaliação ocorreu (diferente do Fluxo 1, que loga toda avaliação independentemente do resultado).

### 5. Persistência do MergeCandidate
- **Arquivo**: `SupabaseMergeCandidateRepository.create` (`:28-47`).
- **Saída**: linha em `merge_candidates` com `status = Pending`, `matched_attributes`, `mismatched_attributes`, `penalties`, `reason` (texto explicável) — tudo vindo direto do `MatchResult` do Passo 3, sem transformação adicional.

### 6. Shadow Mode / revisão humana
- **Arquivo**: `IMergeCandidateRepository` (`src/domains/canonical-catalog/repositories/IMergeCandidateRepository.ts`) — só tem `create`, `findById`, `findByStatus`, `findByPair`, `updateStatus`. **Não existe nenhum método de execução** (nenhum "approve and merge offers"). Confirma o achado da Sprint 2.3: aprovar um `MergeCandidate` hoje só muda `status`, nunca reatribui offers nem funde canonical products. "Nenhuma união automática" (mission do domínio, comentário em `MergeCandidate.ts:14-20`) é verdade estrutural, não só política.

### 7. Resultado final
Um `MergeCandidate` `Pending` que um humano pode ver via `findByStatus`, mas que **não afeta o catálogo, o CPC, nem qualquer métrica de comparação** até que exista (em uma Sprint futura) um caminho de execução. Ou seja: mesmo se as Etapas 3-4 produzissem 100% de candidatos cross-merchant verdadeiros, o CPC não se moveria sozinho — precisaria também de um executor de merge, que não existe hoje. Isso não muda a conclusão desta Sprint (ver `PRODUCT_IDENTITY_DECISION_REPORT.md`), mas é um pré-requisito que qualquer evolução de Sprint 2.8 vai encontrar.

## Resumo dos pontos de descarte

| Etapa | O que descarta | É logado? |
|---|---|---|
| 1. Bootstrap | Nada é descartado — mas dados podem ficar congelados/stale | N/A |
| 3. Engine.evaluate | Todo candidato exceto o vencedor | **Não** |
| 3. Gate categoria/brand | Score capado a 40 se `categoryId` diverge | Sim, via `penalties[]` — mas só para o vencedor |
| 4. suggestMergesFor | Vencedor com confiança < 70 | **Não** |
| 4. suggestMergesFor | Par já sugerido antes | Não (silencioso, comportamento correto/idempotente) |
