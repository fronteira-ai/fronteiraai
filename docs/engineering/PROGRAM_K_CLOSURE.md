# PROGRAM_K_CLOSURE.md
# Program Κ (Kappa) — Closure Audit — Missions Κ-4 e Κ-5

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-16 (Κ-4)
**Atualizado**: 2026-07-16 (Κ-5 — Program Κ Final Closure). Κ-5 reexecutou a auditoria dos 2 itens remanescentes que Κ-4 havia deixado em aberto (Brand Normalization, `ATTRIBUTE_DICTIONARY`) com medição real, e corrigiu um erro real da própria auditoria de Κ-4 (ver §ATTRIBUTE_DICTIONARY).
**Ver também**: `docs/engineering/PRODUCT_IDENTITY_INTEGRATION.md`, `docs/engineering/PRODUCT_IDENTITY_PIPELINE.md`, `docs/engineering/PROGRAM_K_FINAL_REPORT.md`.

---

## Componentes de Program Κ e seu estado final

| Componente | Mission | Estado |
|---|---|---|
| Universal Taxonomy (`src/domains/taxonomy/data/universal-tree.ts`) | Κ-2 | **Conectado** (Κ-4) — único consumidor real de produção: `CanonicalMergeSuggestionService` |
| Alias Engine (`realCategorySlugs[]` + `findNodeByRealCategorySlug`) | Κ-2 | **Conectado** (mesma wiring acima) |
| Model Normalization (`normalizeAppleModelToken`, `KNOWN_MODEL_ALIASES`) | Κ-2 | **Conectado** (transitivamente, via Product Signature, Κ-4) |
| Product Intelligence Layer / Product Signature (`buildProductSignature`) | Κ-3 | **Conectado** (Κ-4) — único consumidor real: `CanonicalMergeSuggestionService` |
| Attribute Extraction (`attribute-key-aliases.ts`, `value-normalizers.ts`, `manufacturer-code-extractor.ts`) | Κ-3 | **Conectado** (transitivamente, Κ-4) |
| `ProductIdentityEngine` (não é output de Κ) | — | Em produção, recebendo dado normalizado — **arquivo inalterado** desde antes de Κ |
| Brand Normalization (`normalizeBrandName`) | Κ-2 | **Decisão final (Κ-5): mantida, deliberadamente não wired** — ver §Brand Normalization |
| `KNOWN_BRAND_DUPLICATES` | Κ-2 | **Removido (Κ-5)** — provado redundante, ver §Brand Normalization |
| `ATTRIBUTE_DICTIONARY` | Κ-2 | **Mantido como código (Κ-5)** — consumidor real confirmado, ver §ATTRIBUTE_DICTIONARY |
| `MapConfidence` (tipo) | Κ-2 | **Removido (Κ-5)** — zero consumidores de qualquer tipo |

## ATTRIBUTE_DICTIONARY — auditoria final e autocorreção

**Objetivo 1 (Κ-5) respondido com evidência**: quem deveria consumir? Qualquer extração futura de atributo estruturado, conforme seu próprio comentário original. Existe necessidade real? **Sim** — confirmado, não presumido: `scripts/kappa2-taxonomy-backfill.ts` importa `ATTRIBUTE_DICTIONARY` de `src/domains/taxonomy` (o índice público do domínio, não um caminho relativo interno) para popular a tabela `attribute_dictionary` quando a migration `20260715140000_universal_taxonomy.sql` for aplicada e autorizada. Duplica alguma responsabilidade? Não — `product-intelligence/extraction/attribute-key-aliases.ts` mapeia chave-bruta→chave-oficial (a entrada), `ATTRIBUTE_DICTIONARY` documenta a chave-oficial→rótulo humano (a saída); conjuntos de chaves quase idênticos (11 de 13 coincidem exatamente), sem sobreposição de responsabilidade. Agrega valor real? Sim, para o consumidor real identificado. Está obsoleto? Não.

**Correção de processo, registrada por transparência**: a primeira passada desta auditoria (ainda dentro de Κ-5, antes da decisão final) buscou consumidores só em `src/` e concluiu erroneamente "zero consumidores" — chegou a apagar o arquivo TS e sua exportação pública. Uma segunda verificação, obrigatória antes de qualquer remoção de código real (Objetivo 7: "nunca deixar infraestrutura sem propósito" exige primeiro confirmar que de fato não há propósito), buscou em `scripts/` e encontrou o consumidor real acima. A remoção foi revertida antes de qualquer commit. Este é exatamente o tipo de erro que uma auditoria "com evidências, nunca opinião" deveria capturar — registrado aqui, não escondido.

**Objetivo 2 (Κ-5) — decisão final**: nenhuma das 3 opções (A/B/C) descreve o estado real encontrado — não é "integrar ao pipeline" (já tem um consumidor real, só bloqueado pela mesma autorização de migration que todo o resto do backfill de Κ-2), não é "só documentação" (perderia seu consumidor real), não é "remover" (quebraria um script real e correto). **Decisão: manter como está — código real, consumidor real, bloqueado pela mesma dependência de autorização que toda a ferramentação de backfill de Κ-2.** A documentação (`ATTRIBUTE_DICTIONARY.md`) foi corrigida para 13 entradas (estava desatualizada em 10 — a própria divergência entre doc e código foi descoberta durante esta auditoria, evidência adicional de por que um único arquivo TS como fonte de verdade, consultado por doc E por script, é a escolha correta).

## Brand Normalization — remedição real (Objetivo 3)

Reexecutada com medição real, não opinião, cobrindo as 852 linhas reais de `brands`:

| Métrica | Valor real medido |
|---|---:|
| Grupos de duplicata (função `normalizeBrandName` sozinha, sem lista hardcoded) | 2 |
| Grupos de duplicata (`KNOWN_BRAND_DUPLICATES`, lista hardcoded) | 2 — **idênticos aos 2 acima** |
| `canonical_products` envolvidos nos 2 grupos | 28 (de 17.991 ativos = 0,16%) |
| Merge candidates (≥70%) SE o gate de marca fosse normalizado, isolado | 3 (1 no grupo Meta Quest, 2 no grupo Rayban-Meta) |
| Desses 3, quantos são **cross-merchant** | **0** |

**Achado que muda a decisão de Κ-2**: `KNOWN_BRAND_DUPLICATES` foi originalmente escrito com o comentário "exceções reais que a função sozinha NÃO already collapsa" — a remedição prova isso **falso**: `normalizeBrandName()` sozinha já colapsa os 2 grupos reais, sem precisar da lista. O próprio teste da lista (`collapses the 2 real duplicate groups`) já provava isso, só ninguém tinha comparado o resultado com/sem a lista antes.

**Objetivo 4 (Κ-5) — decisão final**: nem "remover" (função correta, testada, custo zero, útil se o catálogo crescer com mais variação real de nome de marca), nem "integrar agora" (impacto real medido: **0 candidatos cross-merchant**, não move Comparable Coverage). **Decisão: permanece preparada para expansão futura — `normalizeBrandName` mantida e exportada, `KNOWN_BRAND_DUPLICATES` removida** (provada redundante, não apenas "sem consumidor externo" — seu próprio teste a desmentia).

## Dead Code Audit (Objetivo 5) — lista exata

| Item | Tipo | Veredito | Ação |
|---|---|---|---|
| `KNOWN_BRAND_DUPLICATES` | constante | Consumidor (próprio teste) provava a constante redundante | **Removida** |
| `BrandDuplicateGroup` | tipo | Único uso era o tipo da constante acima | **Removido** |
| `MapConfidence` | tipo | Zero consumidores de qualquer tipo, incluindo testes | **Removido** |
| `ATTRIBUTE_DICTIONARY` | constante | Consumidor real (`kappa2-taxonomy-backfill.ts`), bloqueado por autorização pendente | **Mantida** |
| `AttributeDictionaryEntry` | tipo | Tipo da constante acima | **Mantido** |
| `flattenTree` | função | 2 scripts + teste próprio + uso interno (`findNodeByRealCategorySlug`) | **Mantida**, não é dead code |
| `KNOWN_MODEL_ALIASES` | constante | Único consumidor é seu próprio teste de regressão — não provado redundante (ao contrário de `KNOWN_BRAND_DUPLICATES`) | **Mantida** — consumidor real (teste), sem evidência de redundância |
| `normalizeBrandName` | função | Nenhum consumidor de produção hoje | **Mantida** — ver §Brand Normalization (decisão explícita, não omissão) |

Nenhum outro arquivo/serviço/classe/função/tipo/pipeline/adapter/repository/extractor/normalizer de Program Κ (`taxonomy/`, `product-intelligence/`) ficou sem consumidor real após esta auditoria.

## Pipeline Closure (Objetivo 6)

Reexecutado o mesmo diagrama de `PRODUCT_IDENTITY_PIPELINE.md` (Κ-4) — nenhuma mudança de estágio nesta Mission (Κ-5 não altera `CanonicalMergeSuggestionService`, `ProductIdentityEngine`, ou o Merge Engine). Confirmações:

- **Etapa morta?** Não. Todo estágio (Canonical → Universal Taxonomy → Product Signature → Product Identity → Merge Candidates → Merge Queue → Merge Executor) tem consumidor real de produção.
- **Caminho duplicado?** Sim, o mesmo já documentado em Κ-4: `ProductIdentityShadowStage` (avaliação em tempo de sync, log-only) permanece paralelo a `CanonicalMergeSuggestionService`, não wired à Universal Taxonomy/Product Signature. Não gera `merge_candidates`, não afeta Comparable Coverage — reafirmado como dívida técnica nomeada, deliberadamente fora do escopo desta Mission (o brief da Mission restringe a decisão a exatamente 2 itens: `ATTRIBUTE_DICTIONARY` e Brand Normalization).
- **Componente órfão?** Não, após a Architecture Cleanup desta Mission (§Dead Code Audit acima).

## Architecture Cleanup (Objetivo 7) — o que foi de fato alterado

1. `src/domains/taxonomy/data/brand-normalization.ts` — `KNOWN_BRAND_DUPLICATES` removida, comentário corrigido (não afirma mais que a lista captura casos que a função não captura).
2. `src/domains/taxonomy/types/taxonomy.types.ts` — `BrandDuplicateGroup` e `MapConfidence` removidos.
3. `src/domains/taxonomy/index.ts` — `KNOWN_BRAND_DUPLICATES` removida da exportação pública; `ATTRIBUTE_DICTIONARY` permanece.
4. `src/domains/taxonomy/__tests__/brand-normalization.test.ts` — teste de regressão reescrito com os 2 pares literais (mesma cobertura, sem depender da constante removida).
5. `docs/engineering/ATTRIBUTE_DICTIONARY.md` — corrigido de 10 para 13 entradas; documentado o consumidor real e seu status bloqueado.

Nenhuma migration criada ou alterada. Nenhum algoritmo/peso/threshold/score alterado. `ProductIdentityEngine.ts`, `MergeExecutorService.ts`, `MergeAuditService.ts`, `OpportunityEngine.ts`, e qualquer arquivo de `buyer-intelligence/`/`exchange/` — intocados.

## Program Κ está oficialmente encerrado?

Ver `PROGRAM_K_FINAL_REPORT.md` §Executive Recommendation para a resposta formal e o veredito final.
