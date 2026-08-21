# BASELINE MANIFEST — Corte do schema no Supabase Cloud

Ponto de corte: **catálogo real do Supabase Cloud em 2026-08-21** (Sprint 38C-R/38D).
Autoridade do baseline: **o catálogo real (pg_catalog/information_schema) no ponto de corte** —
o migration tracking do Cloud **não é autoridade absoluta** (há versões registradas sem efeito e
objetos aplicados sem registro — ver abaixo).

## Arquivos

| Arquivo | Papel |
|---|---|
| `00000000000000_cloud_baseline.sql` | **Baseline canônico** — schema `public` real do Cloud (68 tabelas, 226 índices, 50 policies, 2 funções, 0 views, 0 matviews, 0 sequences). Sem dados, sem DELETE, sem secrets. |
| `20260821120000_post_bootstrap_auth_trigger.sql` | **Pós-bootstrap** — reproduz `on_auth_user_created` em `auth.users` (dependência de plataforma; aplicar após o GoTrue). |
| `20260713120000_buyer_identity.sql` | **Pós-baseline** — ver classificação abaixo (correção Sprint 3C). |
| `20260809120000_search_products_catalog.sql` | **Pós-baseline** — função ainda não aplicada ao Cloud. |

## Classificação do histórico de migrations

| Migration | Classificação | Justificativa (evidência do catálogo real) |
|---|---|---|
| `database/migrations/0001–0017` | `HISTORICAL_DO_NOT_REPLAY` / `ABSORBED_IN_BASELINE` | Replay produziria objetos que NÃO existem no Cloud (0001: `stores.website_url`/`business_hours`; 0003/0005: matviews) e pularia objetos que existem (favorites, policy `Public read stores`). Efeito já materializado no Cloud = absorvido pelo baseline. |
| 20 migrations V2 registradas e eficazes (20260701120000 → 20260722130000, exceto 1312) | `ABSORBED_IN_BASELINE` | Objetos presentes no Cloud; tracking registrado. |
| `20260723120000_continuous_knowledge_engine` | `ABSORBED_IN_BASELINE` | `knowledge_history` **existe** no Cloud **sem** registro no tracking (aplicada manualmente). |
| `20260724120000_canonical_suggestion_outbox` + `20260725090000_outbox_hardening` | `ABSORBED_IN_BASELINE` | `canonical_suggestion_outbox` e `canonical_bootstrap_checkpoint` **existem** no Cloud sem registro (aplicadas manualmente). |
| `20260713120000_buyer_identity` | `POST_BASELINE` / `NOT_APPLIED_EFFECTIVELY` | **Registrada no tracking mas ineficaz**: `buyers`/`buyer_consent_log`/rate-limits NÃO existem no Cloud; a versão commitada continha SQL inválido (42601); `handle_new_user` no Cloud é a versão legada. Decisão do proprietário: NÃO aplicar agora; permanece pós-baseline (versão corrigida Sprint 3C). |
| `20260809120000_search_products_catalog` | `POST_BASELINE` / `NOT_APPLIED` | Função `search_products_catalog` ausente no Cloud; não registrada. Decisão: permanece pós-baseline. |

## Objetos absorvidos do Cloud sem origem em migrations

- `favorites` — existe no Cloud (4 colunas: id, profile_id, product_id, created_at); **nenhum** migration/baseline antigo a cria. Origem: `ABSORBED_FROM_PRODUCTION_SCHEMA`.
- Policy `Public read stores` (FOR SELECT TO public USING(true) em `stores`) — existe no Cloud; ausente em todos os migrations/baselines antigos. `ABSORBED_FROM_PRODUCTION_SCHEMA`.
- Constraint `offers_product_store_unique` (UNIQUE product_id, store_id) — efeito da migration 0011 no Cloud; **o DELETE histórico da 0011 NÃO entra no baseline**.

## Como verificar convergência

```bash
# 1. snapshot do Cloud (read-only)
PGPASSFILE=/run/paraguai/cloud.pgpass scripts/audit-cloud-schema.sh /tmp/cloud-snapshot
# 2. aplicar baseline em banco descartável (postgres:17 isolado, fixture auth mínima)
# 3. snapshot do rebuild
AUDIT_CONTAINER=paraguai-baseline-verify scripts/audit-cloud-schema.sh /tmp/rebuild-snapshot
# 4. diff objeto a objeto
CLOUD_DIR=/tmp/cloud-snapshot REBUILD_DIR=/tmp/rebuild-snapshot scripts/compare-schema-catalogs.sh
# esperado: SEMANTIC_DIFF=0 e SHAs iguais
```

## Notas de governança

- O tracking do Cloud NÃO será "reparado" nesta Sprint (decisão do proprietário).
- Novas migrations devem ser criadas a partir do baseline (corte), nunca "consertando" o replay.
- `database/migrations/` permanece como registro histórico congelado (não executar).
