# RELEASE_1_7_WAVE_3_EXECUTION_PLAN.md
# Plano de Execução Técnica — Wave 3: Product Identity Engine (Shadow Mode)

**Versão**: 1.1
**Criado**: 2026-07-01 · **Revisado**: 2026-07-01 (CTO review pós-implementação — explainability completa no Match Log, ver decisão #10)
**Status**: Entregue e certificado
**Referência**: `docs/product/releases/RELEASE_1_7_BLUEPRINT.md` (Capítulo 4 — Waves; Capítulo 8 — Product Identity Core Asset)
**Arquitetura base**: Release 1.7 — Epic 1 — `docs/product/releases/RELEASE_1_7_EXECUTION_PLAN.md`

---

## Premissa

Este documento detalha a execução técnica da Wave 3. Waves 4–5 serão detalhadas em documentos equivalentes quando sua vez chegar no ciclo faseado descrito no Blueprint.

## Aprovação do CTO (pré-implementação)

O CTO aprovou, antes de qualquer código desta Wave, duas decisões arquiteturais permanentes:

1. **Postura conservadora**: falso positivo (unir dois produtos diferentes) é inaceitável; falso negativo (deixar um duplicado sem unir) é aceitável e corrigível depois. Precisão prioriza sobre cobertura, permanentemente.
2. **Shadow Mode**: o motor executa o matching completo e registra candidato, sugestão, confidence, fatores e decisão sugerida — mas não altera nada no catálogo real nesta Wave.

## Decisões numeradas

1. **Product Identity é um domínio independente, não uma extensão de `connectors/`.** `src/domains/product-identity/` tem seu próprio repositório de leitura de candidatos (`IProductCandidateRepository`), em vez de estender `ICatalogRepository` (que existe para o caminho de ingestão/escrita). Isso mantém o domínio reutilizável por futuros consumidores (busca, comparação, recomendações) sem depender de `connectors/` — mais estrito do que o desenho original do Blueprint (que cogitava expor isso via `ICatalogRepository`), e mais alinhado à regra de convergência do Capítulo 8.
2. **Sem novo `TrustEventType` nesta Wave.** Nenhum merge acontece de verdade — não há o que o Brain ingerir ainda. A trilha de auditoria (`product_identity_match_log`, com `factors`/`confidence`/`suggested_decision`) é, ela mesma, a preparação "pronta para o Brain" exigida pelo Quality Gate da aprovação do CTO. Emissão de eventos reais de merge fica para a Wave 5, mesma disciplina de "nenhum evento antes da capacidade existir" usada em toda Epic/Wave anterior.
3. **Sem UI administrativa nesta Wave** (confirmado com o CTO). Inspeção dos resultados do Shadow Mode via Supabase SQL Editor, mesmo padrão usado para `connector_sync_runs` antes do Ecosystem Monitor existir. Um painel dedicado fica para uma Wave futura, uma vez validado o algoritmo com dados reais.
4. **Motor determinístico, sem ML/embeddings.** Score por fatores nomeados e explicáveis (marca, categoria, similaridade de nome via Jaccard de tokens, sobreposição de especificações, tokens de modelo/capacidade alfanuméricos) — nunca um número opaco. A arquitetura (interfaces por trás de `ProductIdentityEngine`) permite evoluir para embeddings/IA no futuro sem refatoração, mas nada disso é implementado agora.
5. **Gates de marca e categoria**: um item só pode atingir os tiers `probable`/`auto` se marca E categoria baterem exatamente; caso contrário a confidence é limitada a 40 (bem abaixo do menor tier mergeable, 70) — é o mecanismo estrutural, não apenas documental, que impõe "falso positivo inaceitável".
6. **Shadow Mode só avalia itens classificados `"new"` pelo `DeduplicationStage`.** Itens `"update"`/`"skip"` já corresponderam a um produto existente por slug exato — a identidade já está resolvida; rodar o motor fuzzy neles seria redundante.
7. **Change Detection (fixes o gap do Epic 1) é ortogonal ao matching fuzzy.** `DeduplicationStage` agora compara preço, estoque (`in_stock`/`stock_quantity`), descrição e imagem — mas continua no caminho de slug exato, sem nenhuma dependência do motor de Product Identity.
8. **Correção de `price_history` para ofertas novas** (fixes outro gap do Epic 1): `CatalogWriteStage` agora grava uma linha de histórico também no caminho `"new"`, não só no `"update"` — todo produto acumula patrimônio temporal desde a primeira sincronização.
9. **`ProductIdentityShadowStage` nunca lança exceção que afete o pipeline real.** Dupla camada de proteção: `ProductIdentityService.evaluateAndLog()` já captura e loga qualquer erro internamente (convenção fire-and-forget do `insertPriceHistory`); o próprio stage também envolve a chamada em `try/catch`, registrando via `recordError()` sem tocar `ctx.deduplicated`/`ctx.persisted`. Essa é a garantia estrutural (não apenas documental) do Shadow Mode.
10. **Explainability completa no Match Log** (CTO review pós-implementação, antes do commit da Wave). `MatchResult`/`MatchLogEntry` ganharam 5 campos novos: `algorithmVersion` (constante `PRODUCT_IDENTITY_ALGORITHM_VERSION`, hoje `"1.0.0"`), `matchedAttributes`/`mismatchedAttributes` (derivados de `factors`, um por atributo avaliado), `penalties` (todo ponto NÃO concedido rastreado — o gap entre o peso máximo de um fator e o peso realmente obtido, mais uma entrada `brand-category-gate` quando o gate de marca/categoria limita a confidence a 40), `explainabilityReason` (frase sintetizada legível por humano/Brain). `confidence`/`suggestedDecision` do `MatchResult` mantidos com esses nomes (usados internamente pelo motor e por todos os testes já existentes); no `MatchLogEntry` (fronteira de persistência) são renomeados para `confidenceScore`/`finalDecision`, e a coluna `factors` (jsonb) foi substituída por `matched_attributes`/`mismatched_attributes`/`penalties` — mais explícito para consumo futuro pelo Brain do que reconstituir isso a partir de `factors` bruto. `IProductIdentityMatchLogRepository` não tem (e nunca terá) um método de update — reforça por código, não só por convenção, que uma avaliação histórica nunca é recalculada em lugar: toda evolução do algoritmo deve incrementar `algorithm_version` e produzir novas linhas.

## Verificação / Quality Gate

`npm run lint` (0) · `npx tsc --noEmit` (0) · `npm test` (213/213, suíte completa — 11 novos testes: `ProductIdentityEngine` ×5, `ProductIdentityService` ×3, `DeduplicationStage` ×3 change-detection) · `npm run build` (138 rotas — nenhuma rota nova, conforme decisão #3). Re-verificado após a decisão #10 (explainability): lint 0, typecheck 0, 213/213, build OK — nenhum teste novo adicional, os 8 testes de `product-identity` existentes foram estendidos com asserções para os novos campos.

**Migration `0024` requer aplicação manual pelo CTO no Supabase SQL Editor** antes que o Shadow Mode grave dados reais — sem ela, `SupabaseProductIdentityMatchLogRepository.record()` degrada graciosamente (loga erro, não lança), mesma convenção de toda migration anterior deste Release.

**Deferido explicitamente para Waves futuras**: UI/API de inspeção do shadow log; emissão de eventos Brain para merges reais (Wave 5); qualquer promoção de sugestões do Shadow Mode para merges automáticos (fora de escopo do Release 1.7 até novo aprovação do CTO); embeddings/IA no motor de matching.
