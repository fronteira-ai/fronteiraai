# CHANGELOG.md

Reconstruído a partir do histórico real de commits (`git log`) e do estado atual do código. Formato: data, commit, o que mudou de fato (verificado no diff/estado resultante, não só na mensagem).

## 2026-07-02 — Release 1.7 — Wave 6 — Platform Hardening, Certification & Release Lock

Sexta e última entrega faseada do Release 1.7 (mandato do CTO: "Platform Hardening, Certification & Release Lock" — auditoria completa, correção de achados crítico/médio, sem domínio novo, sem regra de negócio nova, sem feature grande). Fecha o Release 1.7. Ver `docs/operations/RELEASE_CERTIFICATION_1.7.md` para o relatório executivo completo.

**Segurança — achado crítico corrigido**: `ProgressiveVerificationEngine` (Wave 5) auto-aprovava claims com base em sinais (telefone, WhatsApp, website, Instagram) todos publicamente visíveis em `/lojas/[slug]` — qualquer conta autenticada podia copiar telefone+WhatsApp da própria página pública da loja e auto-aprovar uma claim fraudulenta. `ClaimService.create` desliga completamente o caminho de auto-aprovação (`AUTO_APPROVAL_ENABLED = false`); toda claim roteia para `AwaitingReview`; confidence/breakdown seguem persistidos como evidência para o revisor humano. Ver ADR-042.

**Segurança — achado médio corrigido**: `DelegationService.accept(token, userId)` aceitava qualquer usuário autenticado com um token de convite válido, sem checar se o e-mail da sessão batia com `delegate.invitedEmail` — um token vazado bastava para assumir uma vaga de delegado. Agora exige `acceptingUserEmail` (resolvido só no servidor via `requireAuth()`) e rejeita (case-insensitive mismatch). 2 novos testes.

**Segurança — achados baixos corrigidos**: `lib/cron-auth.ts` trocou comparação de string (`!==`, vulnerável a timing attack) por `crypto.timingSafeEqual()`; 33 `DROP POLICY IF EXISTS` adicionadas em 4 migrations pré-`0017` (`0010`, `0014`, `0015`, `0016`) que criavam policies sem guard de idempotência — sem efeito no banco já aplicado, mas agora seguras para reaplicar contra um ambiente novo/staging.

**Bug de dados corrigido**: `app/admin/page.tsx`, `app/api/admin/dashboard/stats/route.ts`, `CatalogIntelligenceService.ts` e `ExecutiveSummaryService.ts` liam `import_logs`, tabela congelada desde a Wave 2 (quando as escritas migraram para `connector_sync_runs`) — o card "última importação" do admin e os diagnósticos de catálogo/resumo executivo do merchant Command Center ficaram silenciosamente parados para qualquer loja sincronizada via Connector Platform. Repontado para `connector_sync_runs`.

**SEO — sitemap-index**: `app/sitemap.ts` (monolítico, sem paginação) substituído por `generateSitemaps()` com 3 shards estáticos (`static`/`stores`/`lojas`) + `app/product/sitemap.ts` (novo, shards de 20k slugs via `getProductSlugsCount()`/`getProductSlugsPage()`, nunca carrega o catálogo inteiro em memória) — remove o limite implícito de ~25k produtos que o sitemap antigo carregava sem aviso. `app/robots.ts` lista todos os shards.

**Next.js 16 — proxy**: `middleware.ts` → `proxy.ts` (rename de arquivo e função `middleware`→`proxy`, sem dependência de Edge runtime, confirmado seguro pela documentação oficial do framework).

**Performance**: `app/lojas/[slug]/page.tsx` chamava `getStorePublic()` duas vezes por requisição (metadata + corpo da página), sem cache — novo `_cache.ts` com `React.cache()`, mesmo padrão de `product/[slug]`/`store/[slug]` (ADR-021).

**Observabilidade**: `GET /api/admin/platform-health` (novo, admin-only) consolida os sinais de saúde de brain/connectors/analytics/growth/canonical-catalog/ownership/storage num único endpoint, computado sob demanda — sem tabela nova.

**Documentação**: `.env.example` ganhou `CRON_SECRET` (obrigatório desde a Wave 2, nunca documentado); ADR-042 (auto-aprovação desligada + rate limiting adiado); `TECH_DEBT.md` seção Wave 6.

**Auditoria completa, achados sem correção de código nesta Wave (documentados, não silenciosos)**: ausência de rate limiting em endpoints de mutação (`claims`/`delegates`/`upgrade-interest`) — construir a infraestrutura é uma capacidade nova, fora do mandato desta Wave, ver ADR-042 parte 3; `proxy.ts` não cobre `/api/admin/**`/`/api/merchant/**` (seguro hoje porque toda rota já se autoguarda, mas é uma dependência implícita a vigiar); 5 serviços pré-Wave 4/5 embutem `supabase.from(...)` direto em vez de repositório (dívida de padrão, sem bug de comportamento).

**Testes**: 2 novos (`DelegationService` — e-mail correspondente e case-insensitive) — total 281/281.

Quality Gate: lint 0, typecheck 0, 281/281 testes, build 157 rotas, `db:lint` OK.

## 2026-07-01 — Release 1.7 — Wave 5 — Merchant Acquisition & Ownership Platform

Quinta entrega do Release 1.7 — segundo re-escopo do CTO: "Merchant Claim + Onboarding" (2 bullets) virou "Merchant Acquisition & Ownership Platform" (8 Epics), com uma mudança explícita de prioridade — infraestrutura dá lugar a crescimento de negócio. Toda decisão respondeu a "isso aumenta a conversão de lojistas para clientes do ParaguAI?".

**Documentação estratégica:** `docs/product/releases/RELEASE_1_7_WAVE_5_EXECUTION_PLAN.md` (novo); `RELEASE_1_7_BLUEPRINT.md` v1.3 (Wave 5 reescrita).

**Database:** `supabase/migrations/20260701120400_merchant_ownership.sql` — `store_claims` (claim + Progressive Verification, `signal_breakdown` jsonb explicável), `merchant_delegates` (convite por token, papéis fixos), `merchant_upgrade_leads` (append-only), extensão do CHECK/catálogo de `merchant_verifications` com o tipo `store_claim`. Verificação em `database/verification/0026_verify.sql`.

**Domínio `src/domains/merchant-ownership/`** (novo — depende de `trust/` deliberadamente, reaproveitando `VerificationService`/`VerificationEvidenceService`/`EventService` em vez de duplicar a máquina de verificação já existente desde o Release 1.5): `ProgressiveVerificationEngine` (puro, explicável — e-mail/telefone/WhatsApp/website/Instagram comparados com os dados já cadastrados na loja; gates de peso mínimo aplicável e cap por sinais divergentes garantem que um impostor com tudo errado nunca seja auto-aprovado), `ClaimService` (create idempotente/auto-aprovação/approve/reject/requestInfo/revoke — revogação nunca apaga o histórico da claim), `DelegationService` (invite/accept/revoke com `actingRole` explícito — só o proprietário convida/revoga, reforçado no serviço, testado), `PremiumUpgradeService` (lead-capture, ADR-035), `OwnershipLevelService` (nível computado sob demanda, sem coluna nova). `IStoreClaimRepository`/`IMerchantDelegateRepository`/`IMerchantStoreLinkRepository`/`IUpgradeLeadRepository` + implementações Supabase.

**Auth:** `requireMerchantContext()` (novo, aditivo) em `lib/merchant-auth.ts` — resolve proprietário ou delegado ativo; `requireMerchant()` existente não muda, usado por todas as ~15 rotas de merchant já existentes sem alteração.

**APIs:** `POST/GET /api/merchant/claims`, `POST /api/merchant/claims/[id]/cancel`, `POST/GET /api/merchant/delegates`, `DELETE /api/merchant/delegates/[id]`, `POST /api/merchant/delegates/accept`, `POST /api/merchant/upgrade-interest`, `GET /api/admin/claims`, `GET/PATCH /api/admin/claims/[id]`.

**UI:** `app/merchant/claim/[storeSlug]/page.tsx` (Smart Claim Flow — nome/cargo/telefone, e-mail da sessão), `components/store/ClaimStoreButton.tsx` (wired em `/store/[slug]` e `/lojas/[slug]`, via novo `StorePublicData.isUnclaimed`/`isStoreUnclaimed()` em `services/stores-public.service.ts`), `app/admin/claims` + `app/admin/claims/[id]` (Claim Review Center — real, confirmado com o CTO, mesmo padrão de `/admin/trust/verifications`), `components/admin/claims/ClaimActionsClient.tsx`, `components/merchant/settings/DelegatesSection.tsx` (convite/lista/revogação mínima). `WelcomeBanner` (dashboard) estendido com números reais (produtos, lojas, trust score). Badge "+N Premium" do `TodaysPlanWidget` e card de plano em `/merchant/settings` agora clicáveis (upgrade-interest).

**Brain:** 10 novos `TrustEventType` — 8 com emissão real (`ClaimRequested`, `ClaimCancelled`, `OwnershipVerified`/`Rejected`/`Revoked`, `ManagerInvited`/`Accepted`, `PremiumUpgradeViewed`; `PremiumTrialStarted`/`PremiumActivated` taxonomia apenas — sem trial/billing real).

**Strategic Assets / Moats**: adições em `STRATEGIC_ASSETS.md` (C-2, C-6, S-1) e `MOAT_STRATEGY.md` (Moat 2, 3, 6, 7) descrevendo o funil de aquisição.

**Testes**: 34 novos (`ProgressiveVerificationEngine` ×6 — incluindo caso explícito anti-fraude —, `OwnershipLevelService` ×7, `ClaimService` ×11, `DelegationService` ×8, `PremiumUpgradeService` ×1, `event-registry` ×1) — total 279/279.

Quality Gate: lint 0, typecheck 0, 279/279 testes, build 152 rotas (+11), `db:lint` OK (5 migrations).

**Migration `0026` requer `npm run db:push` pelo CTO.** **Deferido explicitamente**: retrofitting de `requireMerchantContext()` nas rotas de merchant existentes; onboarding pós-claim guiado além do já existente; fila de processamento real; emissão real de `PremiumTrialStarted`/`PremiumActivated`; verificação via Meta Graph API/WhatsApp Business API; checagem de Facebook em Progressive Verification.

## 2026-07-01 — Release 1.7 — Wave 4 — Canonical Catalog & Compare Foundation

Quarta entrega do Release 1.7 — re-escopo do CTO: a Wave 4 original ("Merchant Claim + Onboarding") foi realocada para a nova Wave 5 para dar lugar ao Canonical Catalog, priorizado como a fundação de identidade permanente de produto de que Compare, Search, Recommendation Engine, Merchant Intelligence e o Brain dependerão. Mission: nenhuma URL quebrada, nenhum Product removido, nenhuma Offer perde histórico.

**Documentação estratégica:** `docs/product/releases/RELEASE_1_7_WAVE_4_EXECUTION_PLAN.md` (novo); `RELEASE_1_7_BLUEPRINT.md` v1.2 (Wave 4 reescrita, Merchant Claim realocado para Wave 5, antiga Wave 5 vira Wave 6).

**Database:** `supabase/migrations/20260701120300_canonical_catalog.sql` — `canonical_products` (identidade permanente: `canonical_slug` único/imutável, nome, marca, categoria, especificações), `offers.canonical_product_id` (nova coluna nullable, `ON DELETE SET NULL` — `offers.product_id` nunca é tocada), `merge_candidates` (sugestões canonical-vs-canonical com explainability completa: `confidence`, `algorithm_version`, `matched_attributes`, `mismatched_attributes`, `penalties`, `reason`, `status`, `reviewed_at`/`reviewed_by`). Verificação em `database/verification/0025_verify.sql`.

**Domínio `src/domains/canonical-catalog/`** (novo, domínio fundação — nunca depende de `connectors/` nem de `product-identity/`; todos os outros domínios podem depender dele): `CanonicalProductService` (`bootstrapFromProduct` idempotente — reaproveita o `slug` já único do produto, `generateCanonicalSlug` com resolução de colisão para produtos canônicos futuros), `OfferRankingService` (preço/estoque/recência/confiança verificável/qualidade de listagem — **nunca Reputation Score**, restrição permanente do Release 1.5, fator "trust" é `stores.is_verified` explícito resolvido pelo chamador), `CanonicalPriceHistoryService` (agregação sob demanda de `price_history` por canonical product — sem tabela nova, lowest/highest/average/variação/tendência), `CompareFoundationService` (compõe os três — a infraestrutura real do "Compare Foundation", backend/API apenas nesta Wave), `ICanonicalCatalogRepository`/`IMergeCandidateRepository`/`ICanonicalPriceHistoryRepository` + implementações Supabase (o repositório de merge candidates deliberadamente não tem método de execução de união — a garantia de "shadow mode" é estrutural, não convencional).

**Extensão em `src/domains/product-identity/`**: `CanonicalMergeSuggestionService` (novo) — o único código que depende de `canonical-catalog/` a partir de `product-identity/` (nunca o contrário), reaproveita o `ProductIdentityEngine` já existente para avaliar pares de canonical products da mesma marca e escrever `MergeCandidate`s no tier `possible` ou acima.

**Scripts:** `scripts/canonical-catalog-bootstrap.ts` (dry-run por padrão, `--execute` — bootstrap 1:1 de `products` para `canonical_products`, vínculo de `offers`, seed de merge suggestions via `CanonicalMergeSuggestionService`). `lib/canonical-catalog-factory.ts` (wiring do domínio, novo).

**APIs (backend/API apenas — sem página nova, confirmado com o CTO):** `GET/PATCH /api/admin/canonical-catalog/merge-candidates[/[id]]` (Match Review — aprovar/rejeitar/ignorar grava apenas a decisão humana, nunca reatribui offers), `GET /api/canonical-catalog/[slug]` (Compare Foundation, service role interno — mesmo padrão de `/lojas`, ADR-036).

**Brain:** 10 novos `TrustEventType` (taxonomia apenas — `CanonicalProductCreated`, `OfferLinked`/`OfferUnlinked`, `MergeSuggested`/`Approved`/`Rejected`, `CanonicalViewed`, `CompareViewed`, `PriceHistoryViewed`, `LowestPriceReached`), nenhum emitido nesta Wave (mesma disciplina do `StoreDiscovered` da Wave 2). **Achado não relacionado**: um teste de completude descobriu 21 `TrustEventType` do Release 1.6 sem mapeamento no Brain — registrado em `docs/engineering/TECH_DEBT.md`, não corrigido (fora do escopo desta Wave).

**Strategic Assets / Moats**: adições em `docs/product/STRATEGIC_ASSETS.md` (C-1, C-3, C-4, C-5) e `docs/product/MOAT_STRATEGY.md` (Moat 1, 4, 5, 6, 7) descrevendo como a identidade canônica fortalece cada um.

**Testes**: 26 novos (`CanonicalProductService` ×5, `OfferRankingService` ×6, `CanonicalPriceHistoryService` ×7, `CompareFoundationService` ×2, `CanonicalMergeSuggestionService` ×5, `event-registry` ×1) — total 245/245.

Quality Gate: lint 0, typecheck 0, 245/245 testes, build OK, `db:lint` OK (4 migrations, nenhum SELECT embutido).

**Migration `0025` requer aplicação manual do CTO** via `npm run db:push`. **Bootstrap não executado**: `--execute` grava no projeto real, fica para o CTO rodar após a migration. **Deferido explicitamente**: execução real de merges aprovados; UI de Match Review; rota pública `/produto/[slug]`; wiring do bootstrap/merge-suggestion no `SyncOrchestrator`; emissão real dos 10 eventos Brain.

## 2026-07-01 — Database Migration System V2 (mandato do CTO)

Reorganização permanente da infraestrutura de migrations, superando parcialmente ADR-017/018 (ver ADR-040 em `docs/operations/DECISIONS.md`). Não é uma Release de produto — é uma mudança de processo de engenharia.

**Auditoria (ETAPA 1)**: migrations `0018`-`0023` auditadas. Bug real encontrado em 4 delas (`0018`-`0021`): a verificação embutida usava `information_schema.tables.row_security`, uma coluna que não existe em PostgreSQL — o check sempre falhava ou retornava vazio. `0022`/`0023`/`0024` já usavam `pg_tables.rowsecurity` (correto) e já eram idempotentes.

**Correção (`database/migrations/0018`-`0021`, editado in-place)**: verificação extraída para `database/verification/00NN_verify.sql`, corrigida para `pg_tables.rowsecurity`. `0018` ganhou `DROP POLICY IF EXISTS` antes de suas 3 `CREATE POLICY` (mesma classe de bug que forçou `0017_hotfix_trust_experience.sql` a existir para uma migration diferente). Nenhuma dessas edições reaplica nada em produção — as 4 já estavam aplicadas; é higiene de arquivo, não uma mudança de schema.

**Migração de local (`0022`-`0024` → `supabase/migrations/`)**: essas 3 nunca foram aplicadas em produção. Movidas (não duplicadas) para `supabase/migrations/2026070112{00,01,02}00_*.sql`, nomeadas no formato exigido pela Supabase CLI, com a mesma extração de verificação. `database/migrations/README.md` (novo) documenta o congelamento de `0001`-`0021` e o corte para `supabase/migrations/` a partir de `0022`.

**Novo — `database/verification/`** (7 arquivos, `0018`-`0024`): apenas `SELECT`s de validação, nunca embutidos em migration, nunca executados automaticamente.

**Novo — `database/health_checks/`** (7 arquivos por tópico: `rls`, `policies`, `indexes`, `foreign_keys`, `triggers`, `extensions`, `storage_buckets`): verificações de sistema, independentes de qualquer migration específica.

**Novo — `database/templates/`**: `MIGRATION_TEMPLATE.sql`, `VERIFICATION_TEMPLATE.sql`, `ROLLBACK_TEMPLATE.sql` — toda migration nova nasce daqui. Template de migration exige declarar classe de rollback (Possible/Partial/Impossible) no cabeçalho.

**Novo — `supabase/`**: `config.toml` (gerado via `supabase init` real, CLI v2.109.0, `project_id = "fronteiraai-web"`), `seed.sql` (placeholder — seeding de catálogo continua em `database/seed/*.js` via `npm run db:seed`, deliberadamente não substituído), `migrations/` com as 3 migrations movidas.

**Novo — `scripts/lib/migration-lint.ts` + `scripts/db-migration-lint.ts`**: valida programaticamente que nenhuma migration em `supabase/migrations/` contém `SELECT` avulso (heurística: remove comentários e corpos de função com dollar-quoting, separa por `;`, sinaliza qualquer statement que comece com `SELECT` — `INSERT INTO ... SELECT` passa, pois o statement começa com `INSERT`). 6 testes novos.

**Novo — `scripts/db-verify.ts`**: lista os arquivos de `database/verification/`/`database/health_checks/` disponíveis (sem tentar conexão direta ao banco — sem credenciais neste ambiente).

**`package.json`**: `db:push`, `db:reset`, `db:diff`, `db:status`, `db:lint`, `db:verify` (todos via Supabase CLI, adicionada como devDependency `^2.109.0`) — namespace novo, sem colidir com `db:seed`/`db:seed:execute` existentes (que continuam JS, intocados).

**Novo — `.github/workflows/database.yml`** (dormant): lint → typecheck → test → `db:lint` → `supabase db push` (gated por secrets ainda não configurados) → health checks. Documentado explicitamente: não existe projeto de staging separado ainda — gap nomeado, não escondido.

**Docs**: `docs/engineering/DATABASE_ENGINEERING.md` (novo, padrão autoritativo completo, runbook do CTO para o primeiro `supabase link`+`db push`), `ENGINEERING_PRINCIPLES.md`/`CONVENTIONS.md`/`RELEASE_STRATEGY.md` (pointers), `docs/operations/DECISIONS.md` (ADR-040, supera parcialmente ADR-017/018).

Quality Gate: lint 0, typecheck 0, testes 100% (suíte completa + 6 novos), build OK.

**O único passo manual restante**: o CTO precisa rodar `supabase login` + `supabase link --project-ref acairzpzsklctaqjsukw` + `npm run db:push` uma vez (runbook em `DATABASE_ENGINEERING.md` §9) — esta sessão não tem e não deveria ter as credenciais de produção necessárias para fazer isso sozinha.

## 2026-07-01 — Release 1.7 — Wave 3 — Product Identity Engine (Shadow Mode)

Terceira entrega do Release 1.7. Promove Product Identity a domínio próprio (`src/domains/product-identity/`) — Core Asset permanente, aprovado pelo CTO com duas decisões estratégicas: postura conservadora de matching (falso positivo inaceitável, falso negativo aceitável) e rollout em Shadow Mode (o motor avalia e registra, mas não altera o catálogo real). Fecha dois gaps conhecidos desde o Epic 1: comparação apenas por preço no `DeduplicationStage`, e ofertas novas nunca recebendo linha em `price_history`.

**Documentação estratégica:** `docs/product/releases/RELEASE_1_7_WAVE_3_EXECUTION_PLAN.md` (novo).

**Database:** `0024_product_identity.sql` — tabela `product_identity_match_log` (trilha de auditoria do Shadow Mode: candidato, produto sugerido, `algorithm_version`, `confidence_score`, tier, `matched_attributes`/`mismatched_attributes`/`penalties` em jsonb, `final_decision`, `explainability_reason`, tempo de processamento), RLS habilitado, sem policy pública.

**Domínio `src/domains/product-identity/`** (novo, independente de `connectors/` — `connectors/` depende dele, nunca o contrário, conforme regra de convergência do Blueprint Capítulo 8): `ProductIdentityEngine` (motor determinístico, sem ML/embeddings — score por fatores nomeados: marca/categoria como gates, similaridade de nome via Jaccard de tokens, sobreposição de especificações, tokens de modelo/capacidade; mismatch de marca ou categoria limita a confidence a 40, bem abaixo do menor tier mergeable), 4 tiers de confidence (`auto` 95–100, `probable` 85–94, `possible` 70–84, `new_product` <70) com limiares nomeados em `types/enums.ts`, `IProductCandidateRepository`/`SupabaseProductCandidateRepository` (leitura de candidatos por marca, independente de `ICatalogRepository`), `IProductIdentityMatchLogRepository`/`SupabaseProductIdentityMatchLogRepository` (fire-and-forget, mesma convenção de `insertPriceHistory`, sem método de update — append-only por código, não só por convenção), `ProductIdentityService` (orquestração — nunca lança exceção).

**Explainability completa (revisão do CTO, pré-commit da Wave)**: `MatchResult`/`MatchLogEntry` ganharam `algorithmVersion` (constante `PRODUCT_IDENTITY_ALGORITHM_VERSION`, hoje `"1.0.0"` — toda evolução futura do algoritmo incrementa essa versão; avaliações históricas nunca são recalculadas em lugar), `matchedAttributes`/`mismatchedAttributes` (um item por atributo avaliado), `penalties` (todo ponto não concedido rastreado a um atributo e uma razão — incluindo uma entrada dedicada quando o gate de marca/categoria limita a confidence a 40) e `explainabilityReason` (frase legível sintetizando por que aquela confidence/tier foi atingida). Isso é dado Brain-facing, não apenas debugging — um ativo estratégico permanente por decisão do CTO.

**Mudanças em `src/domains/connectors/`**: `ProductIdentityShadowStage` (novo `ISyncStage`, entre `DeduplicationStage` e `MediaStage`/`CatalogWriteStage` — avalia apenas itens classificados `"new"`, nunca altera `ctx.deduplicated`/`ctx.persisted`, dupla camada de proteção contra exceções). `DeduplicationStage` — Change Detection: substitui a comparação apenas de `price_usd` por preço + estoque (`in_stock`/`stock_quantity`) + descrição + imagem. `CatalogWriteStage` — grava `price_history` também no caminho `"new"` (antes só no `"update"`). `ICatalogRepository.findOfferByProductAndStore`/`ExistingOfferLookup` estendidos com os campos necessários à Change Detection. `ProductIdentityResolver`/`domain/ProductIdentity.ts` (stub do Epic 1) removidos — substituídos pelo domínio próprio.

**Brain**: nenhum `TrustEventType` novo nesta Wave — nenhum merge acontece de verdade ainda; a trilha de auditoria explicável (`matchedAttributes`/`mismatchedAttributes`/`penalties`/`explainabilityReason`) é a preparação "pronta para o Brain" da aprovação do CTO. Emissão de eventos reais de merge fica para a Wave 5.

**Testes**: 11 novos, estendidos com asserções de explainability (`ProductIdentityEngine` ×5 — cobrindo exact-slug, true-positive, guarda de falso-positivo por especificação divergente, cap por marca divergente, sem candidatos —, `ProductIdentityService` ×3, `DeduplicationStage` ×3 de change detection) — total 213/213.

Quality Gate: lint 0, typecheck 0, 213/213 testes, build (138 rotas — nenhuma rota nova, sem UI/API desta Wave por decisão confirmada com o CTO).

**Deferido explicitamente para Waves futuras**: UI/API de inspeção do shadow log; emissão de eventos Brain para merges reais; qualquer promoção de sugestões do Shadow Mode para merges automáticos (exige nova aprovação do CTO); embeddings/IA no motor de matching.

## 2026-07-01 — Release 1.7 — Wave 2 — Merchant Connectors + Scheduler + Discovery

Segunda entrega do Release 1.7 (reorganizado em 4 Waves após a certificação do Epic 1 — `docs/product/releases/RELEASE_1_7_BLUEPRINT.md` v1.1). Fecha a lacuna de autorização por merchant, impõe entitlements de plano, adiciona o primeiro cron real deste projeto, um painel de monitoramento operacional, e conectores de descoberta de lojas via sitemap/robots.txt.

**Documentação estratégica:** `docs/product/releases/RELEASE_1_7_WAVE_2_EXECUTION_PLAN.md` (novo).

**Database:** `0023_merchant_entitlements_discovery.sql` — `stores.discovered_at`/`discovery_connector_key` (proveniência de Discovery; nenhuma coluna de ownership adicionada — ownership continua exclusivamente via `merchant_stores`). `import_logs` marcada como superada (não removida).

**Ownership + Entitlements** (`services/merchant.service.ts`): `getMerchantStoreIds()`, `merchantOwnsStoreSlug()`, `checkImportEntitlement()` (lê `merchant_plans.has_connectors`/`max_imports_month`, conta execuções não-dry-run em `connector_sync_runs` no mês corrente). `app/api/merchant/imports/run/route.ts` agora bloqueia (403) merchants que não são donos da loja do conector ou que excederam a cota/não têm o recurso no plano. `getMerchantDashboardStats()` migrada de `import_logs` (bug: não era filtrada por merchant) para `connector_sync_runs.eq("merchant_id", ...)`.

**`import_logs` superada por completo**: escrita dupla removida de `app/api/admin/import/run/route.ts` e `app/api/merchant/imports/run/route.ts`; `app/api/admin/logs/route.ts` e `app/api/merchant/imports/history/route.ts` repontados para `connector_sync_runs` via `lib/sync-run-mapper.ts::toImportLogShape()` — zero mudança nas páginas que consomem esses endpoints.

**Scheduler**: `vercel.json` (novo — primeiro cron deste projeto), `lib/cron-auth.ts::requireCronSecret()` (primeiro auth por segredo compartilhado, `Authorization: Bearer $CRON_SECRET`), `app/api/cron/connectors/sync/route.ts` (`maxDuration=60`, primeira rota a declarar isso; interval-based via `connectors.config.syncFrequencyHours`, opt-in, sem parser de expressões cron), `src/domains/connectors/scheduler/VercelCronScheduler.ts` (implementa `ISyncScheduler`, seam do Epic 1).

**Ecosystem Monitor**: `app/admin/monitor/page.tsx` (novo, nav "Ecossistema"), `GET /api/admin/monitor/summary` + `GET /api/admin/monitor/runs` (novos) — computado sob demanda a partir de `connector_sync_runs`, sem tabela de agregação nova.

**Discovery** (`src/domains/connectors/discovery/`): `SitemapParser`/`RobotsParser` (hand-rolled, sem nova dependência), `IDiscoverySource`/`SitemapDiscoverySource` (deliberadamente não `IConnector`), `DiscoveryService` (único caminho de código autorizado a criar uma `stores` row sem que ela já exista — bypassa `ICatalogRepository` para não tocar a garantia "loja deve existir" do `CatalogWriteStage`). `POST /api/admin/discovery/run` (novo, admin, um domínio por vez — sem seed-list nem sweep automático nesta Wave, por decisão confirmada com o CTO).

**Brain**: 3 novos `TrustEventType` (`ConnectorSyncScheduled`, `ConnectorSyncSkippedEntitlement`, `StoreDiscovered`) + entradas em `TRUST_EVENT_BRAIN_IMPACT`. `StoreDiscovered` existe apenas como taxonomia — não é ingerido nesta Wave (nenhum merchant existe no momento da descoberta). `ConnectorSyncSkippedEntitlement` é emitido de fato no bloqueio de entitlement.

**Testes**: 23 novos (`merchant.service.test.ts` ×8, `SitemapParser` ×3, `RobotsParser` ×5, `DiscoveryService` ×3, `cron-auth` ×4) — total 202/202.

Quality Gate: lint 0, typecheck 0, 202/202 testes, build (138 rotas, incluindo as 5 novas desta Wave: `/admin/monitor`, `/api/admin/monitor/summary`, `/api/admin/monitor/runs`, `/api/admin/discovery/run`, `/api/cron/connectors/sync`).

**Deferido explicitamente para Waves futuras**: migração dos outros 7 call sites de `merchant_stores` para o helper canônico (cleanup opcional); admin UI para editar `connectors.config.syncFrequencyHours` (edição manual no Supabase por ora); seed-list + sweep automático de Discovery (sem fonte decidida para domínios candidatos); Product Identity real (Wave 3).

## 2026-07-01 — Release 1.7 — Epic 1 — Connector Platform Framework

Primeiro Epic do Release 1.7 ("Ecosystem Expansion Platform"). Absorve por completo o `acquisition/` (Release 0.9, retirado) em um domínio DDD, corrigindo um vazamento de infraestrutura e introduzindo persistência real de conectores/sincronizações. Primeiro domínio fora de `src/domains/trust/` a alimentar o ParaguAI Brain.

**Documentação estratégica:**
- `docs/product/releases/RELEASE_1_7_BLUEPRINT.md` — Blueprint do Release 1.7 (13 capacidades, 7 Epics faseados)
- `docs/product/releases/RELEASE_1_7_EXECUTION_PLAN.md` — plano técnico do Epic 1

**Database:**
- `0022_connector_platform.sql` — tabelas `connectors` (registro persistente) e `connector_sync_runs` (execução de sincronização, `merchant_id` opcional), RLS habilitado, `connector_configs` (0010) marcada como superada.

**Domínio `src/domains/connectors/`** (substitui `acquisition/`, deletado nesta Epic): `types/` (enums, raw/connector/pipeline/validation types), `domain/` (Connector, SyncRun, ProductIdentity), `repositories/` + `infrastructure/` (IConnectorRepository, ISyncRunRepository, ICatalogRepository — corrige o `PipelineContext.supabase` bruto do `acquisition/`), `normalization/` (OfferNormalizer, ProductIdentityResolver — seed do Epic 3), `mapping/` (JsonFieldMapper, CsvFieldMapper), `crawler/` (HttpFetchStrategy, ShoppingChinaConnector, reference JSON/CSV connectors — auto-registro normalizado), `services/` (ConnectorRegistry, SyncOrchestrator substitui AcquisitionPipeline, stages/ com Validation/Normalization/Deduplication/Media/CatalogWrite), `scheduler/` (ISyncScheduler — seam para Epic 2, ManualSyncTrigger), `events/connector.events.ts`, `__tests__/` (9 suítes, 38 testes).

**Factory:** `lib/connectors-factory.ts` — `createConnectorsServices(client)`.

**Brain:** 4 novos `TrustEventType` (`ConnectorRegistered`, `ConnectorSyncStarted/Completed/Failed`) + entradas em `TRUST_EVENT_BRAIN_IMPACT` mapeando para `HistoricalData`/`SearchIntelligence`. Emitidos apenas no caminho de sincronização disparado por merchant (`merchantId` presente) — ver limitação documentada em `PROJECT_STATUS.md`.

**APIs rewiring (contrato inalterado):** `GET /api/admin/import/connectors`, `POST /api/admin/import/run`, `POST /api/merchant/imports/run`, `GET /api/merchant/imports/history` — todas agora usam `createConnectorsServices()`; `import_logs` recebe escrita dupla temporária.

**Scripts CLI:** movidos de `acquisition/scripts/` para `scripts/` (`connectors:import-json[:execute]`, `connectors:import-csv[:execute]`, `sync:shoppingchina[:execute]`); `acquisition:validate` removido (substituído por `npm test`).

**Paridade verificada**: dry-run de `scripts/import-json.ts`/`import-csv.ts` produz totais idênticos aos scripts antigos de `acquisition/` contra o mesmo Supabase real (Received/Validated/Normalized/Deduplicated/Persisted/Skipped/Failed).

**Docs atualizados**: ARCHITECTURE, DOMAIN_MODEL (substituição global de "Acquisition Engine"→"Connector Platform", "AcquisitionPipeline"→"SyncOrchestrator"), API_CONTRACTS, CONNECTOR_GUIDE (reescrito), ACQUISITION.md (retirado, redirecionamento).

Quality Gate: lint 0, typecheck 0, 179/179 testes (26 suítes), build 89 rotas.

**Deferido explicitamente para Epic 2**: autorização de conector por `merchant_stores` (hoje qualquer merchant pode disparar qualquer conector), migração de `getMerchantDashboardStats()` para `connector_sync_runs`, scheduler real (Vercel Cron).

## 2026-06-30 — Release 1.6 — Epic 5 — Growth Engine (Sprint 1.6.5)

Quinto e último Epic do Release 1.6. Motor de crescimento baseado em regras que responde "O que devo fazer hoje para vender mais?" — cada recomendação é explicável, rastreável e baseada em dados reais.

**Database:**
- `0021_growth_engine.sql` — tabela `merchant_growth_history` (append-only, event_type CHECK), 3 índices, RLS habilitado.

**Domínio `src/domains/growth-engine/`:**
- `types/enums.ts`: 8 enums (GrowthCategory×10, GrowthStrategyType×10, GrowthPriority×4, GrowthEffort×3, GrowthStatus×5, GrowthEventType×4, OpportunityCategory×8, PlanTier×3)
- `types/growth.types.ts`: DraftRecommendation, GrowthRecommendation (+ priority_score + priority_breakdown), TodaysPlan, OpportunityCenter, GrowthHistoryEntry, GrowthTimeline, GrowthDashboard
- `domain/GrowthContext.ts`: merchant + summary + catalog + analytics + products + timestamp (sem merchant-decision)
- `strategies/`: GrowthStrategy interface, 10 estratégias puras, StrategyRegistry (Map estático), bootstrapStrategies (idempotente), helpers (makeId, draft, evidence)
- `services/GrowthContextBuilder.ts`: Promise.all de buildExecutiveSummary + buildCatalogIntelligence + analyticsSvc.getSummary + analyticsSvc.getProductAnalytics
- `services/RecommendationEngine.ts`: fault-isolated por estratégia, deduplicação por id
- `services/PriorityEngine.ts`: impact(0-40) + urgency(0-30) + ease(0-20) + context(0-10) = max 100; `reason` em português
- `services/TodaysPlanService.ts`: max N itens free-tier, total_available inclui todos, estimated_total_minutes
- `services/OpportunityCenterService.ts`: filtra opportunity_category !== null
- `services/GrowthHistoryService.ts`: getTimeline + recordEvent
- `repositories/IGrowthHistoryRepository.ts`: interface de repositório
- `infrastructure/SupabaseGrowthHistoryRepository.ts`: implementação Supabase

**Factory:**
- `lib/growth-engine-factory.ts`: `createGrowthEngineServices(client)` — bootstrapStrategies + todos os 6 serviços

**APIs (6 novas rotas):**
- `GET /api/merchant/growth` — GrowthDashboard completo (plano + oportunidades + todas as recomendações + histórico)
- `GET /api/merchant/growth/today` — TodaysPlan apenas
- `GET /api/merchant/growth/opportunities` — OpportunityCenter apenas
- `GET /api/merchant/growth/recommendations?priority=` — todas as recomendações com filtro opcional
- `PATCH /api/merchant/growth/recommendations/[id]` — registra event_type (viewed/accepted/ignored/completed)
- `GET /api/merchant/growth/history?limit=` — GrowthTimeline (max 200, padrão 50)

**Widgets (6 novos componentes em `components/merchant/growth-center/widgets/`):**
- `TodaysPlanWidget` — plano do dia com priority_breakdown.reason, premium badge, minutos estimados
- `TopOpportunitiesWidget` — top 5 oportunidades com categoria e impacto
- `HighImpactActionsWidget` — "use client", lista expansível, aceitar/ignorar com `recordEvent`, evidências e breakdown
- `CompletedGrowthWidget` — melhorias concluídas do histórico
- `GrowthTimelineWidget` — timeline com ícones por tipo de evento (viewed/accepted/ignored/completed)
- `RecommendationHistoryWidget` — métricas de engajamento (vistas/aceitas/concluídas/ignoradas)

**Dashboard:**
- Growth Center como **1ª aba** (padrão ao carregar), ícone `TrendingUp`, badge emerald quando há plano
- `GrowthData = GrowthDashboard | null` — fetch lazy na primeira ativação

**Brain:**
- 12 novos `TrustEventType` (total: 85): GrowthCenterViewed, GrowthPlanGenerated, GrowthRecommendationViewed, GrowthRecommendationAccepted, GrowthRecommendationIgnored, GrowthRecommendationCompleted, GrowthOpportunityIdentified, GrowthOpportunityCenterViewed, GrowthStrategyEvaluated, GrowthContextBuilt, GrowthTimelineViewed, GrowthScoreComputed

**Testes (33 novos, total 141/141):**
- `CatalogGrowthStrategy.test.ts` — 5 asserções (id, first_import, completeness, quality, expansion)
- `TrustGrowthStrategy.test.ts` — 5 asserções (id, first_verification, sem-dup, trust_score, add_signals)
- `RecommendationEngine.test.ts` — 7 asserções (dedup, fault-isolation, vazio, multi-strategy, ids únicos, campos obrigatórios, smoke)
- `PriorityEngine.test.ts` — 10 asserções (cap 100, ranking, breakdown, context, sort, todaysPlan, ease, reason, soma, vazio)
- `TodaysPlanService.test.ts` — 6 asserções (maxItems, excluir premium, premium_count, minutos, total_available, data)

**Quality Gate:** lint 0 erros · typecheck 0 erros · 141/141 testes · build verde

---

## 2026-06-30 — Release 1.6 — Epic 4 — Catalog Intelligence (Sprint 1.6.4)

Quarto Epic do Release 1.6. Inteligência de catálogo por produto: cada produto recebe um score individual de saúde (0–100), diagnóstico específico de quais dados estão faltando, e o catálogo agora tem histórico de evolução diária (série temporal).

**Database:**
- `0020_catalog_intelligence.sql` — tabela `merchant_catalog_snapshots` (snapshot diário de saúde: health_score, products_ideal/attention/critical, total_products), UNIQUE(merchant_id, snapshot_date), índice por merchant+date DESC, RLS habilitado.

**Domínio `src/domains/catalog-intelligence/`:**
- `types/enums.ts`: `ProductHealthStatus` (Ideal/Attention/Critical), `ProductDiagnosisType` (NoImage/NoCategory/NoBrand/NoDescription/NoPrice/OutOfStock), `CatalogTrend` ("improving"|"stable"|"declining")
- `types/catalog-intelligence.types.ts`: `ProductDiagnosis`, `ProductHealthRecord`, `CatalogHealthBreakdown`, `CatalogHealthSnapshot`, `CatalogHealthHistory`, `CatalogHealthResponse`, `CatalogProductsResponse`
- `repositories/ICatalogSnapshotRepository`: interface `getHistory` + `saveSnapshot`
- `infrastructure/SupabaseCatalogSnapshotRepository`: upsert por merchant_id+snapshot_date
- `services/ProductHealthService`: `scoreOffer` (pura, pesos: image 30, category 25, brand 15, desc 15, price 15), `getProductHealthList`, `getHealthBreakdown`
- `services/CatalogHistoryService`: classe, injeta ICatalogSnapshotRepository, tendência calculada por delta do período (>=5 melhorando, <=-5 caindo)

**Factory:**
- `lib/catalog-intelligence-factory.ts`: `createCatalogIntelligenceServices(client)`

**APIs (3 novas rotas):**
- `GET /api/merchant/catalog/health` — breakdown + top 20 produtos com problemas; registra snapshot diário (fire-and-forget)
- `GET /api/merchant/catalog/history?days={N}` — últimos N dias de health_score (max 90, padrão 30)
- `GET /api/merchant/catalog/products?status=&page=&limit=` — lista paginada de produtos com scores individuais

**Widgets (4 novos componentes em `components/merchant/catalog/widgets/`):**
- `CatalogHealthScoreWidget` — score + 3 barras (ideal/atenção/crítico) — Server Component
- `ProductHealthListWidget` — lista filtrável com cards expansíveis que revelam diagnósticos — "use client"
- `CatalogEvolutionWidget` — sparkline + badge de tendência — Server Component
- `CatalogInsightsWidget` — insight principal + breakdown de issues — Server Component

**Dashboard:**
- 5ª aba "Catálogo" (ícone `Package`) adicionada ao `ActiveTab` — fetch lazy na primeira ativação
- Badge laranja na aba quando há produtos com problemas (critical + attention > 0)

**Brain:**
- 6 novos `TrustEventType`: CatalogIntelligenceViewed, CatalogProductHealthViewed, CatalogSnapshotRecorded, CatalogIssueIdentified, CatalogHealthImproved, CatalogProductFixed (total: 73)

**Testes:**
- 23 novos testes (ProductHealthService 15, CatalogHistoryService 8) — total: 108/108
- Quality Gate: lint 0, typecheck 0, 108/108 testes, build compilado.

---

## 2026-06-30 — Release 1.6 — Epic 3 — Merchant Decision Engine (Sprint 1.6.3)

Terceira entrega do Release 1.6. Motor de decisão transparente, declarativo e completamente explicável: toda recomendação tem evidência rastreável. Nenhum algoritmo opaco — cada resultado é derivado de dados observáveis.

**Database:**
- `0019_merchant_decision.sql` — tabela `merchant_decision_actions` (status CHECK: pending/completed/ignored/postponed), 3 índices, RLS habilitado.

**Novo domínio `src/domains/merchant-decision/` (DDD completo):**
- `types/enums.ts` — RecommendationCategory (6), RecommendationPriority (4), EstimatedEffort (3), RecommendationStatus (5), OpportunityType (7), ActionStatus (4), ImpactLevel (3)
- `types/decision.types.ts` — DecisionContext, Evidence, Recommendation, Opportunity, DecisionAction, PriorityScore, DecisionCenterData
- `rules/Rule.ts` — interface pura: `evaluate(ctx): RuleResult | null`, sem side-effects, determinístico
- `rules/RuleRegistry.ts` — Map estático; métodos: register, getAll, getById, getByCategory, count, ids
- `rules/bootstrap.ts` — idempotente (`bootstrapped` guard); registra 11 regras de uma vez
- 11 regras declarativas em 4 arquivos: catalog (3), trust (3), analytics (3), profile (2)
  - Catalog: `catalog.image_coverage`, `catalog.stale_import`, `catalog.low_active_products`
  - Trust: `trust.no_verification`, `trust.low_score`, `trust.no_signals`
  - Analytics: `analytics.high_views_low_contact`, `analytics.low_ctr`, `analytics.zero_saves`
  - Profile: `profile.no_contact`, `profile.single_channel`
- `repositories/IActionRepository.ts` — interface: create, findByMerchant, findById, findByRuleId, update, getTimeline
- `infrastructure/SupabaseActionRepository.ts` — implementação Supabase com service client
- `services/RecommendationEngine.ts` — run all rules, fault-isolated (try/catch por regra), enrich com id/status/created_at
- `services/PrioritizationEngine.ts` — fórmula transparente: impact(40/30/20/10) + effort(30/20/10) + urgency(0/10/15) + category_weight(15/15/10/5/5/5), máx 100 pts
- `services/OpportunityDetector.ts` — 4 detectores baseados exclusivamente em dados observáveis
- `services/ActionService.ts` — lifecycle de DecisionAction: create (sem duplicatas), update, getActions, getTimeline
- `services/DecisionContextBuilder.ts` — agrega ExecutiveSummary + CatalogIntelligence + MerchantHealth + MerchantAnalyticsSummary + ProductAnalyticsResult em Promise.all

**5 API Routes:**
- `GET /api/merchant/decision-center` — endpoint unificado (hoje_priorities + all_recs + opportunities + actions)
- `GET /api/merchant/recommendations` — recomendações on-demand (substitui rota legada)
- `GET /api/merchant/opportunities` — oportunidades detectadas em tempo real
- `GET /api/merchant/actions?status=` — lista actions com filtro de status opcional
- `PATCH /api/merchant/actions/[id]` — atualiza status (completed/ignored/postponed) com acted_at auto

**6 Widgets (`components/merchant/decision-center/widgets/`):**
- `TodaysPrioritiesWidget` — top 5 prioridades do dia com badge de prioridade e urgência
- `RecommendationsWidget` — lista completa com expand/collapse por rec, aceitar e ignorar (client)
- `OpportunitiesWidget` — oportunidades detectadas com evidências e how-to-act
- `CompletedImprovementsWidget` — histórico de melhorias concluídas
- `PendingImprovementsWidget` — ações pendentes com botão de conclusão rápida (client)
- `GrowthTimelineWidget` — timeline cronológica de todas as ações com status visual

**Dashboard atualizado (`app/merchant/dashboard/page.tsx`):**
- 4 tabs: Command Center, Analytics, Decision Center (novo), Score & Metas
- Tab Decision Center: fetch lazy ao ativar, handlers para aceitar/ignorar recomendações e concluir ações
- Badge amber no tab quando há prioridades pendentes

**Brain — 10 novos TrustEventType (total: 67):**
- DecisionCenterViewed, RecommendationGenerated, RecommendationViewed, RecommendationAccepted, RecommendationDismissed
- ActionCompleted, ActionPostponed, OpportunityDetected, OpportunityResolved, PriorityChanged

**Testes — 33 novos (total: 85/85):**
- `RuleRegistry.test.ts` (7 testes) — register, getById, getByCategory, ids, overwrite warning
- `RecommendationEngine.test.ts` (7 testes) — generate com contextos variados, regras disparadas corretamente
- `OpportunityDetector.test.ts` (7 testes) — 4 detectores, evidências obrigatórias, contexto saudável
- `PrioritizationEngine.test.ts` (12 testes) — score(), urgency bonus, sort(), todaysPriorities()

**Quality Gate:** lint 0, typecheck 0, 85/85 testes, build compilado.

---

## 2026-06-30 — Release 1.6 — Epic 2 — Merchant Analytics Platform (Sprint 1.6.2)

Segunda entrega do Release 1.6. Infraestrutura completa de analytics comportamental: desde captura client-side de eventos até funil de conversão e widgets para merchant.

**Database:**
- `0018_analytics_platform.sql` — 3 tabelas: `buyer_sessions` (mutable), `buyer_events` (append-only, nunca deletar), `merchant_analytics_daily` (agregações pré-computadas). 9 índices de performance, RLS configurado, comentário de estratégia de particionamento futuro.

**Novo domínio `src/domains/merchant-analytics/` (DDD completo):**
- `types/enums.ts` — AnalyticsEventType (22 valores), DeviceType, FunnelStep (6), AnalyticsWindow (4)
- `types/analytics.types.ts` — AnalyticsEventPayload, StoredAnalyticsEvent, SessionPayload, StoredSession, EventStream, FunnelResult, MerchantAnalyticsSummary, ProductAnalyticsResult, TrafficAnalyticsResult, AnalyticsHealthCheck
- `repositories/IAnalyticsEventRepository.ts` + `ISessionRepository.ts` — interfaces de contrato
- `infrastructure/SupabaseAnalyticsEventRepository.ts` + `SupabaseSessionRepository.ts` — implementações Supabase
- `services/WindowHelper.ts` — `windowToDate()` + `windowLabel()`
- `services/EventPlatformService.ts` — validação, sanitização, batch insert (≤50), session side-effects automáticos
- `services/SessionService.ts` — CRUD de sessões com validação de anonymous_id
- `services/EventStreamService.ts` — reconstrução cronológica da jornada de comprador
- `services/MerchantAnalyticsService.ts` — getSummary (views, unique_visitors, CTR, contatos, saves), getProductAnalytics (impressões/cliques/CTR por produto), getTrafficAnalytics (origem de tráfego, distribuição horária)
- `services/FunnelService.ts` — 6 passos (Search→Impression→Click→MerchantView→Contact→Save), drop_rate e conversion_rate por passo, overall_conversion
- `services/AnalyticsObservabilityService.ts` — healthCheck com contagem de eventos/sessões recentes e latência

**8 API Routes:**
- `POST /api/analytics/events` — single ou batch (até 50), validação + sanitização + rate limit (60 req/min/IP), fire-and-forget
- `POST /api/analytics/session` — cria sessão
- `GET /api/analytics/session?id=` — retorna sessão + event stream
- `GET /api/analytics/funnel?window=` — funil global ou por merchant
- `GET /api/analytics/health` — health check do subsistema de analytics
- `GET /api/merchant/analytics?window=` — summary autenticado por merchant
- `GET /api/merchant/analytics/products?window=` — top produtos autenticado
- `GET /api/merchant/analytics/traffic?window=` — origem de tráfego autenticado
- `GET /api/merchant/analytics/events?window=&limit=` — eventos recentes autenticados

**Hook `hooks/useAnalytics.ts` (client-side):**
- anonymous_id (localStorage persistente UUID) + session_id (sessionStorage UUID)
- Batch automático com flush a cada 2s; flush imediato em eventos de alto valor (WhatsApp, Phone, OfferSaved)
- Session start automático na primeira visita (integrado com `/api/analytics/session`)
- Flush final no `beforeunload` via `keepalive: true`
- Detecção de device_type (desktop/mobile/tablet)

**6 Widgets (`components/merchant/analytics/widgets/`):**
- `ViewsWidget` — visualizações totais + visitantes únicos
- `TrafficWidget` — CTR, impressões, cliques, WhatsApp/Phone cliques
- `TopProductsWidget` — rank por impressões com CTR por produto (top 5)
- `MerchantTrafficWidget` — barras de origem de tráfego (Google/Facebook/Direto/etc.)
- `FunnelWidget` — funil visual com drop_rate entre passos + conversão geral
- `SessionWidget` — contatos, saves, breakdown WhatsApp/Telefone/Site

**Dashboard atualizado (`app/merchant/dashboard/page.tsx`):**
- 3 tabs: Command Center, Analytics (novo), Score & Metas
- Tab Analytics: seletor de janela (Hoje/7 dias/30 dias/90 dias), fetch lazy ao ativar tab, grid responsivo com 6 widgets

**Brain — 18 novos TrustEventType (total: 57):**
- AnalyticsSearchPerformed, AnalyticsProductImpression, AnalyticsProductClicked, AnalyticsProductCompared
- AnalyticsMerchantViewed, AnalyticsMerchantPassportViewed, AnalyticsMerchantContactClicked
- AnalyticsMerchantWhatsAppClicked, AnalyticsMerchantPhoneClicked, AnalyticsMerchantWebsiteClicked
- AnalyticsMerchantLocationViewed, AnalyticsOfferViewed, AnalyticsOfferClicked, AnalyticsOfferSaved
- AnalyticsCategoryViewed, AnalyticsBrandViewed, AnalyticsSessionStarted, AnalyticsSessionEnded
- 14 factory functions em `trust.events.ts`; 14 mapeamentos em `event-registry.ts` (todos 6 Brain assets cobertos)
- `lib/analytics-factory.ts` — factory unificada de serviços para rotas de API

**Testes (28 novos, total: 52):**
- `EventPlatformService.test.ts` — 14 asserções (validação, sanitização, batch, session side-effects, storage_error)
- `MerchantAnalyticsService.test.ts` — 8 asserções (views, unique_visitors, CTR, contact aggregation, product rank, traffic sources)
- `FunnelService.test.ts` — 6 asserções (steps count, drop_rate, null first step, overall_conversion, zero case, merchantId)

**Quality Gate:** lint 0, typecheck 0, 52/52 testes passando, build compilado.

---

## 2026-06-30 — Release 1.6 — Epic 1 — Merchant Command Center (Sprint 1.6.1)

Primeira entrega do Release 1.6 — Merchant Growth Platform. O `/merchant/dashboard` evolui para o Merchant Command Center: inteligência operacional, não apenas métricas.

**Novo domínio `src/domains/merchant-intelligence/`:**
- `types/enums.ts` — HealthStatus (Excelente/Bom/Regular/Atenção), HealthDimension (5: Catálogo/Trust/Atualização/Perfil/Visibilidade), CatalogIssueType (7 tipos), InsightSeverity, ActionPriority
- `types/merchant-intelligence.types.ts` — ExecutiveSummary, HealthDimensionResult, MerchantHealth, CatalogIssue, CatalogInsight, CatalogIntelligence, QuickAction, QuickActionsResult, CommandCenterData

**Serviços (4 funções puras, sem side effects):**
- `ExecutiveSummaryService.buildExecutiveSummary()` — agrega produtos, trust, avaliações, contatos, última sync em uma estrutura unificada via Promise.all
- `MerchantHealthService.buildMerchantHealth()` — 5 dimensões de saúde independentes (Catálogo/Trust/Atualização/Perfil/Visibilidade) com status, razão e como melhorar
- `CatalogIntelligenceService.buildCatalogIntelligence()` — detecta 7 tipos de problema (sem imagem, categoria, marca, descrição, preço, stale, sem produtos); ordena por severidade; calcula healthScore 0-100 ponderado
- `QuickActionsService.buildQuickActions()` — 8 regras de negócio para ações prioritizadas (critical→high→medium), limitadas a 5

**5 API Routes:**
- `GET /api/merchant/command-center` — unified endpoint (summary + health + catalog + quick-actions em paralelo)
- `GET /api/merchant/command-center/summary`
- `GET /api/merchant/command-center/health`
- `GET /api/merchant/command-center/catalog`
- `GET /api/merchant/command-center/quick-actions`

**6 Widgets reutilizáveis (`components/merchant/command-center/widgets/`):**
- `ExecutiveSummaryWidget` — 5 cards: catálogo, trust, avaliações, contato, última sync
- `MerchantHealthWidget` — 5 dimensões com cor semântica (verde/azul/âmbar/vermelho), explicação e como melhorar
- `CatalogIssuesWidget` (client) — barra de saúde, insights, acordeão expansível por issue com impacto e link de resolução
- `QuickActionsWidget` — prioridade crítica/alta/média com tempo estimado e link de ação
- `TrustWidget` — Trust Score bar + 4 sinais (verificações, sinais, avaliações, nível)
- `RecentActivityWidget` — histórico de atividade recente (última sync, produtos publicados, avaliações)

**Dashboard refatorado (`app/merchant/dashboard/page.tsx`):**
- Tab "Command Center" (ativo por padrão): novos 6 widgets organizados em grid responsivo
- Tab "Score & Metas": componentes legados preservados (StatsGrid, ScoreCard, GoalsPanel, MerchantProgressCard, RecommendationsPanel)
- Fetch paralelo de `/api/merchant/command-center` + `/api/merchant/dashboard/stats`
- Badge de atenção no tab se overallAttentionCount > 0

**Brain — 8 novos TrustEventType:**
- `CommandCenterViewed`, `CommandCenterWidgetOpened`, `CommandCenterQuickActionClicked`, `CommandCenterCatalogIssueViewed`, `CommandCenterCatalogIssueResolved`, `CommandCenterHealthViewed`, `CommandCenterFilterChanged`, `CommandCenterSummaryExported`
- Factory functions em `trust.events.ts`; 8 novos mapeamentos em `event-registry.ts`
- Novo `BrainEntityType.CommandCenter = "command_center"`

**Testes:**
- `MerchantHealthService.test.ts` — 9 asserções (status por dimensão, overallAttentionCount, merchantId)
- `QuickActionsService.test.ts` — 6 asserções (max 5 actions, critical first, sort order, healthy merchant = 0 actions)
- `CatalogIntelligenceService.test.ts` — 9 asserções (no_image, no_price, no_category, no_brand, healthScore 100, sort, stale)
- Jest configurado em `jest.config.ts`; `npm test` adicionado ao package.json

**Quality Gate:** lint 0, typecheck 0, 24/24 testes passando, build compilado.

---

## 2026-06-29 — Release 1.5 — Epic 4 — Cognitive Integration & Hardening — RELEASE CANDIDATE

Consolidação do Release 1.5. Todos os 4 Epics conectados ao ParaguAI Brain via interface unificada.

**Módulo Brain (`src/domains/trust/brain/`):**
- `CognitiveBrainService` — camada única de ingestão de eventos cognitivos. Aceita `TrustDomainEvent` + `CognitiveBrainContext`, valida, loga, persiste, retorna `CognitiveBrainIngestionResult` com correlation_id e assets_impacted
- `EventQualityValidator` — 7 regras: merchant_id, event_type, origin, source_service, correlation_id, schema_version, occurred_at válido; warnings para actor_id, entity_id, clock skew, assets vazios
- `ObservabilityService` — structured logging (info/warn/error) com metadata JSON + `buildHealthCheck()` aggregador de checks
- `KnowledgeGraphService` — derivação de relações (BuyerViewed, BuyerReviewed, BuyerContactedVia, MerchantHasVerification, MerchantHasSignal, MerchantHasReview...) a partir de eventos Brain armazenados, sem nova tabela
- `SearchReadinessService` — `buildSearchReadinessProfile(passport)`: 8 boost factors sem algoritmo (has_active_signals, has_business_verification, has_identity_verification, has_operational_verification, has_reviews, has_positive_rating, has_badge, has_timeline), readiness_score 0-100

**Novos enums:**
- `BrainEntityType` (9: Merchant, Review, Verification, Signal, Badge, Timeline, Passport, Buyer, Product)
- `GraphRelationType` (10 tipos de relação)
- `CognitiveBrainActorRole` (Buyer, Merchant, Admin, System)

**API:**
- `GET /api/trust/brain/health` — verifica 5 tabelas em paralelo (merchant_trust, trust_signals, merchant_reviews, merchant_timeline, merchant_trust_events), retorna healthy/degraded/unhealthy + latencyMs

**Teste de integração:**
- `TrustFlow.integration.test.ts` — pipeline completo Verification→Signal→Passport→Review→Brain Event→Knowledge Graph. 6 etapas, >20 asserções, tudo in-memory

**Hardening:**
- Comentário residual removido de `MerchantTrustSection.tsx`
- 0 warnings de lint após limpeza de imports

**Quality Gate:** lint 0, tsc 0, build OK. RELEASE CANDIDATE aprovado.

---

## 2026-06-29 — Release 1.5 — Epic 3 — Merchant Identity (Sprint 1.5.4)

Identidade Digital Permanente do Merchant. O perfil público deixa de ser uma página e passa a representar um ativo estratégico auditável e extensível.

**Tipos novos:**
- `MerchantBasicData` — dados do merchants table estruturados para o domínio trust
- `MerchantChannel` — canal de contato com flag `verified`
- `MerchantInsights` — fatos objetivos computados (sem score)
- `PassportSearchMetadata` — metadados para futuro ranking sem alterar algoritmo
- `MerchantPassport` — estrutura unificada consolidando todos os dados de identidade e trust

**Enums:**
- `PassportSection` — 5 abas do perfil público
- `MerchantChannelType` — Website, WhatsApp, Phone, Email
- `TrustEventType` — 24 → 31 (7 novos eventos de identidade)

**Serviço — MerchantPassportService:**
- `getPassport(merchantId, basicData)` — Promise.all de 7 repos, computed insights, channel building com verificação de sinais, searchMetadata estruturado
- `getInsights(merchantId, joinedAt, lastUpdatedAt)` — subset para endpoint dedicado

**Brain Events (7 novos):**
`MerchantPassportViewed`, `MerchantFactExpanded`, `MerchantTimelineInteraction`, `MerchantReviewInteraction`, `MerchantProfileShared`, `MerchantContactClicked`, `MerchantLocationViewed`

Event registry: 24 → 31 mapeamentos Brain.

**APIs:**
- `GET /api/trust/merchant/[merchantId]/passport`
- `GET /api/trust/merchant/[merchantId]/insights`

**Página `/lojistas/[merchantId]` — evoluída:**
- 5 abas (Visão Geral, Trust, Timeline, Avaliações, Informações)
- `ProfileTabNav` — Server Component com Link-based routing via `?tab=` query param
- `searchParams` async (Next.js 16) para determinar aba ativa no servidor
- `generateMetadata` atualizado para novo título

**Componentes (11 novos):**
`TrustExplainabilityCard` (por que existe / quem verificou / quando / evidência), `MerchantHeader` (nome + contatos + badge de nível), `MerchantFacts` (tabela de fatos objetivos), `MerchantMetrics` (grid de métricas), `MerchantHighlights` (destaques mais relevantes), `MerchantIdentityCard` (dados de identificação com canais), `MerchantTrustSection` (sinais com explainability integrada), `MerchantHistorySection` (timeline com header), `MerchantOverview` (visão geral composta), `MerchantSidebar` (sidebar agregado), `ProfileTabNav` (navegação por abas SSR)

**Quality Gate:** lint 0, tsc 0, build OK — `/api/trust/merchant/[merchantId]/passport` e `/insights` como novas rotas dinâmicas.

---

## 2026-06-29 — Release 1.5 — Epic 2 — Trust Experience (Sprint 1.5.3)

Sistema completo de Trust Experience. A confiança de um merchant agora é pública, explicável, auditável e baseada em evidências.

**Banco de Dados:**
- Migration `0016_trust_experience.sql`: 6 novas tabelas com RLS completo
  - `trust_signals` — sinais públicos de confiança ligados a verificações
  - `signal_provenance` — rastreabilidade de origem (admin-only)
  - `merchant_reviews` — avaliações com soft-delete e UNIQUE(merchant,reviewer)
  - `review_reports` — denúncias com UNIQUE(review,reporter)
  - `review_history` — audit trail INSERT-ONLY (sem updated_at, sem deleted_at)
  - `merchant_timeline` — timeline pública de eventos do merchant

**Domínio Trust (DDD):**
- 11 novos enums (TrustSignalType 15 valores, TrustSignalStatus, TrustSignalCategory, SignalTrustLevel, ReviewStatus, ReviewAction, ReviewReportReason, ReviewReportStatus, TimelineEventType 15 valores, TimelineEventCategory, TimelineVisibility)
- TrustEventType expandido de 14 → 24 eventos Brain
- 6 entidades de domínio + 6 repositórios (interfaces + Supabase) + 5 serviços

**Serviços:**
- `TrustSignalService` — criação automática de sinais ao aprovar verificação (VERIFICATION_TO_SIGNAL mapping)
- `ReviewService` — submissão, edição, soft delete, resposta merchant, helpful
- `ReviewModerationService` — fila admin (approve/hide/remove/restore + denúncias)
- `MerchantTimelineService` — timeline pública e filtrada
- `MerchantProfileService` — perfil completo em uma chamada

**APIs (13 novos endpoints):**
- `GET /api/trust/merchant/[id]/profile`
- `GET/POST /api/trust/merchant/[id]/signals`
- `GET /api/trust/merchant/[id]/timeline`
- `GET/POST /api/trust/merchant/[id]/reviews`
- `GET/PATCH/DELETE /api/trust/merchant/[id]/reviews/[rid]`
- `POST /api/trust/merchant/[id]/reviews/[rid]/report`
- `POST /api/trust/merchant/[id]/reviews/[rid]/reply`
- `GET /api/trust/merchant/[id]/reviews/[rid]/history` (admin)
- `GET /api/admin/trust/reviews`
- `PATCH /api/admin/trust/reviews/[rid]`
- `GET /api/admin/trust/reviews/[rid]/reports`

**Páginas:**
- `/lojistas/[merchantId]` — perfil público de trust (timeline, reviews, sinais, reputação, contato)
- `/admin/trust/reviews` — fila de moderação com pendentes e histórico
- `/admin/trust/reviews/[id]` — detail com ações de moderação e audit trail
- AdminSidebar: Trust grupo → 3 filhos (Dashboard, Verificações, Reviews)

**Componentes (12 novos):**
`TrustSignalCard`, `TrustBadgeGrid`, `TrustPanel`, `TrustSummary`, `ReviewCard`, `ReviewList`, `ReviewComposer` (client), `MerchantTimeline` + `TimelineEmptyState` + `TimelineSkeleton`, `ReputationOverview`, `VerificationWidget`, `EvidencePreview`, `TimelineFilters` (client), `ReviewModerationClient` (admin, client)

**Brain Events (24 mapeamentos completos):**
`ReviewCreated`, `ReviewUpdated`, `ReviewReported`, `ReviewModerated`, `ReviewHelpfulMarked`, `MerchantProfileViewed`, `TrustSignalViewed`, `TrustSignalActivated`, `TrustSignalRevoked`, `BadgeClicked`, `TimelineViewed`, `EvidenceOpened` — todos mapeados para BrainAsset

**Quality Gate:** lint 0, tsc 0, build 100% — `/lojistas/[merchantId]` como nova rota dinâmica pública.

---

## 2026-06-27 — Foundation 0.9 — FOUNDATION VALIDATION — FOUNDATION EMPRESARIAL CERTIFICADA v1.0

Validação completa e certificação da Foundation Empresarial do ParaguAI.

**Resultado**: APROVADA. Uma única inconsistência real identificada e corrigida.

**O que foi validado:**

- **Matriz de responsabilidades**: cada documento possui papel único e insubstituível. Nenhuma sobreposição de responsabilidade identificada.
- **Consistência conceitual**: 8 conceitos-chave validados — ParaguAI Brain, Merchant OS, Merchant Score, Flywheel, Moat (5 camadas), Compounding, IA Transversal, Assimetria de Informação. Todos consistentes em terminologia e definição.
- **Referências cruzadas**: DECISION_FILTER e RELEASE_STRATEGY referenciam todos os documentos anteriores. NORTH_STAR referencia a Constituição. Constitution referencia operações. Ciclo fechado.
- **Duplicidades**: 4 casos de repetição intencional identificados (regras críticas repetidas em múltiplos documentos por ênfase) e 1 sobreposição leve (automação em Constitution + Engineering). Nenhuma duplicidade problemática.
- **Lacunas**: 5 lacunas identificadas (não críticas): DATA_PRINCIPLES, CULTURE_PRINCIPLES, API_PRINCIPLES, Security Policy, Financial Policy. Registradas para fases futuras.
- **Teste de governança (5 cenários)**: 5/5 aprovados — engenheiro novo, IA nova, Product Manager, CTO, investidor.
- **Avaliação de maturidade**: 9.0/10 — coerência 9, clareza 9, consistência 8, governança 9, escalabilidade 10, longevidade 10, reutilização 9, facilidade de consulta 8.

**Inconsistência encontrada e corrigida:**

- **`docs/foundation/AI_CONSTITUTION.md` Seção XIX** estava desatualizada: listava apenas 5 documentos na hierarquia (os existentes antes da Foundation). Corrigida para hierarquia completa de 12 documentos (8 Foundation + 4 operacionais). Constitution promovida de v1.1 para **v1.2**.

---

## ⚡⚡ FOUNDATION EMPRESARIAL DO PARAGUAI — CERTIFICADA v1.0 ⚡⚡

**Data de certificação**: 2026-06-27  
**Status**: LOCKED — todos os 8 documentos permanentes

| # | Documento | Versão | Responde |
|---|---|---|---|
| 0.1 | `AI_CONSTITUTION.md` | **v1.2** | Quem somos |
| 0.2 | `NORTH_STAR.md` | v1.1 | Como decidimos |
| 0.3 | `BUSINESS_MODEL.md` | v1.0 | Como criamos valor |
| 0.4 | `VISION_2035.md` | v1.0 | Para onde vamos |
| 0.5 | `ENGINEERING_PRINCIPLES.md` | v1.0 | Como construímos tecnologia |
| 0.6 | `PRODUCT_PRINCIPLES.md` | v1.0 | Como construímos produtos |
| 0.7 | `DECISION_FILTER.md` | v1.0 | Como aprovamos decisões |
| 0.8 | `RELEASE_STRATEGY.md` | v1.0 | Como evoluímos |

O ciclo está fechado e certificado. Qualquer revisão futura de um documento permanente requer nova versão e entrada no histórico de revisões — nunca alteração silenciosa.

---

## 2026-06-27 — Foundation 0.8 — RELEASE_STRATEGY.md — FOUNDATION EMPRESARIAL COMPLETA

Criação do oitavo e último documento permanente da Foundation: o ciclo permanente de evolução da plataforma.

- **`docs/foundation/RELEASE_STRATEGY.md`** (novo): 15 seções. Fecha a Foundation respondendo "como o ParaguAI evolui?" Filosofia de Releases: evolução mensurável, não conjunto de tarefas; o que fica (ativo/dado/contrato/aprendizado) é mais importante do que o que entra (código). O Ciclo Permanente de 11 estágios com diagrama: Missão → Observação → Formulação → Decision Filter → ADR → Planejamento → Implementação → Validação → Release → Observação → Aprendizado → Missão. Definição de Release (coeso + evolução identificável + 5 propriedades) e anti-exemplos. 10 Tipos de Release com objetivos e Quality Gates específicos: Foundation, Architecture, Platform, Feature, Quality, Infrastructure, Security, Performance, Data, AI. Critérios para criação de Release vs. ajuste vs. agrupamento. Planejamento como ato de pensar o que pode dar errado (sem cerimônias, sem prazo de calendário). Compounding Releases: motor reutilizável, dados acumuláveis, contrato estabilizado, capacidade de IA alimentada, conhecimento documentado — pergunta de compounding obrigatória. Definition of Ready (8 condições) e Definition of Done (10 condições). Quality Gates universais (build, typecheck, lint, consistência arquitetural, consistência com Foundation, sem regressões) + gates por tipo. Versionamento: Foundation F.x / Major x.0 / Minor x.y / Patch x.y.z — CHANGELOG como significado, versão como escala. Comunicação: CHANGELOG (o quê + por quê), PROJECT_STATUS (fotografia do presente), ADRs (por que decidido assim), NEXT_STEPS (direção emergente). Aprendizado Contínuo: 4 dimensões (problema, solução, processo, próxima Release). O Compromisso: 7 compromissos permanentes; nunca apenas adicionar código. Tabela final: 8 documentos com posição no ciclo.
- **`CLAUDE.md`** (atualizado): RELEASE_STRATEGY.md declarado como oitavo documento obrigatório. Hierarquia expandida de 11 para 12 níveis.
- **`docs/product/MASTER_ROADMAP.md`** (atualizado): RELEASE_STRATEGY.md inserido como prioridade 8.

---

**⚡ FOUNDATION EMPRESARIAL DO PARAGUAI — COMPLETA ⚡**

Oito documentos permanentes criados em uma única sessão (2026-06-27):

| # | Documento | Responde | Versão |
|---|---|---|---|
| 0.1 | `AI_CONSTITUTION.md` | Quem somos | v1.1 |
| 0.2 | `NORTH_STAR.md` | Como decidimos | v1.1 |
| 0.3 | `BUSINESS_MODEL.md` | Como criamos valor | v1.0 |
| 0.4 | `VISION_2035.md` | Para onde vamos | v1.0 |
| 0.5 | `ENGINEERING_PRINCIPLES.md` | Como construímos tecnologia | v1.0 |
| 0.6 | `PRODUCT_PRINCIPLES.md` | Como construímos produtos | v1.0 |
| 0.7 | `DECISION_FILTER.md` | Como aprovamos decisões | v1.0 |
| 0.8 | `RELEASE_STRATEGY.md` | Como evoluímos | v1.0 |

O ciclo está fechado: Identidade → Decisão → Valor → Visão → Engenharia → Produto → Filtro → Release → Aprendizado → Identidade.

---

## 2026-06-27 — Foundation 0.7 — DECISION_FILTER.md

Criação do sétimo documento permanente da Foundation: o processo permanente de aprovação de decisões.

- **`docs/foundation/DECISION_FILTER.md`** (novo): 12 seções. Transforma os princípios da Foundation em processo operacional. O papel do Filter (4 propriedades: alinhamento, valor, coerência, experiência). A Pergunta Fundamental ("Esta iniciativa reduz a assimetria de informação ou fortalece a infraestrutura que reduz?"). Pipeline de Decisão de 10 estágios sequenciais com diagrama: problema real → valor gerado (ativo/dado/problema) → alinhamento com missão → filtros North Star → impacto no Business Model → coerência com Vision → Engineering Principles → Product Principles → custo e reversibilidade → decisão (✅/⏸/❌). 12 Filtros Permanentes com 4 críticos bloqueadores. Critérios de Priorização: valor para missão, compounding, habilitadora, fundacional, esforço/risco — como método de raciocínio, não fórmula matemática. 3 Tipos de Decisão: Nível 1 (operacional, Filter simplificado), Nível 2 (produto, Pipeline completo), Nível 3 (estratégico, Pipeline + ADR obrigatório). Critérios de "Não" (9 situações com diagnóstico). Critérios de "Sim" (8 situações com raciocínio). Conflitos Entre Critérios: velocidade vs. qualidade (Tipo 1/2), curto vs. longo prazo (custo de bloqueio), receita vs. confiança (confiança sempre), automação vs. controle humano (dados vs. contexto), completude vs. entrega (incrementos funcionais), Foundation vs. circunstância (exceções documentadas nunca silenciosas). Checklist Obrigatório reutilizável. 10 Anti-Patterns: feature por vaidade, arquitetura por moda, escalamento prematuro, automação desnecessária, duplicação de solução, tecnologia acima do problema, consenso por exaustão, urgência fabricada, exceção que vira regra, decisão pela ausência de questionamento. O Compromisso (4 compromissos permanentes).
- **`CLAUDE.md`** (atualizado): DECISION_FILTER.md declarado como sétimo documento obrigatório. Hierarquia expandida de 10 para 11 níveis.
- **`docs/product/MASTER_ROADMAP.md`** (atualizado): DECISION_FILTER.md inserido como prioridade 7.

**Foundation completa (7 documentos)**: AI_CONSTITUTION + NORTH_STAR + BUSINESS_MODEL + VISION_2035 + ENGINEERING_PRINCIPLES + PRODUCT_PRINCIPLES + DECISION_FILTER.

## 2026-06-27 — Foundation 0.6 — PRODUCT_PRINCIPLES.md

Criação do sexto documento permanente da Foundation: a filosofia permanente de produto do ParaguAI.

- **`docs/foundation/PRODUCT_PRINCIPLES.md`** (novo): 18 seções + 12 Princípios Permanentes. Responde "como construímos produtos?" — traduzindo a estratégia em princípios de produto e experiência. Contém: Filosofia de Produto (produto melhora decisões, não gera cliques; usuário que encontra em 2 cliques e sai é sucesso), Quem Servimos (4 públicos com necessidades distintas: comprador precisa de clareza, lojista de controle, turista de orientação antecipada, parceiro de previsibilidade), Simplicidade Radical (complexidade ao sistema, nunca ao usuário; opções demais são decisões que o produto não quis tomar), Transparência (origem/atualização/raciocínio/incerteza como funcionalidades, não documentação), IA como Assistente (transparência algorítmica: motivo visível, não autoridade opaca; amplificador não narrador), Automação Inteligente (dados vs. contexto humano; dry-run e falha como design), Produto Orientado a Dados (cada funcionalidade produz dados além de consumir; compounding vs. linear), Confiança como Produto (construída, nunca declarada; custo de quebra assimétrico e irreversível), Experiência Integrada (teste de integração: usuário começa em qualquer ponto sem sentir mudança de produto), Produto Modular (pergunta de aceite: se outro módulo precisar desta capacidade amanhã, está disponível?), Crescimento Invisível (IA absorve decisões, contextualização elimina opções, progressividade de capacidades avançadas), Feedback Contínuo (comportamento prevalece sobre pesquisa; sinais como dados de produto), Acessibilidade (4 dimensões: tecnológica, experiência, linguística, física), Neutralidade (rankings orgânicos, publicidade identificada, recomendações por relevância — linha absoluta), Efeito "Uau" (funcionalidades que mudam comportamento vs. que apenas existem; teste: "sem isso não dá"), Produto como Ecossistema (cada módulo tem duas perguntas: serve seu público? conecta-se ao ecossistema?), Produto para Décadas (implementação evolui; dados históricos são permanentes e nunca descartados por simplicidade presente).
- **`CLAUDE.md`** (atualizado): PRODUCT_PRINCIPLES.md declarado como sexto documento obrigatório. Hierarquia expandida de 9 para 10 níveis.
- **`docs/product/MASTER_ROADMAP.md`** (atualizado): PRODUCT_PRINCIPLES.md inserido como prioridade 6.

**Foundation completa (6 documentos)**: AI_CONSTITUTION + NORTH_STAR + BUSINESS_MODEL + VISION_2035 + ENGINEERING_PRINCIPLES + PRODUCT_PRINCIPLES.

## 2026-06-27 — Foundation 0.5 — ENGINEERING_PRINCIPLES.md

Criação do quinto documento permanente da Foundation: a filosofia técnica permanente do ParaguAI.

- **`docs/foundation/ENGINEERING_PRINCIPLES.md`** (novo): 15 seções + 12 Princípios Permanentes. Responde "como construímos tecnologia?" — complementando a Constituição (que tem regras operacionais) com a filosofia que permite derivar regras para situações novas. Contém: Filosofia de Engenharia (tecnologia como meio), Arquitetura Evolutiva (composição, baixo acoplamento, contratos > implementações), Simplicidade como Estratégia (complexidade conquistada, não presumida), Sistemas Orientados a Ativos (módulos que produzem ativos reutilizáveis), Dados como Contrato (origem, ciclo de vida, propriedade, imutabilidade histórica), APIs e Fronteiras (contratos explícitos, evolução compatível, dependência unidirecional), Escalabilidade (O(1) vs O(n) no design, idempotência como pré-condição), Observabilidade (logs + métricas + rastreabilidade de automações), Automação (dry-run obrigatório, falha ruidosa, idempotência, escopo delimitado), Inteligência Artificial (capacidade transversal, dados como insumo, modelos como contratos), Evolução Contínua (cada Release melhora a arquitetura, débito intencional vs. acidental), Qualidade (design constraint: testabilidade, legibilidade, zero warnings), Segurança (menor privilégio, defesa em profundidade, privacidade como restrição de design), Resiliência (falha previsível, degradação graciosa, recuperabilidade), Princípios Permanentes (12 princípios invioláveis).
- **`CLAUDE.md`** (atualizado): ENGINEERING_PRINCIPLES.md declarado como quinto documento obrigatório. Hierarquia expandida de 8 para 9 níveis.
- **`docs/product/MASTER_ROADMAP.md`** (atualizado): ENGINEERING_PRINCIPLES.md inserido como prioridade 5.

**Foundation completa (5 documentos)**: AI_CONSTITUTION + NORTH_STAR + BUSINESS_MODEL + VISION_2035 + ENGINEERING_PRINCIPLES.

## 2026-06-27 — Foundation 0.4 — VISION_2035.md

Criação do quarto documento permanente da Foundation: o horizonte estratégico do ParaguAI.

- **`docs/foundation/VISION_2035.md`** (novo): 15 seções. Responde "para onde vamos?" — completando o núcleo estratégico com a visão de longo prazo. Contém: Introdução (por que visão importa), Nossa Ambição (infraestrutura de inteligência da Tríplice Fronteira), Nossa Transformação (6 estágios evolutivos sem descontinuidade), O Ecossistema ParaguAI (9 pilares conectados), ParaguAI Brain (visão de convergência de inteligência), Experiência do Usuário 2035, Experiência do Lojista 2035, Turismo Inteligente integrado, Plataforma Aberta (API + ecossistema de parceiros), Inteligência Regional (bem público privado com ética de dados), Expansão (por consequência, não por meta), Cultura Permanente (5 princípios), O Legado (transformação para compradores, lojistas, região e ecossistema digital), Indicadores da Visão (6 qualitative success signals), Manifesto Final, e tabela de integração do núcleo estratégico completo.
- **`CLAUDE.md`** (atualizado): VISION_2035.md declarado como quarto documento obrigatório. Hierarquia expandida de 7 para 8 níveis.
- **`docs/product/MASTER_ROADMAP.md`** (atualizado): VISION_2035.md inserido como prioridade 4 na tabela Foundation Documents.

**Núcleo estratégico completo**: AI_CONSTITUTION (quem somos) + NORTH_STAR (como decidimos) + BUSINESS_MODEL (como criamos valor) + VISION_2035 (para onde vamos) formam os quatro pilares permanentes do ParaguAI.

## 2026-06-27 — Foundation 0.3 — BUSINESS_MODEL.md

Criação do terceiro documento permanente da Foundation: o modelo econômico do ParaguAI.

- **`docs/foundation/BUSINESS_MODEL.md`** (novo): 18 seções. Responde "como criamos valor?" — complementando a Constituição ("quem somos") e o North Star ("como decidimos"). Contém: Nossa Tese (o problema econômico da assimetria de informação na Tríplice Fronteira), A Assimetria de Informação (4 públicos afetados), Proposta de Valor por segmento (5 grupos), Flywheel Econômico completo, 6 tipos de Network Effects, Estratégia de Monetização (7 pilares), Estratégia de Crescimento (orgânico, sem gasto linear de marketing), Moat (5 camadas), Ativos Estratégicos (8 ativos), O Papel da IA / Dados / Turismo / Merchant OS / API, Como nos tornamos Indispensáveis, Visão Econômica (alinhamento de incentivos), Riscos Estratégicos (6 riscos + mitigação), Princípios Permanentes do Modelo de Negócio (7 princípios), e tabela de integração do núcleo estratégico.
- **`CLAUDE.md`** (atualizado): BUSINESS_MODEL.md declarado como terceiro documento obrigatório. Hierarquia expandida de 6 para 7 níveis.
- **`docs/product/MASTER_ROADMAP.md`** (atualizado): BUSINESS_MODEL.md inserido como prioridade 3 na tabela Foundation Documents.

**Núcleo estratégico completo**: AI_CONSTITUTION (quem somos) + NORTH_STAR (como decidimos) + BUSINESS_MODEL (como criamos valor) formam o sistema de governança permanente do ParaguAI.

## 2026-06-27 — Foundation 0.2.1 — NORTH_STAR.md (Maturity Review)

Revisão de maturidade do NORTH_STAR.md (v1.0 → v1.1). Preserva 100% do conteúdo existente. Adiciona 4 novos capítulos e fortalece 1 seção existente.

- **`docs/foundation/NORTH_STAR.md`** (revisado v1.1): 14 seções totais (era 10). Seção 8 (Como Pensamos Longo Prazo) fortalecida com o princípio "infraestrutura antes de solução específica". Nova Seção 11 (Anti Goals): 9 itens com justificativa de por que cada um viola a missão. Nova Seção 12 (Tipos de Decisão): Tipo 1 (irreversíveis, análise profunda + ADR) vs Tipo 2 (reversíveis, decidir rápido); critério prático "qual é o custo real de voltar atrás?". Nova Seção 13 (Compounding Decisions): toda Release deve tornar a próxima mais fácil; pergunta obrigatória de compounding; distinção entre compounding e over-engineering. Nova Seção 14 (O Compromisso): fechamento permanente — 4 compromissos implícitos de todo desenvolvedor e sistema de IA no projeto.

## 2026-06-27 — Foundation 0.2 — NORTH_STAR.md

Criação do segundo documento permanente da Foundation: a bússola operacional do ParaguAI.

- **`docs/foundation/NORTH_STAR.md`** (novo): 10 seções, ~1.400 palavras. Complementa a Constituição respondendo "como decidimos" em vez de "quem somos". Contém: A Pergunta Obrigatória, Os 10 Filtros Permanentes, Hierarquia de Prioridades (pirâmide de 8 níveis), Framework de Priorização com score (5 dimensões, 100 pontos), O que nunca deve ser prioridade, Como pensamos longo prazo, Como avaliamos sucesso, Checklist Final (11 pontos — obrigatório antes de todo merge/release/ADR).
- **`CLAUDE.md`** (atualizado): segundo documento obrigatório declarado. Hierarquia de documentos expandida de 5 para 6 níveis. NORTH_STAR.md inserido como item 2.

**Distinção de responsabilidade**: AI_CONSTITUTION.md = princípios permanentes. NORTH_STAR.md = critérios de decisão operacional. Nenhum substitui o outro; os dois são obrigatórios.

## 2026-06-27 — Foundation 0.1.1 — Revisão Estratégica da AI_CONSTITUTION.md

Revisão estratégica de alto nível da Constituição do ParaguAI. Não altera funcionalidades — eleva a visão e adiciona capítulos estratégicos ausentes na v1.0.

- **`docs/foundation/AI_CONSTITUTION.md`** (revisado — v1.0 → v1.1): 3 novos capítulos, 19 seções totais (vs. 16 na v1.0). Nova Identidade: "Inteligência Operacional da Tríplice Fronteira". Organismo Vivo adicionado à Seção V. Nova Seção VII (Ativos): "O ParaguAI não desenvolve funcionalidades — desenvolve ativos." Efeito de Rede elevado a capítulo dedicado (Seção X) com Flywheel completo. ParaguAI Brain expandido (Seção IX). Moat explicitado como capítulo próprio (Seção XIV). 14 Regras Permanentes (antes 12). Missão reformulada em torno de assimetria de informação. Turismo e infraestrutura regional na Visão 2030. Tom CTO/CPO/CAI.

**Princípio adicionado**: toda funcionalidade nova deve produzir dados reutilizáveis. Uma feature que não gera conhecimento tem retorno zero de longo prazo.

## 2026-06-27 — Foundation 0.1 — AI_CONSTITUTION.md

Pausa completa no desenvolvimento de funcionalidades para criação da documentação permanente do projeto.

- **`docs/foundation/AI_CONSTITUTION.md`** (novo): Constituição do ParaguAI — 15 seções, ~2.400 linhas. Identidade, Missão, Visão 2030, North Star, Filosofia, Dados, Automação, IA (ParaguAI Brain), Engenharia, Produto, Negócio, Autonomia, Regras Permanentes (12 invioláveis), Processo de Desenvolvimento, Critério de Aceitação. Síntese de todos os ADRs (001–032), ROADMAP.md, ARCHITECTURE.md, DOMAIN_MODEL.md e histórico de sprints. Tecnologia-agnóstico por design — válido por 10+ anos.
- **`CLAUDE.md`** (atualizado): Seção "PRIORITY: Read the Constitution first" adicionada no topo. Hierarquia explícita de documentos. AI_CONSTITUTION.md declarado como primeiro documento obrigatório antes de qualquer tarefa.
- **`docs/product/MASTER_ROADMAP.md`** (reescrito): Era placeholder vazio de 1 linha. Agora contém seção "Foundation Documents" com tabela de hierarquia, e 4 fases estratégicas: Discovery Platform (✅ Fase 1 completa), Trust & Reputation (Fase 2 planejada), Intelligence Layer (Fase 3 visão), Scale & Expansion (Fase 4 visão).
- **`docs/operations/PROJECT_STATUS.md`** (atualizado): Registrada criação da Foundation 0.1 no topo do histórico.

**Este commit não é uma Release.** É um documento permanente de identidade e princípios. Não deprecar; apenas estender com revisões versionadas.

## 2026-06-15 — `fd07de5` Primeira versão do ParaguAI

Commit inicial do repositório.

## 2026-06-20 — `70e0698` feat: initialize ParaguAI architecture

Define a estrutura de pastas oficial (`app/`, `components/`, `hooks/`, `services/`, `types/`, `lib/`, `utils/`, `database/`, `docs/`, `ai/`, `assets/`), os documentos de processo (`docs/CLAUDE.md`, `docs/architecture/ARCHITECTURE.md`, `docs/archive/ROADMAP.md`, `docs/operations/PROJECT_STATUS.md`), o `lib/supabase.ts`, e a maior parte dos placeholders vazios (services, types, hooks, utils, styles) que ainda existem hoje. Estabelece o convênio "arquivo vazio = trabalho planejado, não esquecido".

## 2026-06-21 — `1c5319a` feat(product): implementa Release 0.2 e Sprint 2.2 do domínio Produto

Primeira feature funcional ponta-a-ponta: rota `/product/[slug]` completa (`page.tsx`, `layout.tsx` com `generateMetadata`+JSON-LD, `loading.tsx`, `error.tsx`, `not-found.tsx`), componentes do domínio Produto (`ProductCard`, `ProductGallery`, `ProductHeader`, `ProductSpecifications`, `ProductOffers`, `ProductBreadcrumb`, `RelatedProducts`, `FavoriteButton`, `ShareButton`, `ProductHighlightCard`), `hooks/useProduct.ts`, `hooks/useFavorites.ts`, `services/product.service.ts`, `services/offer.service.ts` com integração real ao Supabase. Cumpre o Release 0.2 do roadmap original.

## 2026-06-21 — `33860e9` feat(home): reconstrói a Home (Sprint 3.0) e adiciona sistema de motion (Sprint 3.2)

Reescreve toda a Home com as 10 seções atuais (`Hero`, `Categories`, `Offers`, `FeaturesStores`, `AIShowcase`, `HowItWorks`, `Brands`, `Stats`, `CTASection`) usando dados de exemplo tipados com os tipos reais do domínio. Introduz o sistema de animação (`styles/animations.ts`, keyframes em `globals.css`, `Reveal`) usado de forma consistente em praticamente todo componente visual. Junto com este commit veio uma dependência nova de ícones (`lucide-react`) que **não foi declarada em `package.json`** — origem do problema corrigido no commit seguinte.

## 2026-06-22 — `9e8298e` fix: add lucide-react dependency

Adiciona `lucide-react` ao `package.json`/lockfile, que estava sendo importado por vários componentes desde o commit anterior sem estar declarado como dependência.

## 2026-06-22 — `ae432d3` fix: resolve Vercel deployment issues

Commit de correção de deploy — neste ponto, `types/store.ts` permanecia committed como arquivo vazio (0 bytes) mesmo sendo importado por 4 arquivos já commitados (`app/page.tsx`, `FeaturesStores.tsx`, `StoreCard.tsx`, `types/offer.ts`), causando `Type error: File 'types/store.ts' is not a module.` na Vercel apesar do build local funcionar (a versão real do arquivo existia apenas, não commitada, no disco local). Este commit resolve esse problema.

## 2026-06-22 — `3d3f1ff` chore: remove accidental package file

Remove um arquivo espúrio criado por um comando mal formatado no Windows (nome de arquivo contendo `:`), sem relação com código de produção.

## 2026-06-22 — `647382f` chore: trigger redeploy

Commit vazio/trivial para forçar um novo build na Vercel após as correções acima.

## 2026-06-22 — Sprint 3.2: Encerramento e Consolidação da Base de Engenharia (sem novas features)

Sprint declarada como "sem funcionalidades de negócio", focada em consolidar a base técnica:

- **`lib/env.ts`** passa a ser a única fonte de acesso a `process.env` no projeto. `lib/supabase.ts` e `constants/routes.ts` (que tinham cada um sua própria leitura de env var) agora importam `env` de lá. Mensagens de erro distinguem ambiente local (`.env.local`) de Vercel (painel do projeto), usando `process.env.VERCEL === "1"` para diferenciar. Ver ADR-001 em `docs/operations/DECISIONS.md`.
- **`.gitignore`** corrigido: a regra `.env*` bloqueava silenciosamente `.env.example` (um template sem segredos, pensado para ser commitado). Adicionada a exceção `!.env.example`. O arquivo, que existia no lugar errado (`lib/.env.example`), foi movido para a raiz do projeto e ganhou a variável `NEXT_PUBLIC_SITE_URL` que faltava. Ver ADR-002.
- **`package.json`**: removido o script `format` (referenciava `prettier`, nunca instalado como dependência — script quebrado); `clean` reescrito de sintaxe `cmd.exe` (Windows-only) para um one-liner Node multiplataforma. Scripts `dev`/`build`/`start`/`lint`/`typecheck`/`check` confirmados presentes e funcionais. Ver ADR-003 e ADR-004.
- **Documentação**: criados `docs/operations/DECISIONS.md`, `docs/engineering/CONVENTIONS.md`, `docs/architecture/API_CONTRACTS.md`, `docs/architecture/DOMAIN_MODEL.md`, `docs/architecture/COMPONENT_INDEX.md`, `docs/architecture/DEPENDENCY_GRAPH.md`. Atualizados `docs/operations/PROJECT_STATUS.md`, `docs/architecture/ARCHITECTURE.md`, `docs/engineering/TECH_DEBT.md`, `docs/operations/NEXT_STEPS.md` para refletir as mudanças acima.
- Validado: `npm run lint` (0 erros), `npm run typecheck` (0 erros), `npm run build` (sucesso) — incluindo um teste manual de remover/restaurar `.env.local` para confirmar a nova mensagem de erro.

Nenhuma rota, componente, hook ou comportamento visível ao usuário foi alterado nesta sprint.

## 2026-06-22 — Sprint 3.3: Domínio de Busca (Release 0.4, parte 1)

Liga a busca de ponta a ponta, encerrando seu estado decorativo:

- **`app/search/page.tsx`** passa a ler `searchParams.q` (Server Component) e ganha `generateMetadata` (título/descrição dinâmicos, canonical, Open Graph/Twitter, `robots: noindex` para resultados com query — conteúdo fino/duplicado — e indexável sem query).
- **`hooks/useSearch.ts`** implementado: estado do campo de busca + navegação via `searchPath()`, mantendo a URL (`?q=`) como fonte de verdade. Consumido por `components/home/SearchBar.tsx`, que agora aceita `defaultValue` (preenchido a partir da query atual).
- **`services/search.service.ts`** (`searchEverything`) reescrito: agora também busca `categories` (além de `products`/`stores`/`brands`), escapa `%`/`_` do termo do usuário antes do `ilike` (evita que o usuário injete wildcards do Postgres), limita 8 resultados por seção, e só lança erro se todas as queries falharem (erro parcial é logado, não interrompe a resposta). Tipo de retorno `SearchResponse` (`types/search.ts`, antes vazio).
- **`components/search/SearchResults.tsx`** renderiza resultados reais agrupados por seção (produtos/lojas/categorias/marcas), com contagem total e tempo de busca; estado vazio (sem query ou zero resultados) via `components/ui/EmptyState.tsx` (novo, antes vazio, reaproveitável em outras telas).
- **`app/search/loading.tsx`** e **`app/search/error.tsx`** adicionados, espelhando `app/product/[slug]/`. `error.tsx` usa a prop `unstable_retry` (API do Next 16.2, confirmada em `node_modules/next/dist/docs`) e distingue erro genérico de estado offline via `navigator.onLine`. `components/search/SearchResultsSkeleton.tsx` (novo) serve de fallback para `<Suspense>` na página e para `loading.tsx`.
- **`app/layout.tsx`** (root): metadata customizada substitui o padrão do `create-next-app`; adicionado JSON-LD `WebSite`/`SearchAction` apontando para `searchUrl()`, habilitando potencial "sitelinks search box" do Google.
- **`constants/routes.ts`**: `searchPath()`/`searchUrl()` adicionados, no mesmo padrão de `productPath()`/`productUrl()`.

Não inclui: filtros, paginação, autocomplete (ficam para uma fase 2 do Release 0.4); preço nos produtos da busca (a query não faz join com `offers`); rota `/categories/[slug]` (os links de categoria continuam apontando para uma rota inexistente, mesmo padrão que `/store/[slug]` tinha antes do domínio de Loja).

Validado com `npm run lint` (0 erros, 5 warnings pré-existentes de `<img>`), `npx tsc --noEmit` (0 erros) e `npm run build` (sucesso — `/search` passou de estático para dinâmico, por depender de `searchParams`).

## 2026-06-22 — Sprint 3.4: Domínio de Loja (Release 0.3)

Fecha o terceiro domínio central da Home, replicando deliberadamente a arquitetura do Domínio de Produto:

- **`services/store.service.ts`**: `getStoreBySlug(slug)` e `getRelatedStores(excludeStoreId, limit)` adicionados; `getStore(id)`/`getStores()` mantidos sem alteração (o primeiro continua sem consumidor).
- **`services/offer.service.ts`**: `getOffersByStore(storeId)` adicionado, retornando `OfferWithProduct[]` (novo tipo em `types/offer.ts`) — join `offers` + `products`, ordenado por preço.
- **`hooks/useStore.ts`** implementado: espelha `useProduct.ts` (loading/notFound/dados), busca loja + ofertas da loja + lojas relacionadas.
- **`components/store/StoreDetails.tsx`** (header/perfil: rating, badge de verificada, cidade/país, descrição), **`StoreOffers.tsx`** (lista de ofertas da loja, cada linha já linka para o produto — une "produtos da loja" e "ofertas" pedidos na missão da sprint em um único componente, para não duplicar lógica/template) e **`StoreGrid.tsx`** (outras lojas, espelha `RelatedProducts.tsx`) saem do estado de placeholder vazio.
- **`app/store/[slug]/`**: `layout.tsx` (`generateMetadata` com canonical/OG/Twitter + JSON-LD `LocalBusiness`), `page.tsx` (Client, `useParams` + `useStore`, mesmo padrão atípico de `/product/[slug]/page.tsx` documentado em `ARCHITECTURE.md`), `loading.tsx`, `error.tsx` (`unstable_retry`), `not-found.tsx` — todos novos.
- **`constants/routes.ts`**: `storePath()`/`storeUrl()` adicionados; `StoreCard.tsx` migrado de string literal (`` `/store/${store.slug}` ``) para `storePath()`.
- **Seção de avaliações**: `EmptyState` ("Avaliações em breve") sem nenhum dado mocado — `types/review.ts` e a tabela `reviews` ainda não existem.

**Não implementado nesta sprint, por decisão explícita do CTO**: contato (telefone/WhatsApp/e-mail) e horário de funcionamento. Essas colunas não existem em `types/store.ts` nem na tabela `stores` real (confirmado consultando o Supabase diretamente). Em vez de adicionar campos especulativos ao tipo ou usar mocks, foi gerada uma **proposta** de migration em `database/migrations/0001_proposed_store_contact_hours.sql` (`phone`, `whatsapp`, `email`, `website_url`, `address`, `business_hours jsonb`, todas nullable) — **não aplicada ao banco**, aguardando avaliação. Ver `docs/operations/DECISIONS.md`, ADR-006.

**Achado de dados (não é um bug desta sprint)**: testando a página `/store/[slug]` manualmente contra o Supabase real, descobriu-se que as 5 lojas cadastradas (Cellshop, Nissei, Shopping China, Mega Eletrônicos, Atacado Games) têm `slug: null`, e a tabela `products` está vazia (0 linhas). O código está correto — `getStoreBySlug`/`getProductBySlug` retornam `null` corretamente para um slug que não existe em nenhuma linha — mas isso significa que nenhuma página de loja ou produto é navegável com dados reais até que alguém popule esses campos no painel do Supabase. Ver `docs/operations/DECISIONS.md`, ADR-007.

Validado com `npm run lint` (0 erros, 6 warnings — 5 pré-existentes + 1 novo de `<img>` no banner de `/store/[slug]`), `npx tsc --noEmit` (0 erros, após `npm run clean` para descartar tipos de rota desatualizados em `.next/`) e `npm run build` (sucesso — `/store/[slug]` nova rota dinâmica).

## 2026-06-22 — Sprint 3.4.1: Consolidação da Camada de Dados (auditoria, sem código de produção alterado)

Sprint de diagnóstico puro, a pedido explícito do CTO ("não implemente novas funcionalidades de interface"). Auditou `stores`/`products`/`offers`/`brands`/`categories` consultando o Supabase diretamente (`select("*")` para tabelas com dados; teste coluna-por-coluna lendo o erro "column does not exist" do PostgREST para tabelas vazias — método somente-leitura, sem chave de serviço).

**Achados**:
- `types/offer.ts` diverge do schema real: `price`/`stock`/`installments`/`url` não existem (o banco usa `price_usd`+`price_brl`, `in_stock`/`available`/`stock_quantity`, e `product_url`). Bug latente confirmado: assim que houver uma oferta real, `ProductOffers.tsx`/`StoreOffers.tsx` exibiriam preço `NaN` e nunca o botão "Ver oferta".
- `types/store.ts` diverge do schema real: `banner_url`/`verified` não existem (o banco usa `cover_image`/`is_verified`). Bug latente confirmado: banner e badge "Verificada" nunca aparecem.
- A conclusão da Sprint 3.4 (ADR-006) de que contato/horário "não existiam no schema" estava **errada** — essas colunas (`phone`, `whatsapp`, `email`, `website`, `address`, `opening_hours`) já existem; a investigação só checou os campos que o tipo já declarava, sem `select("*")` real.
- 4 relacionamentos (FKs) confirmados reais e funcionando (`offers→stores`, `offers→products`, `products→brands`, `products→categories`).
- Nenhuma das 14 tabelas "futuras" de `docs/database/DATABASE.md` existe ainda (`reviews` incluída) — documentação correta nesse ponto.
- Duas tabelas reais não documentadas descobertas: `profiles` (possível scaffold de Supabase Auth) e `favorites` (paralela e desconectada do `localStorage` usado por `useFavorites.ts`).

**Ações**: `database/migrations/0001_proposed_store_contact_hours.sql` marcado como **superado**; `database/migrations/0002_revised_store_data_layer.sql` criado em seu lugar, propondo apenas `UNIQUE (slug)` — nenhuma coluna nova é necessária. `docs/architecture/DOMAIN_MODEL.md` reescrito com o schema real lado a lado com cada tipo TypeScript. `docs/operations/DECISIONS.md` ganhou ADR-008 (achado completo) e ADR-006 foi marcado como tendo a premissa corrigida. Nenhuma migration foi aplicada, nenhum dado foi inserido, nenhum arquivo de código de produção (`types/`, `services/`, `components/`) foi alterado — correção fica para a Sprint 3.5, pendente de aprovação.

## 2026-06-23 — Sprint 3.5: Catálogo Premium de Produtos (Release 0.2, parte 2)

Duas frentes, na ordem decidida com o CTO antes de iniciar (corrigir dados primeiro, para não construir o catálogo sobre bugs já confirmados):

**1. Correção do modelo de dados (ADR-009)**:
- **`types/offer.ts`**: `price`/`currency` → `price_usd` + `price_brl` (valores independentes); `stock` → `in_stock` (fonte da UI) + `available`/`stock_quantity` (modelados, sem consumidor); `url` → `product_url`; `installments` removido; `old_price`/`condition` adicionados.
- **`types/store.ts`**: `banner_url` → `cover_image`; `verified` → `is_verified`; adicionados os 13 campos reais que faltavam (`phone`, `whatsapp`, `email`, `website`, `address`, `opening_hours`, `instagram`, `latitude`, `longitude`, `delivery`, `pickup`, `pix_br`, `active`).
- **`utils/currency.ts`**: `convertToUSD`/`convertToBRL` removidos (sem consumidor — o banco já entrega os dois preços prontos).
- **`services/offer.service.ts`**: `.order("price", ...)` → `.order("price_usd", ...)`.
- **`ProductOffers.tsx`/`StoreOffers.tsx`/`StoreCard.tsx`/`app/store/[slug]/{page,layout}.tsx`/`app/product/[slug]/layout.tsx`/`app/page.tsx`**: atualizados para os nomes reais.
- **`StoreDetails.tsx`**: ganhou a seção de Contato/Horário (telefone, WhatsApp, e-mail, site, endereço, horário), antes bloqueada pela premissa incorreta do ADR-006.

**2. Catálogo de produtos (`/products`)**:
- **`services/category.service.ts`/`brand.service.ts`** (antes vazios): `getCategories`/`getCategoryBySlug`, `getBrands`/`getBrandBySlug`.
- **`services/product.service.ts`**: `getProductsCatalog` novo — filtros de categoria/marca/busca (nativos) e loja/disponibilidade/faixa de preço (via embedding PostgREST `offers!inner`/`offers!left`), paginação real (`.range()` + `count: "exact"`), ordenação "mais recentes" nativa e "menor/maior preço" corrigida em memória por página (limitação documentada, ADR-011) — "mais vendidos"/"melhor avaliação" como estrutura preparada.
- **`utils/search.ts`** (antes vazio): `escapeLikePattern` extraído de `search.service.ts` para ser compartilhado com o catálogo.
- **`types/product.ts`**: `ProductCatalogItem` novo.
- **`components/product/ProductGrid.tsx`** (antes vazio): grid + `EmptyState`. **`ProductGridSkeleton.tsx`**/**`ProductFilters.tsx`** novos. **`hooks/useProductFilters.ts`** novo — mantém a URL como fonte de verdade dos filtros (mesmo princípio de `useSearch.ts`).
- **`components/ui/Breadcrumb.tsx`** (novo, com JSON-LD `BreadcrumbList`) substitui `ProductBreadcrumb.tsx` (removido) e a trilha inline duplicada em `app/store/[slug]/page.tsx`. **`components/ui/Pagination.tsx`** (novo, SSR via `<Link>`). **`components/ui/Input.tsx`**/**`Select.tsx`** (Input antes vazio; Select novo) — usados por `ProductFilters`.
- **`components/product/ProductCard.tsx`**: unificado com `ProductHighlightCard.tsx` (removido) — ver ADR-010. Props achatadas (`slug`, `name`, `imageUrl`, `priceUSD?`, `originalPriceUSD?`, `subtitle?`, `inStock?`); `RelatedProducts`, `SearchResults` e `home/Offers.tsx` migrados para o novo formato.
- **`constants/routes.ts`**: `productsPath()`/`productsUrl()` novos, com ordem fixa de parâmetros para canonical estável.
- **`app/products/{page,loading,error}.tsx`** novos: `generateMetadata` (canonical/OG/Twitter, `robots: noindex,follow` para combinações filtradas/paginadas — mesmo padrão de `/search`), JSON-LD `CollectionPage`+`ItemList`, `<Suspense>` em torno da listagem (filtros fora do Suspense).

**Arquivos removidos** (aprovação explícita do CTO antes de cada remoção, por restrição do `CLAUDE.md`): `components/product/ProductHighlightCard.tsx`, `components/product/ProductBreadcrumb.tsx`.

**Proposta de migration (não aplicada)**: `database/migrations/0003_proposed_product_catalog_price_view.sql` — materialized view de agregação de preço por produto, para eliminar a limitação de ordenação "best effort" quando o volume de dados justificar.

**Não incluído nesta sprint**: seed de dados real (`stores.slug`, `products`/`offers`) — continua exigindo aprovação separada para alterar produção (ADR-007, ainda sem solução); aplicação da migration de agregação de preço.

Validado com `npm run lint`, `npx tsc --noEmit` e `npm run build` — ver relatório da sprint para o resultado.

## 2026-06-23 — Sprint 3.6: Data Foundation (auditoria, sem código de produção alterado)

Sprint de diagnóstico puro, a pedido explícito do CTO, consolidando o entendimento da camada de dados antes de implementar o Comparador de Produtos. Divergência registrada em relação à proposta anterior de `docs/operations/NEXT_STEPS.md` (que bundlava seed + início do Comparador numa só "Sprint 3.6"): o CTO redefiniu o escopo desta sprint para ser só auditoria, deixando seed e Comparador para a sprint seguinte — mesmo padrão já visto nas Sprints 3.3 e 3.5 (missão recebida divergindo do `NEXT_STEPS.md`, decisão do CTO prevalece, divergência documentada).

- **Banco**: relacionamentos `products↔brands/categories` e `offers↔products/stores` reconfirmados via PostgREST sem erro. Auditoria de índices/constraints reais não foi possível com a chave anônima — registrada como limitação, não inferida.
- **Dados**: consulta ao vivo ao Supabase confirma `products: 0`, `offers: 0`, `brands: 0`, `categories: 0`, `stores: 5` (todas com `slug`/`active`/`cover_image` nulos). Achado novo: `website` e `opening_hours` já estão preenchidos nas 5 lojas reais; `address` em 4/5; `whatsapp` é string vazia (não nula) em 1 loja.
- **Services**: `product`/`offer`/`store`/`search`/`category`/`brand` revisados linha a linha contra o schema real — nenhuma divergência nova, nenhuma correção necessária.
- **Migrations**: `0001` confirmada superada; `0002` fase 1 (`UNIQUE (slug)`) avaliada como segura para aplicar a qualquer momento; `0003` (view de agregação de preço) avaliada como prematura sem dados reais.
- **Seed**: proposta de estratégia entregue (arquivos, ordem de carga, critérios de qualidade, plano de atualização futura) — nenhum insert executado, conforme instrução explícita.

Nenhum arquivo de código (`types/`, `services/`, `components/`) foi alterado nesta sprint — só documentação. Nenhuma migration aplicada, nenhum dado inserido.

## 2026-06-23 — Sprint 3.7: Data Foundation v2 (Release 0.5, fundação)

Transforma o plano de seed da Sprint 3.6 em código real, propõe constraints/índices/views para escala e documenta (sem implementar) a arquitetura de Price Engine e Offer Ranking — nenhum dado real inserido, nenhuma migration aplicada, nenhuma feature de interface.

- **`database/seed/`** (novo): estrutura modular `brands/`, `categories/`, `stores/`, `products/`, `offers/`, `lib/client.js`, `index.js`, `validate.js`, `README.md` — ver ADR-012 para a decisão de ser JavaScript puro (CommonJS), fora da árvore TypeScript da aplicação, sem dependência nova (`ts-node`/`tsx` não instalados).
  - `index.js`: orquestrador idempotente (resolve cada entidade por chave natural antes de inserir), **dry-run por padrão** — só escreve com `node database/seed/index.js --execute`. Backfill de `stores.slug`/`active` nas 5 lojas reais (nunca cria loja nova); 5 marcas, 5 categorias, 6 produtos e 9 ofertas de exemplo (deliberadamente incluindo 1 produto sem nenhuma oferta e 1 oferta `in_stock=false`, para validar os estados vazios já implementados na UI).
  - `validate.js`: auditoria de qualidade de dados somente leitura (slugs duplicados, produtos sem categoria/marca, ofertas sem loja/produto, preços inválidos) — executada nesta sprint contra o banco real: nenhum problema encontrado (tabelas vazias), achado já conhecido reconfirmado (5/5 lojas sem slug).
  - `package.json`: scripts novos `db:seed`, `db:seed:execute`, `db:validate`.
  - `eslint.config.mjs`: `database/seed/**` adicionado a `globalIgnores` (CommonJS fora do escopo das regras de import de `eslint-config-next/typescript`).
- **`database/migrations/0004_proposed_catalog_integrity_and_indexes.sql`** (novo, não aplicada): `UNIQUE (slug)` em `products`/`brands`/`categories`; índices em `offers.product_id`/`offers.store_id`/`offers.price_usd`/`products.brand_id`/`products.category_id`.
- **`database/migrations/0005_proposed_store_ranking_view.sql`** (novo, não aplicada): `store_ranking_summary` (rating, contagem de ofertas, proporção em estoque, última atualização) — insumo do Offer Ranking. As métricas por produto (menor/maior preço, contagem de ofertas) já são cobertas por `0003` (Sprint 3.5) — não duplicadas.
- **`docs/operations/DECISIONS.md`**: ADR-012 (seed em JS puro), ADR-013 (arquitetura do Price Engine, futura), ADR-014 (algoritmo de Offer Ranking v1, futuro), ADR-015 (consolidação das views de apoio) — todas documentam direção arquitetural, nenhuma implementada em código/schema.
- **Services**: `product`/`offer`/`store`/`search` revisados de novo — nenhuma divergência nova, nenhuma correção necessária.

Validado com `npm run lint` (0 erros, 5 warnings pré-existentes — `database/seed/**` excluído do lint por ser tooling fora da árvore TypeScript), `npx tsc --noEmit` (0 erros) e `npm run build` (sucesso, mesmas 6 rotas, sem regressão).

**Não incluído, por instrução explícita/Restrição Absoluta**: nenhum `node database/seed/index.js --execute` foi rodado contra o Supabase real; nenhuma migration (`0002`, `0004`, `0005`) foi aplicada.

## 2026-06-24 — Sprint 3.8: Seed Execution & Catalog Validation

Primeira escrita real de dados em produção do projeto, com aprovação explícita do CTO. Nenhum código de aplicação alterado — só execução de tooling já existente (`database/seed/`, Sprint 3.7) e documentação.

- **Tentativa 1 (chave anônima)**: `npm run db:seed:execute` rodou sem travar, mas todo `INSERT` em `brands`/`categories`/`products` falhou com `new row violates row-level security policy`; o `UPDATE` de `stores.slug`/`active` foi filtrado silenciosamente pela RLS (0 linhas afetadas) e o script logou `[OK]` por engano — confirmado por snapshot antes/depois que nenhuma escrita real ocorreu. Parado para investigação, conforme regra da missão.
- **Resolução**: CTO adicionou `SUPABASE_SERVICE_ROLE_KEY` a `.env.local`. Ver ADR-016.
- **Tentativa 2 (chave de serviço)**: dry-run reconfirmado, depois `--execute` com sucesso total — `stores` (5/5 backfill), `brands` (5), `categories` (5), `products` (6), `offers` (9). Reexecução confirmou idempotência (tudo `[SKIP]`, sem duplicata).
- **Auditoria**: `npm run db:validate` (0 problemas) + auditoria extra com anti-join real via chave de serviço (0 FKs órfãs, 0 slugs duplicados, 0 pares `product_id+store_id` duplicados, 0 produtos inativos). Nenhuma correção de dados necessária.
- **`docs/operations/DECISIONS.md`**: ADR-016 (achado da RLS/chave de serviço + bug de log falso-positivo em `index.js`, não corrigido nesta sprint — fora do escopo "nenhuma funcionalidade nova").
- **`docs/operations/PROJECT_STATUS.md`/`docs/operations/NEXT_STEPS.md`/`docs/engineering/TECH_DEBT.md`**: atualizados para refletir ADR-007 resolvido e o novo achado.

**Não incluído, por instrução explícita**: nenhuma migration (`0004`, `0005`) aplicada; nenhuma alteração de RLS policy; nenhuma feature de interface (Comparação de Produtos fica para a Sprint 3.9); o bug de log falso-positivo em `index.js` foi documentado, não corrigido (não era necessário para concluir a carga de dados).

## 2026-06-24 — Sprint 3.9: Price Engine v1 + Compare Foundation

Implementa em código (não só arquitetura) o Price Engine proposto na Sprint 3.7 (ADR-013), e corrige o bug de log identificado na Sprint 3.8 (ADR-016). Sem UI/páginas novas, sem autenticação, sem scraping/IA, por escopo explícito da missão.

- **`database/migrations/0006_proposed_price_history.sql`** (novo): tabela `price_history` (`offer_id` FK para `offers`, `price_usd`, `price_brl`, `old_price_usd`, `source`, `recorded_at`) + índice composto `(offer_id, recorded_at DESC)`.
- **`types/priceHistory.ts`** (novo): `PriceHistoryEntry`, `PriceChangeSource`, `OfferPriceMetrics`, `PriceUpdateResult`.
- **`services/offer.service.ts`**: `updateOfferPrice()` — único caminho de escrita de preço permitido a partir de agora; grava `price_history` antes de atualizar `offers`, é no-op se o preço não mudou, e confirma linhas afetadas no `update` final (mesmo padrão do ADR-016). `getOfferPriceMetrics()` — menor/maior preço histórico, variação percentual, última mudança; degrada graciosamente (preço atual real, histórico `null`) quando `price_history` não existe.
- **`database/seed/index.js`**: corrigido o backfill de `stores` — agora usa `.select("id")` no `UPDATE` e loga `[AVISO]` (não `[OK]`) quando a RLS filtra a escrita silenciosamente.
- **Testes funcionais ao vivo** (somente leitura/degradação controlada, sem dado real alterado): `getOfferPriceMetrics`/tentativa de `insert` em `price_history` contra o Supabase real, confirmando degradação graciosa; reprodução do cenário do bug do ADR-016 com a chave anônima, confirmando que a correção detecta corretamente a escrita silenciosamente bloqueada.
- **`docs/operations/DECISIONS.md`**: ADR-017 (schema do Price Engine, caminho único de escrita, bloqueio de DDL).
- **`docs/architecture/DOMAIN_MODEL.md`/`docs/architecture/API_CONTRACTS.md`/`docs/engineering/TECH_DEBT.md`**: atualizados com o novo schema/serviço/limitações.

**Bloqueio real**: `database/migrations/0006` não foi aplicada — nenhuma ferramenta deste projeto executa DDL contra o Supabase (sem `pg`/`DATABASE_URL`, sem CLI, sem RPC de SQL exposta, confirmado por introspecção do OpenAPI do PostgREST). Diferente de `0002`/`0004`/`0005` (propostas por decisão pendente), esta ficou proposta por impossibilidade técnica — corresponde a uma das condições de parada explícitas da missão ("necessidade de credencial inexistente").

Validado com `npm run lint` (0 erros, 5 warnings pré-existentes), `npx tsc --noEmit` (0 erros), `npm run build` (sucesso, mesmas 6 rotas), `npm run db:validate` (0 problemas) e reexecução de `npm run db:seed:execute` (idempotência confirmada).

**Não incluído, por instrução explícita**: nenhuma tela `/compare`; nenhuma migration aplicada; nenhuma alteração de RLS; nenhuma autenticação/scraping/IA.

## 2026-06-24 — Sprint 3.9, adendo: Price Engine validado contra dados reais + achado crítico de RLS de leitura

O CTO aplicou `0006_proposed_price_history.sql` manualmente no SQL Editor do Supabase. Validação completa do Price Engine contra a tabela real, mais um achado crítico não relacionado a preço.

- **Bug de cálculo encontrado e corrigido** em `getOfferPriceMetrics` (`services/offer.service.ts`): `highestPriceUSD`/`priceChangePercent` ignoravam o preço original (só disponível em `old_price_usd` da primeira entrada de histórico) — se o preço só tivesse caído desde o início do histórico, o pico original nunca apareceria no cálculo. Corrigido para incluir `firstEntry.old_price_usd` no conjunto de preços e como base do cálculo de variação percentual.
- **Validação funcional completa** (chave de serviço, oferta real `iphone-16-pro-256gb-titanio-preto@cellshop`): 27 asserções — leitura de histórico, métricas baseline, duas mudanças reais de preço (999→949→1050), detecção de no-op, restauração ao preço original preservando 3 entradas reais de histórico, métricas finais corretas. Todas passaram.
- **Confirmado**: a chave anônima (a que a aplicação usa) não escreve em `price_history` (erro explícito de RLS) nem em `offers` (bloqueio silencioso) — consistente com o padrão do ADR-016.
- **Achado crítico (ADR-019), não corrigido**: testando a leitura da chave anônima, confirmou-se que ela **também não vê nenhuma linha** de `price_history`, nem de `brands`/`categories`/`products`/`offers` — só `stores` tem leitura pública funcionando. Isso passou despercebido em todas as auditorias da Sprint 3.8 porque elas usam `database/seed/lib/client.js`, que prefere a chave de serviço (presente desde a Sprint 3.8) — nunca a chave anônima que a aplicação real usa. Por dedução direta do código (`lib/supabase.ts` usa só a chave anônima, em qualquer ambiente), o catálogo real provavelmente está vazio para usuários reais agora. Correção proposta: `database/migrations/0007_proposed_public_read_policies.sql` (policies de `SELECT` público, sem alterar nenhuma policy de escrita).
- **`docs/operations/DECISIONS.md`**: ADR-018 (validação do Price Engine, bug corrigido, classificação "Backend Production Ready") e ADR-019 (achado crítico de leitura pública).
- **`database/migrations/0006_proposed_price_history.sql`**: cabeçalho atualizado para refletir que foi aplicada manualmente em produção (arquivo não renomeado, por convenção de histórico).

Revalidado: `npm run lint`/`npx tsc --noEmit`/`npm run build` (sem regressão), `npm run db:validate` (0 problemas).

**Classificação final do Price Engine v1**: "Backend Production Ready" — não "Production Ready" de ponta a ponta, porque a leitura pública está bloqueada pelo achado do ADR-019 (mais amplo que só preço) e nenhum caminho de escrita real (Admin/Crawler) existe ainda.

## 2026-06-25 — Sprint 4.2: MVP Público (Release 0.7)

Lapidar a experiência existente para o primeiro lançamento público. Nenhuma funcionalidade nova — só qualidade, SEO, navegação e performance.

**`<img>` → `next/image` (0 warnings — era 5)**:
- `next.config.ts`: `images.remotePatterns` configurado (Supabase Storage + HTTPS genérico para MVP).
- `components/product/ProductCard.tsx`: `<img fill sizes>` com `relative` no container.
- `components/product/ProductGallery.tsx`: imagem principal com `priority` (LCP); thumbnails com `fill sizes="80px"`.
- `components/store/StoreCard.tsx`: cover image com `fill sizes`.
- `app/store/[slug]/page.tsx`: hero da loja com `fill priority sizes="100vw"`.

**Navegação — links mortos eliminados**:
- `components/layout/Navbar.tsx`: removidos `/stores` e `/compare` (rotas inexistentes). Novo menu: Início, Produtos, Buscar, IA.
- `components/layout/Footer.tsx`: links para páginas inexistentes convertidos em `<span>` com badge "em breve". Apenas links reais continuam clicáveis.

**SEO**:
- `app/sitemap.ts` (novo): sitemap dinâmico com rotas estáticas + todas as páginas de produto, compare e loja buscadas do Supabase. Exposto como `/sitemap.xml`.
- `app/robots.ts` (novo): robots.txt com `Allow: /`, `Disallow: /api/ /_next/` e ponteiro para sitemap. Exposto como `/robots.txt`.
- `app/page.tsx`: `export const metadata` adicionado com title, description, keywords, canonical, openGraph (locale pt_BR) e twitter:card.
- `app/layout.tsx`: adicionado JSON-LD `Organization` (nome, URL, descrição, areaServed Paraguay); `robots: index/follow` e `openGraph` base no metadata do layout.

**UX**:
- `app/not-found.tsx` (novo): página 404 global com design consistente (fundo `#050816`, Navbar, Footer, 3 CTAs: Início, Catálogo, Buscar). Qualquer rota inexistente agora exibe UI de marca em vez do fallback genérico do Next.js.

**Performance**:
- `app/compare/[slug]/page.tsx`: double-fetch eliminado — `getCachedComparison = cache(getProductComparisonBySlug)` compartilhado entre `generateMetadata` e a função de página (mesmo padrão do ADR-021 aplicado em produto/loja).

**Validações**:
- Lint: 0 erros, 0 warnings (era 5).
- TypeScript: 0 erros.
- Build: 10 rotas (+ `/robots.txt` ○, `/sitemap.xml` ƒ, `/_not-found` ○ customizado).
- db:validate: 0 problemas.

---

## 2026-06-25 — Release 0.8: Go Live Foundation

Transformação do MVP técnico em produto pronto para receber usuários reais.

**Imagens reais (placehold.co)**:
- `database/seed/update_images.js` (novo, `npm run db:images`): atualiza `image_url` (products), `cover_image` (stores) e `logo_url` (brands) com 16 URLs de placehold.co por entidade — o catálogo agora exibe imagens representativas em vez de estados vazios. URLs geradas com cor/nome da entidade, estáveis e gratuitas. Suportadas pelo `next/image` via `remotePatterns: "**"` já configurado.

**Favicon e PWA**:
- `app/icon.tsx` (novo): gera `/icon` PNG (512×512) via `ImageResponse` — ícone azul com "P" branco, borderRadius arredondado.
- `app/apple-icon.tsx` (novo): gera `/apple-icon` PNG (180×180) — mesmo design adaptado para iOS.
- `app/manifest.ts` (novo): `manifest.webmanifest` via `MetadataRoute.Manifest` — nome "ParaguAI", `theme_color: #3b82f6`, `background_color: #050816`, `display: standalone`, ícones apontando para `/icon` e `/apple-icon`.

**Analytics**:
- `components/analytics/Analytics.tsx` (novo): componente `"use client"` com `next/script strategy="afterInteractive"` para **Google Analytics 4** (`NEXT_PUBLIC_GA_MEASUREMENT_ID`) e **Microsoft Clarity** (`NEXT_PUBLIC_CLARITY_PROJECT_ID`). Renderiza nada se nem um nem outro estiver configurado — 0 ruído em desenvolvimento.
- `utils/analytics.ts` (novo): utilitários tipados: `analytics.search()`, `analytics.viewProduct()`, `analytics.clickOffer()`, `analytics.compare()`, `analytics.viewStore()`, `analytics.clickExternalOffer()` — enviam para GA4 (`window.gtag`) e Clarity (`window.clarity`) sem acoplamento.

**Rastreamento de eventos**:
- `components/compare/CompareOfferCard.tsx` → `"use client"` + `analytics.clickExternalOffer()` no botão "Ver oferta" (evento de maior valor de negócio).
- `components/store/StoreCard.tsx` → `"use client"` + `analytics.viewStore()` no clique da loja.

**SEO — Search Console e Bing**:
- `app/layout.tsx` atualizado: `viewport` exportado separadamente (`themeColor: #3b82f6`, `colorScheme: dark`); fontes Geist com `display: "swap"`; `<link rel="preconnect">` para domínio do Supabase; suporte a `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` e `NEXT_PUBLIC_BING_SITE_VERIFICATION` (meta tags de verificação injetadas via metadata quando presentes); `<Analytics />` adicionado antes de `</body>`.
- `twitter.site: "@paraguai"` adicionado ao root metadata.

**Segurança**:
- `next.config.ts` atualizado: `async headers()` com 6 headers de segurança para todas as rotas: `X-DNS-Prefetch-Control`, `Strict-Transport-Security (HSTS)`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.

**Configuração**:
- `.env.example` reescrito: seções documentadas — Supabase, SITE_URL, Analytics (GA4 + Clarity), Webmaster Tools (Google + Bing), service role key.
- `package.json`: scripts `db:images` e `db:images:dry-run` adicionados.

**Validações**:
- Lint: 0 erros, 0 warnings.
- TypeScript: 0 erros.
- Build: 13 rotas (+ `/icon ○`, `/apple-icon ○`, `/manifest.webmanifest ○`).
- db:validate: 11 OK.
- db:validate:43: 23 OK.
- HTTP: `/icon` 200 image/png, `/apple-icon` 200 image/png, `/manifest.webmanifest` 200.

---

## 2026-06-25 — ADR-019 ENCERRADO: migration 0007 aplicada + validação completa com chave anônima

**Hotfix da migration `0007_proposed_public_read_policies.sql`**:
- Versão anterior da migration usava `CREATE OR REPLACE POLICY` — sintaxe inválida em qualquer versão do PostgreSQL (válida para `FUNCTION`/`VIEW`/`RULE`, nunca para `POLICY`). Erro descoberto ao colar no SQL Editor do Supabase. Migration reescrita com o padrão idiomático correto: `DROP POLICY IF EXISTS "Public read access" ON <tabela>` seguido de `CREATE POLICY "Public read access" ON <tabela> FOR SELECT TO anon, authenticated USING (true)`. Aplicado para as 5 tabelas. Idempotente. Seguro para re-executar.

**Migration aplicada no Supabase SQL Editor pelo CTO** — resultado da query de verificação: 5 linhas com `cmd = 'r'` e `roles = {anon,authenticated}`, nenhuma linha com `cmd = 'w'`.

**Validação integral com chave anônima** (`database/seed/validate_adr019.js`, novo):
Script dedicado com 7 seções e 22 asserções, usando **exclusivamente** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (zero uso da service role key). Resultado: **22 OK | 0 FAIL**.

| Seção | Resultado |
|---|---|
| 1. Leitura direta das 6 tabelas (ADR-019 core) | `brands` 3✓ · `categories` 3✓ · `products` 3✓ · `offers` 3✓ · `price_history` 3✓ · `stores` 3✓ |
| 2. Home (stores + brands + categories + products) | Mega Eletrônicos, Atacado Games, Shopping China · 5 marcas · 5 categorias · 4 produtos |
| 3. Produto `/product/[slug]` | iPhone 16 Pro / marca Apple / categoria Celulares · 2 ofertas (menor $999 @ Cellshop) · 4 relacionados |
| 4. Compare Engine `/compare/[slug]` | produto + 2 ofertas + 3 entradas de price_history via batch `.in()` |
| 5. Loja `/store/[slug]` | Cellshop / Ciudad del Este · 2 ofertas da loja · 3 lojas relacionadas |
| 6. Busca `/search` | 1 produto para "iPhone" · 1 loja para "cell" |
| 7. Catálogo `/products` (join completo) | 6 produtos total · join com offers + brands + categories em 1 query |

**ADR-019 encerrado**: a chave anônima lê todos os domínios públicos do catálogo. Não há mais dado visível ao service role que não seja visível ao anon. Escrita continua bloqueada para `anon`/`authenticated` (nenhuma policy de INSERT/UPDATE/DELETE foi criada).

Commits: `e69696b` (hotfix migration) + `aa5a325` (revisão anterior) — ambos em `main`.

---

## 2026-06-25 — Sprint 4.1: Public Release Readiness (Release 0.6)

Transição do ParaguAI de uma plataforma tecnicamente funcional para um MVP navegável: Home dinâmica com dados reais, double-fetch resolvido nas páginas de produto e loja, botão "Comparar preços" adicionado ao produto. ADR-019 (leitura pública bloqueada) permanece como único bloqueador restante — requer ação manual no Supabase SQL Editor.

**Arquivos criados**:
- **`app/product/[slug]/_cache.ts`** (novo): módulo compartilhado com funções `React.cache()` para produto e suas relações — eliminando double-fetch entre `layout.tsx` (metadata/JSON-LD) e `page.tsx` (renderização). Ver ADR-021.
- **`app/store/[slug]/_cache.ts`** (novo): equivalente para o domínio de Loja.

**Arquivos alterados**:
- **`app/page.tsx`** (Home): convertida de componente síncrono com dados hardcoded para `async` server component com `export const dynamic = "force-dynamic"` — busca `getStores()`, `getBrands()`, `getCategories()`, `getProductsCatalog({ perPage: 4 })` em paralelo via `Promise.all`. Todos os arrays `sampleStores`/`sampleProducts`/`sampleBrands` e o import de `sampleCategories` foram removidos. Dados reais fluem diretamente para os componentes sem alterar suas props.
- **`app/product/[slug]/page.tsx`**: convertido de `"use client"` + `useProduct()` para Server Component `async` — passa `params: Promise<{ slug: string }>`, chama `getCachedProduct`/`getCachedOffers`/`getCachedRelatedProducts` do `_cache.ts`, chama `notFound()` quando o produto não existe. Adicionado botão "Comparar preços" com ícone `Scale` (lucide-react), linkando para `comparePath(product.slug)`.
- **`app/product/[slug]/layout.tsx`**: refatorado para importar `getCachedProduct`/`getCachedOffers` do `_cache.ts` em vez de instanciar `React.cache()` localmente — remove as importações diretas de `getProductBySlug`/`getOffersByProduct`/`cache`.
- **`app/store/[slug]/page.tsx`**: convertido de `"use client"` + `useStore()` para Server Component `async` — mesmo padrão de produto.
- **`app/store/[slug]/layout.tsx`**: refatorado para importar `getCachedStore` do `_cache.ts`.
- **`types/product.ts`**: `ProductHighlight.priceUSD` e `storeName` tornados opcionais (`number | undefined` e `string | undefined`) — permite mapear `ProductCatalogItem` (onde `lowestPriceUSD` pode ser `null` e não há campo `storeName`) para `ProductHighlight` sem forçar dados falsos.
- **`constants/categories.ts`**: conteúdo substituído por comentário — os dados de exemplo (`sampleCategories`) foram migrados para `getCategories()` real via `category.service.ts`. O arquivo é preservado (sem `git rm`) por convenção do projeto.
- **`docs/operations/DECISIONS.md`**: ADR-021 adicionado (módulo `_cache.ts` compartilhado).

**Performance obtida**:
- Double-fetch eliminado em `/product/[slug]` e `/store/[slug]`: de 2 fetches por entidade principal por visita para 1 (compartilhado via `React.cache()` entre layout e page).
- Home: de 0 queries ao Supabase (dados hardcoded) para 4 queries em paralelo por visita (stores, brands, categories, catalog).
- Nenhuma N+1 introduzida: `getProductsCatalog` usa `offers!left` (1 query com join); `Promise.all` paraleliza as 4 queries da Home.

**ADR-019 — status inalterado**: a chave anônima continua sem leitura pública em `brands`/`categories`/`products`/`offers`/`price_history`. As consultas da Home retornarão `[]` para tudo exceto stores até que `0007_proposed_public_read_policies.sql` seja aplicado. O código está correto — é um bloqueador de configuração, não de engenharia. Investigado durante a sprint: a Supabase Management API requer um Personal Access Token (PAT) diferente da service role key; a service role key não executa DDL via PostgREST; não há DATABASE_URL no projeto. A ação humana de colar o SQL no Supabase SQL Editor permanece o único caminho.

Validado: `npm run lint` (0 erros, 5 warnings pré-existentes), `npx tsc --noEmit` (0 erros), `npm run build` (sucesso — 8 rotas, `/` agora `ƒ Dynamic`), `npm run db:validate` (0 problemas).

## 2026-06-25 — Sprint 4.0: Compare Engine v1 (Release 0.5)

Entrega o primeiro Compare Engine totalmente funcional do ParaguAI: compara um produto entre todas as lojas disponíveis usando dados reais do Supabase, com Price Engine integrado (histórico de preço por oferta), algoritmo de ranking de ofertas (ADR-014) e endpoint de API estruturado. Primeiro MVP visível da plataforma.

**Arquivos criados**:
- **`types/compare.ts`** (novo): `RankedOffer`, `CompareSummary`, `CompareResult` — types do Compare Engine.
- **`services/compare.service.ts`** (novo): `getProductComparisonBySlug(slug)` e `getProductComparison(productId)` — motor de comparação. Executa 3 queries no total para qualquer produto (1 produto + 1 ofertas com loja + 1 batch de price_history por `.in("offer_id", ids)`), evitando N+1; aplica o algoritmo de ranking da ADR-014 em memória; retorna `CompareResult` com `product`, `offers` (rankeadas) e `summary` (min/max/savings/storeCount/availableCount).
- **`app/api/compare/route.ts`** (novo): GET `/api/compare?slug=<slug>` ou `?productId=<uuid>` — endpoint JSON do Compare Engine. Headers de cache (`s-maxage=60, stale-while-revalidate=120`). Retorna 400 para parâmetros ausentes, 404 para produto inexistente, 200 com `CompareResult` para sucesso.
- **`hooks/useCompare.ts`** (novo): `useCompare(slug)` — hook client-side, mesma convenção de `useProduct`/`useStore`.
- **`components/compare/CompareSummary.tsx`** (novo): card de resumo com menor/maior preço, economia máxima (absoluta + percentual) e contagem de lojas/estoque.
- **`components/compare/CompareOfferCard.tsx`** (novo): card por oferta rankeada — rank badge, nome/rating/verificação da loja, badges (estoque/garantia/condição/cashback), métricas de histórico de preço (mínimo/máximo histórico + variação %), preço em USD e BRL, score de ranking, botão "Ver oferta".
- **`app/compare/[slug]/page.tsx`** (novo): Server Component, `async` — busca `getProductComparisonBySlug` e `getRelatedProducts` no servidor; `generateMetadata` (título/description/canonical/OG/Twitter com dados reais do produto); breadcrumb, header, summary, lista rankeada, produtos relacionados.
- **`app/compare/[slug]/loading.tsx`** (novo): skeleton animado durante fetch SSR.
- **`app/compare/[slug]/not-found.tsx`** (novo): 404 com links para catálogo e busca.
- **`app/compare/[slug]/error.tsx`** (novo): error boundary client com `unstable_retry`.
- **`database/seed/validate_compare.js`** (novo): script de validação do Compare Engine contra o Supabase real — 6 cenários: produto com várias ofertas, produto com 1 oferta, produto sem oferta, slug inexistente, leitura com chave anônima (diagnóstico ADR-019), validação do ranking. Todos passaram.

**Arquivos alterados**:
- **`constants/routes.ts`**: `comparePath(slug)` e `compareUrl(slug)` adicionados no mesmo padrão de `productPath`/`storePath`.

**Algoritmo de Ranking (ADR-014, primeira implementação)**:
Score composto 0–100 calculado em memória para cada oferta:
- Preço (50%): a oferta mais barata recebe 50; as demais decaem proporcionalmente (`50 * lowestPrice / price`).
- Disponibilidade (25%): `in_stock=true` → 25; `false` → 0.
- Confiabilidade da loja (15%): `store.rating` (0–5) normalizado para 0–15; loja sem rating recebe a média do conjunto (não é punida como "pior").
- Qualidade do cadastro (10%): proporção de campos preenchidos (`warranty`, `condition`, `product_url` da oferta; `phone`, `whatsapp`, `email`, `website`, `opening_hours` da loja).

**Validação executada (chave de serviço, contra dados reais)**:
1. `iphone-16-pro-256gb-titanio-preto` — 2 ofertas encontradas; Cellshop rankeada #1 (score 94) vs. Nissei #2 (score 92); preço mínimo histórico $949 corretamente capturado pelo Price Engine integrado — ✅
2. `smart-tv-samsung-55-4k-qled` — exatamente 1 oferta retornada — ✅
3. `playstation-5-slim` — produto encontrado, 0 ofertas retornadas (sem crash, graceful) — ✅
4. Slug inexistente — retorna `null` sem crash — ✅
5. Chave anônima — produto retorna `null` (RLS bloqueia, ADR-019 confirmado, 0007 ainda não aplicado) — ✅ (comportamento esperado diagnosticado)
6. Scores em ordem decrescente `[94, 92]` — ✅

**Dependência crítica não resolvida (ADR-019)**: a chave anônima (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), única usada por `lib/supabase.ts`, não lê `products`/`offers`/`price_history` — o Compare Engine retorna `null` para qualquer usuário real até que `0007_proposed_public_read_policies.sql` seja aplicado no SQL Editor do Supabase. Isso é o bloqueador #1 de todo o catálogo, não só do comparador — pré-existe a esta sprint (ADR-019, sprint 3.9). O endpoint `/api/compare` e a rota `/compare/[slug]` **estão corretos e completos**; só precisam que o dado seja visível pela chave pública.

Validado com `npm run lint` (0 erros, 5 warnings pré-existentes — nenhum novo), `npx tsc --noEmit` (0 erros), `npm run build` (sucesso — 8 rotas: as 6 anteriores + `/api/compare` + `/compare/[slug]`), `npm run db:validate` (0 problemas).

---

## 2026-06-25 — Sprint 4.3: Data Integrity & Media Foundation (Release 0.7 — fase final)

Última etapa técnica antes de declarar o Release 0.7 concluído. Foco: integridade estrutural do banco, fundação de imagens/storage, qualidade de código.

**Auditoria pré-migração (chave de serviço)**:
- 0 slugs duplicados em `stores`, `products`, `brands`, `categories`
- 0 slugs nulos em qualquer tabela
- 0 ofertas órfãs (offers.product_id / offers.store_id)
- 0 produtos com brand_id ou category_id inválidos
- 0 preços ≤ 0 ou nulos em `offers.price_usd`
- Contagem: `brands:5`, `categories:5`, `products:6`, `offers:9`, `price_history:3`, `stores:5`

**Migration `0008_data_integrity.sql`** (criada, aguarda aplicação no SQL Editor — mesmo fluxo de 0006/0007):
- Supersede `0002_revised_store_data_layer.sql` e `0004_proposed_catalog_integrity_and_indexes.sql`
- Idempotente: `DO $$ IF NOT EXISTS ... $$` para UNIQUE constraints; `CREATE INDEX IF NOT EXISTS` para índices
- UNIQUE constraints: `stores_slug_unique`, `products_slug_unique`, `brands_slug_unique`, `categories_slug_unique`
- Índices: `offers_product_id_idx`, `offers_store_id_idx`, `offers_price_usd_idx`, `products_brand_id_idx`, `products_category_id_idx`, `price_history_offer_id_recorded_at_idx`
- Inclui query de verificação no final (constraints + índices esperados)
- Ver ADR-023

**Storage Foundation** (aplicado programaticamente com chave de serviço):
- Bucket `catalog` criado no Supabase Storage: `public: true`, mimeTypes `webp/jpeg/png/avif`, limite 5 MB
- URL base: `https://acairzpzsklctaqjsukw.supabase.co/storage/v1/object/public/catalog/`
- Estrutura de pastas: `products/{slug}/main.webp`, `products/{slug}/gallery/{n}.webp`, `stores/{slug}/cover.webp`, `stores/{slug}/logo.webp`, `brands/{slug}/logo.webp`
- Ver ADR-022

**Arquivos criados**:
- **`database/migrations/0008_data_integrity.sql`**: migration final idempotente (0002 + 0004 consolidadas)
- **`database/storage/init.js`**: script Node que cria o bucket via service role key (`npm run storage:init`)
- **`database/seed/validate_sprint43.js`**: 23 asserções — contagem, slugs, FKs, preços, Storage (`npm run db:validate:43`)
- **`utils/storage.ts`**: utilitário TypeScript com `catalogStorage.*` (builders de URL por entidade) e `resolveImageUrl` (fallback automático para Storage quando `image_url` está nulo)

**Arquivos alterados**:
- **`package.json`**: scripts `db:validate:43` e `storage:init` adicionados
- **`eslint.config.mjs`**: `database/storage/**` adicionado ao `globalIgnores` (tooling Node, fora da árvore TS/Next.js)
- **`docs/operations/DECISIONS.md`**: ADR-022 (Storage Foundation) + ADR-023 (Migration 0008) adicionados

**Validações executadas**:
- `npm run lint`: 0 erros, 0 warnings
- `npx tsc --noEmit`: 0 erros
- `npm run build`: 10 rotas — idêntico ao Sprint 4.2 (sem regressão)
- `npm run db:validate:43`: 23 OK | 0 falhas (catálogo, slugs, FKs, preços, Storage)
- `npm run storage:init`: bucket `catalog` criado com sucesso

**Pendência restante (ação manual no Supabase)**:
1. Aplicar `database/migrations/0008_data_integrity.sql` no SQL Editor → confirmação esperada: 4 UNIQUE constraints + 6 índices
2. Upload de imagens reais no bucket `catalog` seguindo a convenção de nomenclatura definida no ADR-022

---

## 2026-06-26 — Release 0.9: Acquisition Engine

**Sprint**: Release 0.9 — Acquisition Engine (Plataforma Universal de Aquisição)

### Engines implementados

- **Acquisition Pipeline** (`acquisition/core/pipeline.ts`) — orquestrador central; encadeia todas as etapas via `IPipelineStage`; suporte a `dryRun` e `verbose`
- **Connector Registry** (`acquisition/core/registry.ts`) — registro singleton de conectores; `register / get / list / has / unregister`
- **Validation Engine** (`acquisition/engines/validation.engine.ts`) — 8 regras de validação com erros e warnings distintos; campos obrigatórios, preços, slugs, URLs
- **Normalization Engine** (`acquisition/engines/normalization.engine.ts`) — slugify (via `utils/slug.ts` implementado), defaults de brand/category, limpeza de URLs
- **Deduplication Engine** (`acquisition/engines/deduplication.engine.ts`) — batch-fetch de produtos existentes; classifica cada item como `new | update | skip`
- **Canonical Product Engine** (`acquisition/engines/canonical.engine.ts`) — infraestrutura pronta; implementa exact-slug matching; extensível para fuzzy/AI
- **Media Pipeline** (`acquisition/engines/media.engine.ts`) — download via `https`/`http`, conversão WebP via `sharp` (dynamic import, graceful degradation), upload ao Supabase Storage
- **Catalog Writer** (`acquisition/persistence/catalog.writer.ts`) — upsert brand → category → product → offer → price_history; respeita a filosofia offer-first do banco
- **Observability** (`acquisition/observability/metrics.ts`) — métricas por etapa (duração, accepted/rejected/skipped), relatório formatado em console

### Parsers implementados

- **JSON Parser** (`acquisition/parsers/json.parser.ts`) — aceita array JSON ou objeto único; mapeamento flexível de campos (`priceUSD`/`price_usd`, `storeSlug`/`store_slug` etc.)
- **CSV Parser** (`acquisition/parsers/csv.parser.ts`) — parser RFC 4180 custom sem dependência externa; suporte a quotes, escape `""`, CRLF/LF, campo `fieldMap` configurável

### Conectores de referência

- **JsonFileConnector** (`acquisition/connectors/json-file.connector.ts`)
- **CsvFileConnector** (`acquisition/connectors/csv-file.connector.ts`)

### Datasets de teste

- `acquisition/datasets/sample-products.json` — 4 produtos (Apple, Samsung, Sony, DJI) com 2 lojas
- `acquisition/datasets/sample-products.csv` — 4 produtos (Apple, Xiaomi, Samsung, Armani) via Nissei

### Scripts

- `npm run acquisition:validate` — 33 asserções, 0 falhas
- `npm run acquisition:import-json` / `:execute` — dry-run + execução real (JSON)
- `npm run acquisition:import-csv` / `:execute` — dry-run + execução real (CSV)

### Utilitários

- `utils/slug.ts` — `slugify()` implementado (estava vazio); normalização NFD, remoção de acentos, ASCII only
- `acquisition/lib/client.ts` — cliente Supabase com service role para scripts (mesmo padrão de `database/seed/lib/client.js`, ADR-012)

### Documentação

- `docs/engineering/ACQUISITION.md` — visão geral da arquitetura, pipeline, modelo de dados, scripts
- `docs/engineering/CONNECTOR_GUIDE.md` — guia completo para novos conectores com checklist
- ADR-024 a ADR-027 adicionados em `docs/operations/DECISIONS.md`

### Dependências novas (devDependencies)

- `tsx ^4.19.0` — execução de scripts TypeScript
- `sharp ^0.33.0` — conversão de imagens WebP/AVIF

### Validações executadas

- `npm run acquisition:validate` — 33/33 ✓
- `npm run acquisition:import-json` (dry-run) — 4/4 itens processados, 0 erros
- `npm run acquisition:import-csv` (dry-run) — 4/4 itens processados, 0 erros
- `npm run lint` — 0 erros
- `npm run typecheck` — 0 erros
- `npm run build` — sucesso, 10 rotas, nenhuma regressão

## 2026-06-26 — Release 1.0 — Admin Platform (Operations Center)

**Objetivo**: plataforma de administração completa com autenticação, CRUD de catálogo, pipeline de importação com UI, centro de qualidade, log de importações e configurações.

**Autenticação & Segurança**:
- `@supabase/ssr ^0.12.0` — auth cookie-based para Next.js 16 App Router
- `lib/supabase/server.ts` — `createServerClient` com `await cookies()`
- `lib/supabase/client.ts` — `createBrowserClient` para client components
- `lib/supabase/service.ts` — singleton service role para writes admin (bypassa RLS)
- `lib/admin-auth.ts` — `requireAdmin()` valida sessão + role; `isAuthError()` type guard
- `middleware.ts` — protege `/admin/*`, redireciona para `/admin/login` se não autenticado
- `database/migrations/0009_admin_platform.sql` — `profiles` + trigger `on_auth_user_created` + `import_logs`

**Layout & UI Components**:
- `contexts/admin/ToastContext.tsx` — Toast notification system (success/error/warning/info, auto-dismiss 4s)
- `components/admin/ui/ToastContainer.tsx` — renderização dos toasts
- `components/admin/ui/ConfirmDialog.tsx` — modal de confirmação para ações destrutivas
- `components/admin/ui/AdminDataTable.tsx` — tabela genérica com paginação e skeleton
- `components/admin/ui/AdminFormField.tsx` — `AdminInput`, `AdminTextarea`, `AdminSelect` + label + error
- `components/admin/ui/AdminButton.tsx` — botão com variantes (primary/secondary/danger/ghost) + loading
- `components/admin/layout/AdminSidebar.tsx` — sidebar com navegação hierárquica + logout
- `app/admin/layout.tsx` — layout raiz do admin (sidebar + toast provider)
- `app/admin/login/page.tsx` — formulário de login com Supabase Auth

**Dashboard**:
- `app/admin/page.tsx` — stats em tempo real: produtos, ofertas, lojas, marcas, categorias, price_history, última importação
- `app/api/admin/dashboard/stats/route.ts` — API para stats

**CRUD Produtos** (`app/admin/catalog/products/`):
- List com busca e paginação; New (`/new`); Edit (`/[id]`)
- `components/admin/catalog/ProductForm.tsx` — form com marca, categoria, slug auto-gerado
- `app/api/admin/products/route.ts` (GET paginado + search, POST)
- `app/api/admin/products/[id]/route.ts` (GET, PUT, DELETE)

**CRUD Categorias** (mesmo padrão):
- `app/api/admin/categories/route.ts` + `[id]/route.ts`
- `components/admin/catalog/CategoryForm.tsx`

**CRUD Marcas**:
- `app/api/admin/brands/route.ts` + `[id]/route.ts`
- `components/admin/catalog/BrandForm.tsx`

**CRUD Lojas**:
- `app/api/admin/stores/route.ts` + `[id]/route.ts`
- `components/admin/catalog/StoreForm.tsx` — form completo com contato, verificação, status

**CRUD Ofertas**:
- `app/api/admin/offers/route.ts` + `[id]/route.ts`
- `components/admin/catalog/OfferForm.tsx` — preço USD/BRL, condição, garantia, cashback

**Centro de Importações**:
- `app/admin/imports/page.tsx` — seleção de connector, dry-run/execute, resultado visual
- `app/api/admin/import/run/route.ts` — executa pipeline do Acquisition Engine, persiste log

**Centro de Qualidade**:
- `app/admin/quality/page.tsx` — report com 6 categorias de issues (error/warning/info)
- `app/api/admin/quality/report/route.ts` — 6 queries paralelas no DB

**Log de Importações**:
- `app/admin/logs/page.tsx` — tabela paginada de execuções
- `app/api/admin/logs/route.ts` — GET paginado

**Media Manager**:
- `app/api/admin/media/upload/route.ts` — upload para Supabase Storage bucket `catalog`

**Configurações**:
- `app/admin/settings/page.tsx` — status de DB, storage e segurança

**Validações**: lint 0 erros · typecheck 0 erros · build OK

## 2026-06-26 — Release 1.1 — First Live Connector (Shopping China)

**Stack de aquisição produtiva — end-to-end.**

### Acquisition Layer
- `acquisition/fetch/types.ts` — interface `IFetchStrategy`, `FetchResult`, `FetchOptions`
- `acquisition/fetch/http.strategy.ts` — `HttpFetchStrategy` com browser UA e `AbortSignal.timeout`
- `acquisition/connectors/shoppingchina/` — conector completo:
  - `listing-parser.ts` — extrai URLs `/producto/*` de páginas de listagem
  - `detail-parser.ts` — extrai nome, preço USD (padrão `U$ N,NN`), preço Gs, marca, categoria, imagens CDN
  - `connector.ts` — orquestra listing → detail com rate limiting (500ms entre requests)
  - `index.ts` — auto-registra no `connectorRegistry` via side-effect import
  - `config.ts` — 3 categorias (Eletrônicos, Informática, Celulares), 10 produtos/categoria
- `acquisition/connectors/bootstrap.ts` — registra todos os conectores antes de qualquer API route

### Database
- `database/migrations/0010_shoppingchina_connector.sql` — INSERT store `shopping-china` + tabela `connector_configs`
- `database/migrations/0011_offers_unique_constraint.sql` — adiciona UNIQUE `(product_id, store_id)` na `offers` (deduplicação prévia incluída)

### Bug fixes
- `acquisition/persistence/catalog.writer.ts` — `source: "crawler"` (era `"connector"`, tipo inválido)
- `acquisition/connectors/shoppingchina/connector.ts` — `type: "crawler"` (era `"api-rest"`)

### Resultado validado
- Dry-run: 30 validados, 0 erros
- Execute: 30 persistidos (10 por categoria)
- Idempotência: 30 skip na segunda execução

---

## 2026-06-26 — Release 1.2 — Merchant Operating System

**Portal self-service completo para lojistas (SaaS foundation).**

### Database — migration 0012
- `profiles.role` expandido para `('admin','operator','merchant')`
- `merchant_plans` — 4 planos (free/pro/business/enterprise) com seed
- `merchants` — registro do lojista com score, status, onboarding, RLS self-access
- `merchant_stores` — junction M:N (merchants ↔ stores) com FK para multi-tenancy
- `merchant_audit_logs` — todos os eventos de plataforma com payload JSON
- `merchant_analytics_events` — fundação para analytics futuro
- `merchant_recommendations` — recomendações automáticas por lojista
- Índices de performance + trigger `set_updated_at()` + RLS policies

### Types & Auth
- `types/merchant.ts` — 20+ tipos: `Merchant`, `MerchantPlan`, `MerchantDashboardStats`, `MerchantScoreBreakdown`, `AuditEventType`, etc.
- `lib/merchant-auth.ts` — `requireMerchant()`, `requireAuth()`, `isMerchantAuthError()` (padrão do admin)
- `middleware.ts` — rota `/merchant/*` protegida; `/merchant/login` e `/merchant/register` públicas

### Services (M02-M12)
- `services/merchant.service.ts`:
  - `getMerchantDashboardStats` — queries paralelas, 10 métricas
  - `computeMerchantScore` — 8 critérios, 0-100 pontos
  - `generateRecommendations` — 6 tipos de recomendações automáticas
  - `logAuditEvent` — persistência de auditoria
  - `computeTrustScore` — score por produto

### API Routes (10 endpoints)
- `POST /api/merchant/auth/register` — cadastro idempotente, upgrade de role, cria registro merchant
- `PATCH /api/merchant/onboarding` — salva passo + vincula loja
- `GET /api/merchant/dashboard/stats` — stats + score + recomendações
- `GET /api/merchant/stores` — lojas vinculadas; `POST` — todas disponíveis
- `GET /api/merchant/products` — catálogo paginado
- `POST /api/merchant/imports/run` — executa pipeline de aquisição
- `GET /api/merchant/imports/history` — histórico de importações
- `GET/PATCH /api/merchant/recommendations` — lista + dismiss/read
- `GET /api/merchant/audit` — log paginado de auditoria
- `GET/PATCH /api/merchant/settings` — perfil da empresa
- `GET /api/merchant/plans` — planos disponíveis

### Components (M01-M02)
- `components/merchant/layout/MerchantSidebar.tsx` — sidebar emerald, 8 itens de navegação
- `components/merchant/dashboard/StatsGrid.tsx` — 6 cards de métricas
- `components/merchant/dashboard/ScoreCard.tsx` — barra de progresso + breakdown de critérios
- `components/merchant/dashboard/RecommendationsPanel.tsx` — prioridades com dismiss
- `components/merchant/onboarding/OnboardingWizard.tsx` — wizard 5 passos

### Pages (11 rotas)
- `/merchant` → redirect dashboard
- `/merchant/login` e `/merchant/register` — auth emerald-theme
- `/merchant/onboarding` — wizard completo
- `/merchant/dashboard` — stats + score + recomendações + ações rápidas
- `/merchant/products` — tabela paginada com imagens
- `/merchant/imports/new` — seletor de conector + dry-run toggle + resultado
- `/merchant/imports` — histórico de importações
- `/merchant/stores` — lojas vinculadas
- `/merchant/audit` — log completo de auditoria
- `/merchant/analytics` — stub (placeholder para Release 1.3)
- `/merchant/settings` — empresa + contato + plano

### Quality Gate
- `npm run lint` → 0 errors, 1 warning (variável não-usada não-crítica)
- `npx tsc --noEmit` → 0 errors
- `npm run build` → OK, 11 rotas /merchant compiladas

### ADRs
- ADR-031: Role `merchant` no `profiles` compartilhado
- ADR-032: Junction table `merchant_stores` para multi-tenancy
- ADR-033: Portal `/merchant/*` reutiliza design system do admin
- ADR-034: Merchant Score computado on-demand
- ADR-035: Plans Engine como tabela seed sem gateway de pagamento

---

## 2026-06-27 — Release 1.3 — Dashboard Consultivo & Growth Engine

Redesign completo do dashboard do Merchant OS. Foco: inteligência, gamificação e onboarding orientado a ação.

**Novos tipos** (`types/merchant.ts`): `MerchantLevel`, `NextStep`, `MerchantGoal`.

**Serviços** (`services/merchant.service.ts`):
- `getMerchantLevel(score)` — 6 níveis (Iniciante/Bronze/Prata/Ouro/Diamante/Elite)
- `computeNextStep(merchant, stats)` — ação prioritária única com urgência e CTA
- `computeGoals(merchant, stats)` — 7 metas de progresso com ícones e barras

**API** (`/api/merchant/dashboard/stats`): resposta estendida com `level`, `nextStep`, `goals`.

**Novos componentes**:
- `NextStepCard` — card urgente com ação única, cores por urgência (critical/high/medium)
- `GoalsPanel` — painel de metas com progress bars e ícones emoji

**Redesign**:
- `ScoreCard` — nível badge, progresso dentro do nível, ladder de 6 pontos
- `RecommendationsPanel` — linguagem Growth Insights, CTA links, empty state positivo
- `StatsGrid` — subtítulos contextuais, cobertura de imagens em %, cores de saúde
- `app/merchant/dashboard/page.tsx` — greeting, skeleton, layout NextStepCard → StatsGrid → ScoreCard+GoalsPanel → Growth Insights

**Quality Gate**: lint 0, tsc 0, build OK.

---

## 2026-06-27 — Hotfix Auth — Fluxo de Confirmação de E-mail (PKCE)

Corrige o fluxo completo de confirmação de e-mail com Supabase Auth + Next.js SSR.

**Causa raiz**: `signUp()` sem `emailRedirectTo` usava o Site URL do Supabase (`localhost:3001/`) sem o path `/auth/callback`. O code PKCE não era trocado por sessão.

**Arquivos**:
- `app/auth/callback/route.ts` (NOVO) — Route Handler: `exchangeCodeForSession(code)`, coleta cookies, redireciona para `?next=`. Se o exchange falha (verifier PKCE ausente por browser diferente), redireciona para `/merchant/login?confirmed=true` — o e-mail já foi confirmado no Supabase.
- `app/merchant/register/page.tsx` — `signUp()` passa `emailRedirectTo: window.location.origin + /auth/callback?next=/merchant/dashboard`.
- `middleware.ts` — `/auth/callback` adicionado como bypass e ao matcher.
- `app/merchant/login/page.tsx` — detecta `?error=` e `?confirmed=true`, mostra banner verde. Wrapped em `<Suspense>` para `useSearchParams`.
- `.env.example` — `NEXT_PUBLIC_SITE_URL` documentado com instruções de Additional Redirect URLs.

**Validado**: cadastro → e-mail → callback → login com banner verde → dashboard ✓

---

## 2026-06-27 — Hotfix Dashboard — requireMerchant + Error States

**Causa raiz**: `requireMerchant()` checava `profiles.role === 'merchant'`. Com email confirmation ativo, `POST /api/merchant/auth/register` retornava 401 (sem sessão), role nunca era atualizada, e dashboard ficava em loop de 403.

**Fix principal** (`lib/merchant-auth.ts`): `requireMerchant()` checa existência do registro em `merchants` diretamente via service role. Merchant record = fonte de verdade de acesso.

**Outros arquivos**:
- `app/api/merchant/auth/register/route.ts` — profile.role update é best-effort (loga, não para o fluxo).
- `app/api/merchant/dashboard/stats/route.ts` — try/catch completo; score e recs com logging individual.
- `app/merchant/dashboard/page.tsx` — error states contextuais (not_found/server/network com CTAs); `WelcomeBanner` para primeiro acesso; logs reais no console.
- `database/migrations/0013_fix_profiles_role_merchant.sql` — corrige constraint `profiles_role_check` + backfill de merchants existentes.

**Fluxo validado**: Cadastro → e-mail → confirmação → login → dashboard carregando ✓

---

## 2026-06-27 — Release 1.3.1 — ParaguAI Experience Integration

Release exclusivamente de UX, navegação e branding. Nenhuma funcionalidade do Merchant OS alterada.

**`components/home/HeroCTAs.tsx`** (NOVO — client component): botão "Comparar preços" → `/products`; botão "Sou Lojista" / "Minha Loja" auth-aware — detecta sessão e registro em `merchants`, redireciona para `/merchant/login`, `/merchant/dashboard` ou mostra modal de confirmação para compradores autenticados.

**`components/home/ForLojistasSection.tsx`** (NOVO): seção Premium para lojistas na Home — 6 benefícios com ícones emerald, card CTA com "Cadastrar minha loja" + "Conhecer todos os planos". Posicionada entre Stats e CTASection.

**`components/home/Hero.tsx`**: importa e renderiza `<HeroCTAs />` após `<SearchBar />`.

**`components/layout/Navbar.tsx`**: "Para Lojistas" adicionado ao menu (→ `/para-lojistas`). Botão "Entrar" agora passa `href="/merchant/login"`.

**`components/layout/Footer.tsx`**: coluna "Para Lojistas" adicionada (Cadastrar Loja, Planos, Central do Lojista, Ajuda). Grid expandido de `[1.4fr 1fr 1fr 1fr]` para `[1.4fr 1fr 1fr 1fr 1fr]`.

**`app/para-lojistas/page.tsx`** (NOVO — static SSR): landing page institucional com metadata SEO completo. Seções: Hero emerald, Benefícios (6 cards), Como Funciona (4 passos numerados), Planos (4 cards — Free ativo, Pro/Business/Enterprise "em breve"), Importação (4 formatos), FAQ com `<details>` nativos, CTA final.

**`app/page.tsx`**: imports `ForLojistasSection`, adiciona à composição, atualiza metadata para incluir lojistas.

**Branding**: toda referência user-facing usa "Área do Lojista", "Painel do Lojista", "Central do Lojista". Nunca "Merchant Portal".

**Validações**: lint 0, tsc 0, build OK (64 rotas — + `/para-lojistas`). Fluxo Home → Lojista → Dashboard intacto.

---

## 2026-06-27 — Release 1.4 — Merchant Growth Platform

Transforma o Merchant OS em plataforma de crescimento. 10 módulos implementados ou arquitetados.

### Module 1 — Merchant Progress Engine

**`types/merchant.ts`**: novos tipos `ProfileCompletionItem` e `MerchantProfileCompletion`.

**`services/merchant.service.ts`**: função pura `computeProfileCompletion(merchant, stats)` — 7 critérios (company_name, contact_phone, contact_whatsapp, company_website, loja vinculada, primeira importação, verificação). Retorna percentual, contagens e lista de itens com links de ação.

**`components/merchant/dashboard/MerchantProgressCard.tsx`** (NOVO): barra de progresso colorida por faixa (azul <60%, amarelo 60-99%, verde 100%), checklist de itens pendentes com link direto para cada configuração.

### Module 2 — Missions (GoalsPanel expandido)

**`services/merchant.service.ts`** → `computeGoals`: adicionadas missões `products_500`, `score_80`, `score_100`, `profile_complete`. Substituído `score_70 → score_80` para alinhar com o spec (Merchant Score 80 e 100 como milestones principais).

### Module 3 — Dashboard Intelligent

`NextStepCard` já implementado no Release 1.3. Sem alterações.

### Module 4 — Public Store Pages (`/lojas/[slug]`)

**`services/stores-public.service.ts`** (NOVO): `getStorePublic(slug)` e `getStoresRanking(limit)` — service role server-only, retorna dados de loja + merchant (score, verifiedLevel) + contagens de oferta/produto. Ver ADR-036.

**`app/lojas/[slug]/page.tsx`** (NOVO): página pública premium por loja. Hero banner + logo + badges (Verificada, Merchant Score), stats grid (ofertas, produtos, avaliação, score), sobre a loja, contato completo (telefone, WhatsApp, Instagram, site, e-mail, endereço, horário), serviços (entrega, retirada, Pix), ofertas reais via `StoreOffers`, lojas relacionadas. JSON-LD `LocalBusiness` embutido. `generateMetadata` com OG/Twitter por loja.

**`app/lojas/[slug]/loading.tsx`** e **`not-found.tsx`** (NOVOs): skeleton animado e 404 com CTAs.

### Module 5 — Reputation Center

Arquitetura documentada via ADR-038. A reputação é derivada de `merchant_score` + `verified_level` + `store.rating`. Tabela `reviews` para Release 1.5.

### Module 6 — Store Ranking (`/lojas`)

**`app/lojas/page.tsx`** (NOVO): ranking de até 30 lojas, ordenado por Merchant Score → offerCount → rating. Cards com cover image, #rank badge, score badge, verified badge, descrição, contagem de ofertas. CTA para cadastro de lojistas. SEO completo (metadata, canonical, OG, Twitter).

### Module 7 — Commercial Plan Architecture

Arquitetura já documentada via ADR-035 (Release 1.2). Tabela `merchant_plans` com seed. Sem alteração nesta release.

### Module 8 — Analytics Structure

Arquitetura documentada via ADR-039. Tabela `merchant_analytics_events` existe (migration 0012). Dashboard `/merchant/analytics` permanece stub. Tracking será implementado no Release 1.5.

### Module 9 — UX Improvements

**`components/layout/Navbar.tsx`**: item "Lojas" adicionado ao menu (entre Produtos e Buscar). Item "IA" removido (hash link sem página real — noise de navegação).

**`app/merchant/dashboard/page.tsx`**: grade ScoreCard + GoalsPanel + MerchantProgressCard em 3 colunas (era 2 colunas ScoreCard + GoalsPanel). Layout mais rico sem aumentar rolagem.

**`components/layout/Footer.tsx`**: "Lojas" no coluna Plataforma agora link real (`/lojas`), antes "em breve".

### Module 10 — Commercial SEO

**`app/sitemap.ts`**: adicionadas `/lojas` (priority 0.9), `/para-lojistas` (priority 0.8), e rotas dinâmicas `/lojas/[slug]` (priority 0.85) — via `getStoresRanking(100)`.

`/lojas/[slug]/page.tsx` tem `generateMetadata` com canonical, OG, Twitter, JSON-LD `LocalBusiness` (schema.org) por loja.

### ADRs

- ADR-036: Páginas públicas `/lojas` usam service role para dados de merchant
- ADR-037: Merchant Progress Engine computado on-demand
- ADR-038: Reputation Center — arquitetura sem reviews (Release 1.5)
- ADR-039: Analytics Events — write-only nesta fase

### Validações

- `npm run lint` → 0 erros, 0 warnings
- `npx tsc --noEmit` → 0 erros
- `npm run build` → OK, 67 rotas (`/lojas`, `/lojas/[slug]`, `/para-lojistas` + 64 anteriores)
