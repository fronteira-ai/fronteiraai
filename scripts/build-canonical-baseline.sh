#!/usr/bin/env bash
# ============================================================
# Sprint 38D FASE 3 — Sanitizacao do dump em baseline canonico.
#
# INPUT : pg_dump --schema-only --no-owner --no-privileges --schema=public
# OUTPUT: supabase/migrations/00000000000000_cloud_baseline.sql
#
# Transformacoes (todas automaticas, documentadas, reproduziveis,
# semanticamente justificadas):
#   1. remove o cabecalho de comentarios gerado pelo pg_dump;
#   2. remove SETs de sessao (statement_timeout, search_path, config, etc.);
#   3. remove SELECT pg_catalog.set_config / setval (nenhuma sequence aqui);
#   4. remove COMMENT ON EXTENSION plpgsql e
#      COMMENT ON SCHEMA public IS 'standard public schema' (artefatos do host);
#   5. remove linhas em branco do prologo.
#   6. CREATE SCHEMA public -> CREATE SCHEMA IF NOT EXISTS public (idempotencia:
#      num banco novo o schema public ja existe por padrao).
# Guardas: falha se houver COPY/INSERT/DELETE/UPDATE/TRUNCATE/GRANT/REVOKE/
# OWNER TO/credenciais/connection strings.
#
# Nada de constraints/defaults/tipos/nullability/RLS/policies/funcoes/
# triggers/indices e removido ou alterado — apenas o que esta em 1-5.
# ============================================================
set -euo pipefail

DUMP="${1:?uso: build-canonical-baseline.sh <dump.sql> [out.sql]}"
OUT="${2:-supabase/migrations/00000000000000_cloud_baseline.sql}"

awk '
  BEGIN { body = 0 }
  /^--/     { if (!body) next; print; next }
  /^SET /   { next }
  /^SELECT pg_catalog.set_config/ { next }
  /^SELECT pg_catalog.setval/ { next }
  /^\\restrict / { next }
  /^\\unrestrict/ { next }
  /^COMMENT ON EXTENSION plpgsql/ { next }
  /^COMMENT ON SCHEMA public IS .standard public schema./ { next }
  /^$/      { if (!body) next }
  { body = 1; print }
' "$DUMP" > "$OUT.tmp"

# transformacao 6: idempotencia do schema public
sed -i 's/^CREATE SCHEMA public;$/CREATE SCHEMA IF NOT EXISTS public;/' "$OUT.tmp"

# ---- guardas: nada de dados, ACLs, owners ou credenciais ----
if grep -nE '^COPY |^\\copy|^INSERT INTO|^DELETE FROM|^UPDATE |^TRUNCATE|^GRANT |^REVOKE | OWNER TO |password[[:space:]]*=|postgres(ql)?://' "$OUT.tmp"; then
  echo "GUARD FAILED — conteudo proibido encontrado no dump (ver linhas acima)." >&2
  exit 1
fi

{
  cat <<'HDR'
-- ============================================================
-- BASELINE CANONICO — schema real do Supabase Cloud (public)
-- Sprint 38D — prova: CLOUD_SCHEMA == BASELINE == REBUILD
--
-- Gerado por scripts/build-canonical-baseline.sh a partir de:
--   pg_dump --schema-only --no-owner --no-privileges --schema=public
-- Ponto de corte: catalogo do Cloud em 2026-08-21 (Sprint 38C-R).
-- Autoridade: CATALOGO REAL DO CLOUD (nao replay de migrations).
--
-- Conteudo esperado: 68 tabelas, 226 indices, 50 policies,
-- 2 funcoes public, 0 views, 0 matviews, 0 sequences.
-- Sem dados, sem DELETE, sem secrets, sem owners especificos.
--
-- APLICAR APOS o bootstrap da plataforma (auth.users e as roles
-- anon/authenticated/service_role ja existentes). A dependencia
-- handle_new_user/on_auth_user_created (auth.users) e reproduzida
-- pela migration pos-bootstrap 20260821120000_post_bootstrap_auth_trigger.sql.
-- ============================================================
HDR
  cat "$OUT.tmp"
  printf '\n'
} > "$OUT"
rm -f "$OUT.tmp"

echo "baseline gerado: $OUT ($(wc -l < "$OUT") linhas)"
grep -c '^CREATE TABLE ' "$OUT" | xargs echo "CREATE TABLE:"
grep -c '^CREATE POLICY ' "$OUT" | xargs echo "CREATE POLICY:"
grep -c '^CREATE FUNCTION ' "$OUT" | xargs echo "CREATE FUNCTION:"
grep -c '^CREATE INDEX ' "$OUT" | xargs echo "CREATE INDEX:"
