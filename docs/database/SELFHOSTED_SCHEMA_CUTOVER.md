# SELFHOSTED SCHEMA CUTOVER — Runbook

> Sprint 38E — o schema canônico do Supabase Cloud foi **materializado no
> PostgreSQL self-hosted real** do VPS Fluence. Este runbook permite
> reconstruir/auditar o estado por terceiro, sem conhecimento tribal.

## Estado atual (2026-08-21)

| Item | Estado |
|---|---|
| Schema `public` self-hosted | **68 tabelas, 226 índices, 50 policies, 2 funções, 1 trigger public, 1 trigger auth, 0 views, 0 matviews, 0 sequences** |
| `CLOUD_SCHEMA == SELFHOSTED_SCHEMA` | **SIM — `SEMANTIC_DIFF=0`**, SHA normalizado `04801957b346f2e64efb28fabdff4f05293b6c4ff4b3fbcd311a4865b174f6dc` |
| `CLOUD_SCHEMA == RESTORED_SCHEMA` | **SIM — `SEMANTIC_DIFF=0`**, mesmo SHA (restore do backup reproduz o schema) |
| Migração de dados Cloud → self-hosted | **NÃO realizada** (Sprint 38F futura) |
| Aplicação (Vercel) | **ainda aponta para o Supabase Cloud** (`acairzpzsklctaqjsukw.supabase.co`) |
| `20260713120000_buyer_identity` | **CONGELADA** (pós-baseline; não aplicada) |
| `20260809120000_search_products_catalog` | **CONGELADA** (pós-baseline; não aplicada) |

## O que foi executado na Sprint 38E

1. **Pre-flight**: 8 containers healthy, restarts=0, timers ativos, `public` vazio (0 tabelas),
   `auth.users`/roles/`auth.uid()` presentes no self-hosted.
2. **Backup pré-DDL**: `backup.sh` → OK, R2 (`r2:paraguai-backups`), checksums válidos.
3. **Git alignment**: rebase dos 3 commits da 38D sobre `origin/sprint-0/baseline-recovery`
   (86f206f → e008e3e), push fast-forward, `LOCAL == ORIGIN`. Baselines Sprint 3C superados
   arquivados em `docs/archive/database-baselines/sprint-3c/`.
4. **Baseline aplicado**: `supabase/migrations/00000000000000_cloud_baseline.sql` via
   `docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1` → **exit 0**.
5. **Trigger auth**: `20260821120000_post_bootstrap_auth_trigger.sql` → **exit 0**
   (`on_auth_user_created` em `auth.users` — reproduz o Cloud).
6. **Convergência**: auditoria self-hosted pós-aplicação = SHA `04801957…` (== Cloud);
   `SEMANTIC_DIFF=0` nas 16 categorias.
7. **Provas numéricas**: 68/728/68/104/35/81/226/68/50/2/1/1/0/0/0/0; presenças
   (`favorites`, `Public read stores`, `offers_product_store_unique`); ausências
   (`buyers`, `buyer_consent_log`, `search_products_catalog`, `website_url`,
   `business_hours`, matviews).
8. **Data sanity**: `TOTAL_ROWS=0, NONZERO_TABLES=0` no `public`.
9. **API**: `NOTIFY pgrst, 'reload schema'`; interno + externo
   (`https://api.fronteiraai.com/rest/v1/brands` → **200 []**);
   POST anon → **401** (RLS bloqueia); service-only → **200 []** (sem vazamento).
10. **Backup pós-schema**: OK (104 tabelas, R2).
11. **Restore-verify**: harness oficial → `RESTORE VERIFICADO`; restore-audit próprio →
    catálogo restaurado com SHA `04801957…` == Cloud.

## Como reconstruir do zero (procedimento)

```bash
# 1. Subir o stack self-hosted (bootstrap da plataforma cria auth/storage/roles).
cd /opt/paraguai && git pull --ff-only origin sprint-0/baseline-recovery

# 2. Aplicar baseline canônico (schema public do ParaguAI).
sudo docker exec -i supabase-db psql -U postgres -v ON_ERROR_STOP=1 -d postgres \
  < supabase/migrations/00000000000000_cloud_baseline.sql

# 3. Aplicar trigger pós-bootstrap (auth.users).
sudo docker exec -i supabase-db psql -U postgres -v ON_ERROR_STOP=1 -d postgres \
  < supabase/migrations/20260821120000_post_bootstrap_auth_trigger.sql

# 4. (quando autorizado) migrations pós-baseline: 20260713120000 (corrigida) e
#    20260809120000 — CONGELADAS nesta data.

# 5. Recarregar cache do PostgREST.
sudo docker exec supabase-db psql -U postgres -c "NOTIFY pgrst, 'reload schema';"
```

## Como auditar a convergência

```bash
# Cloud (read-only; requer /run/paraguai/cloud.pgpass no VPS)
PGPASSFILE=/run/paraguai/cloud.pgpass \
  scripts/audit-cloud-schema.sh /tmp/audit/cloud-snapshot

# Self-hosted
AUDIT_CONTAINER=supabase-db \
  scripts/audit-cloud-schema.sh /tmp/audit/selfhosted-snapshot

# Diff objeto a objeto
CLOUD_DIR=/tmp/audit/cloud-snapshot REBUILD_DIR=/tmp/audit/selfhosted-snapshot \
  scripts/compare-schema-catalogs.sh
# Esperado: SEMANTIC_DIFF=0 e SHA 04801957…
```

## Restore (procedimento validado)

```bash
# Harness oficial (container descartável, nunca toca produção):
sudo /opt/paraguai/infra/selfhosted/backup/restore-verify.sh /backups/paraguai/YYYY-MM-DD
# Auditoria semântica do restaurado:
#   docker run ... supabase/postgres:17.6.1.136 + stub de roles/auth (ver
#   restore-verify.sh linhas 175-193) + pg_restore --no-owner --no-privileges
#   + scripts/audit-cloud-schema.sh (AUDIT_CONTAINER=<container>)
```

## Notas

- Nenhuma credencial/senha está neste documento nem nos scripts.
- `database/migrations/` e os baselines arquivados são históricos — NÃO executar.
- O tracking do Supabase Cloud não foi alterado (decisão do proprietário).
- Backup diário: `/backups/paraguai/<YYYY-MM-DD>/` + réplica `r2:paraguai-backups`.
