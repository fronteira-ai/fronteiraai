# RELEASE_1_7_EXECUTION_PLAN.md
# Plano de Execução Técnica — Epic 1: Connector Platform Framework

**Versão**: 1.0
**Criado**: 2026-07-01
**Status**: Aprovado — em execução
**Referência**: `docs/product/releases/RELEASE_1_7_BLUEPRINT.md`
**Arquitetura base**: Release 1.6 — `docs/architecture/ARCHITECTURE.md`

---

## Premissa

Este documento detalha a execução técnica do Epic 1 do Release 1.7. Epics 2–7 serão detalhados em documentos equivalentes quando sua vez chegar no ciclo faseado descrito no Blueprint.

## Estado de partida

**Existe e funciona (`acquisition/`, Release 0.9)**: `AcquisitionPipeline` (Validation → Normalization → Deduplication → [Media] → CatalogWriter), `connectorRegistry` (Map em memória), `JsonFileConnector`/`CsvFileConnector`/`ShoppingChinaConnector`, `HttpFetchStrategy`, `JSONParser`/`CSVParser`, `price_history` (tabela viva em produção, ver ADR-017/018/019). Exposto via `app/api/admin/import/*` e `app/api/merchant/imports/*`.

**Lacunas conhecidas, preservadas e sinalizadas (não corrigidas neste Epic)**:
- `requireMerchant()` não verifica que o conector pertence às lojas do merchant (`merchant_stores`) — Epic 2.
- `DeduplicationStage` só compara `price_usd` — mudanças de estoque/descrição/imagem são invisíveis — Epic 3.
- Ofertas novas nunca recebem linha em `price_history` (só o caminho de atualização grava) — Epic 3.
- `connector_configs` (migration 0010) está morta — RLS `USING(false)` bloqueia até o service-role via PostgREST; nunca lida/escrita pelo código.

## Decisões de arquitetura do Epic 1

1. `PipelineContext.supabase: SupabaseClient` é substituído por `ICatalogRepository` nos stages — corrige o vazamento de infraestrutura no tipo de domínio.
2. Novas tabelas `connectors` e `connector_sync_runs` substituem o registro apenas-em-memória e o `import_logs` ad hoc como fonte de verdade — necessárias como âncora de FK para Epics futuros (Claim, ChangeDetector).
3. `connector_configs` não é ressuscitada — marcada como superada no comentário da migration 0022, não é removida (sem ferramenta de DDL neste projeto; aplicação de migration é sempre manual pelo CTO no Supabase SQL Editor).
4. `import_logs` recebe escrita dupla apenas neste Epic (formato inalterado) para que `getMerchantDashboardStats()` continue funcionando sem modificação; Epic 2 migra para `connector_sync_runs` e a escrita dupla é removida.
5. Eventos do Brain (`ConnectorRegistered`, `ConnectorSyncStarted/Completed/Failed`) são adicionados a `TrustEventType` + `TRUST_EVENT_BRAIN_IMPACT`, mapeando para `BrainAsset.HistoricalData`/`BrainAsset.SearchIntelligence` (sem novos membros de `BrainAsset`). São emitidos apenas no caminho de sincronização disparado por merchant (onde `merchantId` existe) — o caminho admin/global não emite eventos neste Epic. Esta é a primeira vez que um domínio fora de `src/domains/trust/` alimenta o Brain.
6. A lacuna de autorização de conector por merchant é preservada neste Epic, marcada com `// TODO(Epic 2): scope by merchant_stores ownership` no ponto exato da checagem.

## Árvore de arquivos — `src/domains/connectors/`

Ver estrutura completa no plano de implementação da sessão (arquivo de plano local). Resumo das pastas: `domain/` (Connector, SyncRun, ProductIdentity), `types/`, `repositories/` (IConnectorRepository, ISyncRunRepository, ICatalogRepository), `infrastructure/` (implementações Supabase), `normalization/` (OfferNormalizer, ProductIdentityResolver), `mapping/` (JsonFieldMapper, CsvFieldMapper), `crawler/` (fetch/, shoppingchina/, reference/, bootstrap.ts), `services/` (ConnectorRegistry, SyncOrchestrator, stages/), `scheduler/` (ISyncScheduler, ManualSyncTrigger — apenas costura, sem cron real neste Epic), `events/` (connector.events.ts), `__tests__/`.

Factory: `lib/connectors-factory.ts` — `createConnectorsServices(client: SupabaseClient)`.

## Migration `0022_connector_platform.sql`

Duas tabelas novas: `connectors` (registro persistente, substitui o registro apenas-em-memória) e `connector_sync_runs` (execução de sincronização, com `merchant_id` opcional para runs administrativos). Segue o template de `0021_growth_engine.sql`. **Aplicação manual obrigatória pelo CTO no Supabase SQL Editor antes de qualquer teste não-dry-run.**

## Rotas de API afetadas

`app/api/admin/import/{connectors,run}/route.ts` e `app/api/merchant/imports/{run,history}/route.ts` passam a usar `createConnectorsServices()` em vez de importar `acquisition/` diretamente. Nenhuma mudança de contrato (mesmo formato de request/response) — as páginas `app/admin/imports/page.tsx` e `app/merchant/imports/*` não precisam de nenhuma alteração.

## Retirada de `acquisition/`

Ordem: construir o novo domínio → aplicar migration 0022 (manual) → teste de paridade dry-run (JSON/CSV/ShoppingChina) comparando saída do `SyncOrchestrator` com a do `AcquisitionPipeline` → cortar as quatro rotas de API → mover os 3 scripts CLI para `scripts/` (novo diretório de nível superior) → atualizar `package.json` → deletar `acquisition/` por completo → atualizar documentação.

## Quality Gate do Epic 1

`npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run build` · teste manual de fumaça (dry-run JSON/CSV via scripts movidos, `/admin/imports`, `/merchant/imports/new`) · confirmação explícita ao usuário de que a migration 0022 precisa ser aplicada manualmente antes de qualquer escrita real.
