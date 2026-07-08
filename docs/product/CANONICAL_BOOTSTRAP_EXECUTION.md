# CANONICAL_BOOTSTRAP_EXECUTION.md
# PROGRAM Δ — Mission Ω-4.1 — Registro de Execução

**Categoria**: `docs/product/` (companion de Program Ω)
**Data**: 2026-07-08
**Autorização**: CTO, explicitamente, nesta missão (Ω-4.1) — precedida de dry-run obrigatório (`AI_CONSTITUTION.md` Regra Permanente #3: "Dados de produção não são alterados sem dry-run anterior")

---

## 1. Auditoria do pipeline (pré-execução)

Antes de qualquer escrita, o pipeline completo foi lido e verificado, arquivo por arquivo:

- **`scripts/canonical-catalog-bootstrap.ts`** — orquestrador. Confirmado: dry-run por padrão, `--execute` explícito necessário para escrever; idempotente (verifica `findBySlug` antes de criar); nunca toca `products`, `price_history`, `stores`, `brands`, `categories`, `connectors`.
- **`lib/canonical-catalog-factory.ts`** — composição de serviços, nenhuma lógica própria.
- **`CanonicalProductService.bootstrapFromProduct`** — delega a `repo.findOrCreateBySlug`, um espelhamento 1:1 sem união (mesmo texto da migration original, Release 1.7 Wave 4).
- **`SupabaseCanonicalCatalogRepository.findOrCreateBySlug`** — confirmado idempotente inclusive sob concorrência (lê de volta em caso de violação de unicidade em vez de falhar).
- **`SupabaseCanonicalCatalogRepository.linkOffer`** — um único `UPDATE offers SET canonical_product_id = ... WHERE id = ...`. Nenhum outro campo tocado.
- **`CanonicalMergeSuggestionService.suggestMergesFor`** — compara um canonical product contra outros da mesma marca; escreve no máximo 1 `MergeCandidate` com `status='pending'` por par; nunca funde, nunca escreve em `offers`/`products`/`canonical_products`. Shadow Mode preservado por construção, não por convenção.

**Nenhuma linha de código foi alterada** nesta auditoria ou na execução — restrição confirmada como respeitada.

## 2. Validação de pré-requisitos

- [x] Modo dry-run existe e é o padrão (`EXECUTE = process.argv.includes("--execute")`, ausente por padrão)
- [x] Conexão com produção disponível e autorizada explicitamente pelo CTO nesta sessão
- [x] `getServiceClient()` usa `SUPABASE_SERVICE_ROLE_KEY` (contexto de servidor, nunca exposto ao cliente — consistente com `AI_CONSTITUTION.md` Regra #2)
- [x] Baseline "antes" já existente e fresco (`KPI_BASELINE.md`, mesmo dia) — comparação Before/After não depende de memória, depende de dois pontos medidos

## 3. Execução — dry-run (validação, sem escrita)

Comando: `npm run canonical-catalog:bootstrap`

Resultado: 650 produtos processados, 0 falhas, 614 candidatos a criação identificados, 36 já existentes confirmados (batendo exatamente com `KPI_BASELINE.md`). Nenhuma escrita ocorreu — confirmado pelo próprio log do script ("No writes (dry-run)").

**Decisão tomada com base no dry-run**: prosseguir para execução real. Critério: zero falhas em 650/650 produtos, nenhum erro de conectividade/permissão, número de "a criar" consistente com a baseline já medida.

## 4. Execução — real (escrita autorizada)

Comando: `npm run canonical-catalog:bootstrap:execute`

Resultado (log literal do script):
```
Mode: EXECUTE
Products processed    : 650
Canonical created     : 614
Canonical pre-existed : 36
Offers linked         : 614
Merge suggestion runs : 650
Failed                : 0
Data written to Supabase.
```

Zero falhas em 650/650 produtos processados.

## 5. Medição pós-execução

Reexecução da mesma query read-only usada em Ω-4.0 (`database/health_checks/marketplace_density.sql`, equivalente). Resultado completo em `BEFORE_AFTER_BASELINE.md`. Toda métrica fora do escopo do bootstrap (produtos, ofertas, marcas, categorias, histórico de preço, lojas, merchants, conectores) confirmada **idêntica** ao valor pré-execução.

## 6. O que esta execução explicitamente NÃO fez

- Não alterou `ProductIdentityEngine`, thresholds de confiança, ou qualquer heurística de matching.
- Não promoveu Product Identity para fora do Shadow Mode — `merge_candidates` permanece uma fila de sugestões nunca aplicadas automaticamente (e, como se constatou, permanece vazia).
- Não alterou schema nem rodou migration — `canonical_products`/`offers.canonical_product_id`/`merge_candidates` já existiam desde a Release 1.7 Wave 4.
- Não tocou nenhum Connector.
- Não implementou Attribute Extraction.
- Não habilitou nenhum merge automático.

## 7. Quality Gates

| Gate | Critério | Resultado |
|---|---|---|
| Cobertura canônica aumentou significativamente | Delta positivo mensurável | ✅ PASS — 5,5% → 100% (+94,5 p.p.) |
| Nenhum dado existente foi corrompido | Toda métrica fora do escopo idêntica antes/depois | ✅ PASS — 12 métricas de controle remedidas, todas idênticas (`BEFORE_AFTER_BASELINE.md`) |
| Nenhuma duplicação foi criada | `canonical_products.total` = `products.total` exato (1:1) | ✅ PASS — 650 = 650, sem excedente |
| Nenhuma regressão foi identificada | Nenhum serviço/domínio fora do canonical-catalog afetado | ✅ PASS — connectors, price_history, stores, merchant_stores, brands, categories todos inalterados |
| Todos os resultados são reproduzíveis | Reexecutar o script produz o mesmo estado (idempotência) | ✅ PASS — `findOrCreateBySlug`/`linkOffer` são idempotentes por design; reexecutar hoje reportaria `Canonical pre-existed: 650, created: 0` |

**Todos os 5 gates passaram. Nenhuma interrupção de progressão foi necessária.**

## 8. Recomendação final (baseada exclusivamente nos dados desta execução)

**Opção A — a cobertura atingiu nível suficiente para seguir para Offer Density.**

Evidência: Canonical Coverage em 100% (650/650 produtos, 653/653 ofertas) remove o teto de valor que `VISION_ALIGNMENT_AUDIT.md`/`STRATEGIC_GAP_MAP.md` já haviam identificado sobre Market Intelligence/Recommendation Engine. O próximo gargalo mensurável, por número, é Offer Density (1,0046 ofertas/produto, inalterado por esta execução, já nomeado como crítico em `KPI_BASELINE.md`) — que é escopo de Program Ω (crescer cobertura real de merchants), não de mais trabalho de canonicalização.

**Sobre a Opção B (ajustar heurísticas)**: não recomendada agora, não porque esteja descartada, mas porque esta execução não produziu evidência suficiente para justificá-la (ver `MERGE_CANDIDATES_REPORT.md` — duas hipóteses concorrentes, nenhuma confirmada). Recomenda-se uma auditoria manual de amostra (baixo custo, sem código) antes de qualquer decisão sobre heurística — não é um bloqueador para avançar para Offer Density, pode rodar em paralelo.

**Sobre a Opção C (ADR para mudança arquitetural)**: não aplicável. Nenhuma mudança de arquitetura foi identificada como necessária por esta execução — o mecanismo já existente funcionou exatamente como desenhado.

## 9. Reversibilidade

A operação é aditiva (INSERT em `canonical_products`, UPDATE de um único campo nullable em `offers`, INSERT condicional em `merge_candidates` — que na prática não inseriu nada). Reversão, se um dia necessária, é possível via `TRUNCATE canonical_products CASCADE` (que também zeraria `offers.canonical_product_id` via `ON DELETE SET NULL`) — não executada, não necessária, apenas registrada aqui como a rota de rollback teórica.
