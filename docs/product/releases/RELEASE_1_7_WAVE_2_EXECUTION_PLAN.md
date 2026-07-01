# RELEASE_1_7_WAVE_2_EXECUTION_PLAN.md
# Plano de Execução Técnica — Wave 2: Merchant Connectors + Scheduler + Discovery

**Versão**: 1.0
**Criado**: 2026-07-01
**Status**: Entregue e certificado
**Referência**: `docs/product/releases/RELEASE_1_7_BLUEPRINT.md` (Capítulo 4 — Waves; Capítulo 8 — Product Identity Core Asset)
**Arquitetura base**: Release 1.7 — Epic 1 — `docs/product/releases/RELEASE_1_7_EXECUTION_PLAN.md`

---

## Premissa

Este documento detalha a execução técnica da Wave 2. Waves 3–5 serão detalhadas em documentos equivalentes quando sua vez chegar no ciclo faseado descrito no Blueprint.

## Correção de grounding relevante

`SyncOrchestrator.run()` já grava `connector_sync_runs` **incondicionalmente**, tanto para runs de merchant quanto admin/globais — `merchantId` no Epic 1 só condicionava a emissão de eventos do Brain, nunca a persistência do próprio run. Isso significa que `connector_sync_runs` já tinha, desde o Epic 1, 100% do histórico que `import_logs` tinha — nenhum backfill foi necessário para remover as duas escritas duplas desta Wave.

## Decisões numeradas

1. **Ownership/entitlement helpers vivem em `services/merchant.service.ts`**, não em `src/domains/connectors/` — mantém o domínio de merchant desacoplado do domínio de conectores; a rota de API é o ponto de integração. Apenas `getMerchantDashboardStats()` foi migrada para usar `getMerchantStoreIds()`; os outros 7 call sites que duplicam a mesma query (`ExecutiveSummaryService.ts`, rotas de command-center, `products/route.ts`, `stores/route.ts`, `onboarding/route.ts`) **não** foram tocados — refatoração opcional, fora do escopo funcional desta Wave.
2. **`import_logs` foi removida por completo (ambas as escritas duplas), não apenas para os fluxos de merchant.** `SyncOrchestrator` já persiste tudo em `connector_sync_runs` desde o Epic 1 — não havia razão funcional para manter `import_logs` viva. `app/admin/logs/page.tsx` e `app/merchant/imports/page.tsx` foram preservadas sem nenhuma mudança de UI, repontando suas rotas de API via `lib/sync-run-mapper.ts::toImportLogShape()`.
3. **Scheduler é interval-based, não um avaliador de expressões cron real.** `connectors.config.syncFrequencyHours` (jsonb já existente, sem migration) é comparado contra a última execução em `connector_sync_runs`; um único cron diário (`vercel.json`) varre todos os conectores `active` e decide em runtime quais estão devidos. Evita a complexidade real de um parser de cron (DST, tokens "L"/"W", etc.) para um requisito de produto que "sincronizar periodicamente" já satisfaz plenamente.
4. **Nome do evento de descoberta: `StoreDiscovered`, não `MerchantDiscovered`** (decisão confirmada com o CTO via pergunta direta) — mais preciso, já que nenhum merchant existe no momento da descoberta.
5. **Discovery é admin-triggered, um domínio por vez** (decisão confirmada com o CTO) — sem tabela de seed-list nem sweep automático agendado. A pergunta de onde viria a lista de domínios candidatos não tinha resposta no Blueprint; construir isso "adivinhando" a fonte teria sido um erro de escopo. Fica para uma Wave futura, uma vez decidida a fonte.
6. **Nenhuma UI de administração para `connectors.config.syncFrequencyHours`** (decisão confirmada com o CTO) — editado diretamente no Supabase por ora, mesmo espírito de "passo manual" já estabelecido para migrations.
7. **`stores` não ganhou nenhuma coluna de ownership.** "Loja não reivindicada" continua sendo, estruturalmente, "uma loja sem linha em `merchant_stores`" — verdade desde antes desta Wave, zero mudança de schema necessária para isso. Apenas colunas de proveniência (`discovered_at`, `discovery_connector_key`) foram adicionadas, para permitir que o Ecosystem Monitor e a futura Wave 4 (Claim) distingam "criada pelo admin" de "descoberta automaticamente".
8. **`IDiscoverySource`/`SitemapDiscoverySource` são deliberadamente separados de `IConnector`.** Discovery produz uma loja candidata (`DiscoveryResult`), não `RawOffer[]` — forçar isso pela interface de conector exigiria fabricar dados falsos ou enfraquecer a garantia do `CatalogWriteStage`. `DiscoveryService` é o único código autorizado a inserir em `stores` sem uma linha pré-existente, e o faz via `SupabaseClient` bruto, nunca via `ICatalogRepository` — a garantia "a loja já deve existir" nunca é tocada para conectores normais.
9. **`StoreDiscovered` existe apenas como taxonomia nesta Wave** — sem factory function nem chamada de ingestão, pelo mesmo motivo do Epic 1 com `ConnectorRegistered`: `TrustDomainEvent.merchantId` é uma string obrigatória, e nenhum merchant existe no momento da descoberta. Não se justifica flexibilizar esse contrato (usado por ~7 outros domínios) por esta Wave.

## Verificação / Quality Gate

`npm run lint` (0) · `npx tsc --noEmit` (0) · `npm test` (202/202, suíte completa) · `npm run build` (138 rotas, 5 novas).

**Não verificável localmente**: o cron do `vercel.json` só dispara em ambiente Vercel implantado, e `CRON_SECRET` precisa ser configurado manualmente no painel (Production + Preview) — mesmo espírito das migrations manuais. Verificação local possível: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/connectors/sync` com `CRON_SECRET` em `.env.local`.

**Migration `0023` requer aplicação manual pelo CTO no Supabase SQL Editor** antes que Discovery funcione contra dados reais (sem as colunas `discovered_at`/`discovery_connector_key`, o insert falha).
