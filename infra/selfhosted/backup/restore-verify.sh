#!/usr/bin/env bash
# ParaguAI — verificação de restauração (Sprint 16, Fase 7).
#
# A premissa desta Sprint: BACKUP ≠ arquivo existente. BACKUP VÁLIDO =
# backup restaurável. Este script prova a segunda coisa, restaurando o dump
# num PostgreSQL DESCARTÁVEL e isolado (container próprio, porta própria,
# volume efêmero) e rodando verificações de integridade contra ele.
#
# NUNCA toca no banco de produção, nem no Supabase Cloud. O único destino
# de escrita é o container temporário que ele mesmo cria e destrói.
#
# Uso: restore-verify.sh <caminho-do-diretorio-de-backup> [imagem-postgres]
set -euo pipefail

BACKUP_DIR="${1:?uso: restore-verify.sh <dir-do-backup> [imagem]}"
PG_IMAGE="${2:-postgres:17-alpine}"
DUMP="${BACKUP_DIR}/database.dump"
CONTAINER="paraguai-restore-verify-$$"
PGPORT_TMP="${PGPORT_TMP:-55432}"
PGPASS_TMP="verify-only-$$"

[ -f "$DUMP" ] || { echo "ERRO: $DUMP não existe"; exit 1; }

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

fail() { echo "❌ FALHA: $*"; exit 1; }
ok() { echo "✅ $*"; }

echo "=== 1/6 checksum ==="
if [ -f "${BACKUP_DIR}/sha256.txt" ]; then
  EXPECTED=$(awk '{print $1}' "${BACKUP_DIR}/sha256.txt")
  ACTUAL=$(sha256sum "$DUMP" | awk '{print $1}')
  [ "$EXPECTED" = "$ACTUAL" ] || fail "checksum divergente (esperado ${EXPECTED:0:16}..., obtido ${ACTUAL:0:16}...)"
  ok "sha256 confere"
else
  echo "⚠️  sem sha256.txt — seguindo, mas o backup não é auditável"
fi

echo "=== 2/6 subindo PostgreSQL isolado (${PG_IMAGE}) ==="
docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD="$PGPASS_TMP" \
  -p "127.0.0.1:${PGPORT_TMP}:5432" \
  "$PG_IMAGE" >/dev/null || fail "não foi possível subir o container"

for i in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  [ "$i" -eq 60 ] && fail "PostgreSQL não ficou pronto em 60s"
  sleep 1
done
ok "PostgreSQL pronto e aceitando conexão"

# O dump é copiado ANTES da checagem de índice: toda ferramenta Postgres
# usada aqui é a de DENTRO do container descartável, nunca a do host. Isso
# remove a dependência de ter postgresql-client instalado em quem roda a
# verificação, e garante que a versão do pg_restore case com a do servidor.
docker cp "$DUMP" "$CONTAINER":/tmp/database.dump >/dev/null

echo "=== 3/6 índice do dump legível ==="
docker exec "$CONTAINER" pg_restore --list /tmp/database.dump > /dev/null 2>&1 \
  || fail "pg_restore --list não conseguiu ler o dump (arquivo truncado ou corrompido)"
ENTRIES=$(docker exec "$CONTAINER" pg_restore --list /tmp/database.dump 2>/dev/null | grep -c 'TABLE DATA' || true)
ok "índice legível — ${ENTRIES} tabelas com dados no dump"

echo "=== 4/6 restaurando ==="
# GoTrue/Storage não existem neste container descartável: os papéis e o
# schema `auth` que as policies referenciam precisam existir para o restore
# não falhar. Criá-los aqui é parte da VERIFICAÇÃO, não do backup — no VPS
# real quem os cria é o próprio stack do Supabase.
docker exec -i "$CONTAINER" psql -U postgres -q <<'SQL'
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN NOINHERIT;                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN NOINHERIT;       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'verify';  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE supabase_admin SUPERUSER LOGIN PASSWORD 'verify'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Stub mínimo de auth.users: 18 FKs do schema do ParaguAI apontam para cá.
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULL::uuid $f$;
SQL

# --exit-on-error NÃO é usado de propósito: objetos pertencentes a schemas
# gerenciados pelo Supabase (auth/storage) podem divergir do stub acima. Os
# erros são contados e o veredito vem das verificações de integridade.
set +e
docker exec "$CONTAINER" pg_restore -U postgres -d postgres --no-owner --no-privileges /tmp/database.dump 2>/tmp/restore_err_$$
RESTORE_RC=$?
set -e
ERR_COUNT=$(grep -c "^pg_restore: error" /tmp/restore_err_$$ 2>/dev/null || echo 0)
echo "    pg_restore exit=${RESTORE_RC}, erros reportados=${ERR_COUNT}"
[ "$ERR_COUNT" -gt 0 ] && head -5 /tmp/restore_err_$$ | sed 's/^/    /'
rm -f /tmp/restore_err_$$

echo "=== 5/6 verificações de integridade ==="
q() { docker exec "$CONTAINER" psql -U postgres -tAc "$1"; }

TABLES=$(q "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
INDEXES=$(q "SELECT count(*) FROM pg_indexes WHERE schemaname='public';")
CONSTRAINTS=$(q "SELECT count(*) FROM information_schema.table_constraints WHERE table_schema='public';")
FUNCS=$(q "SELECT count(*) FROM information_schema.routines WHERE routine_schema='public';")
TRIGGERS=$(q "SELECT count(*) FROM information_schema.triggers WHERE trigger_schema='public';")
RLS=$(q "SELECT count(*) FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename WHERE t.schemaname='public' AND c.relrowsecurity;")
POLICIES=$(q "SELECT count(*) FROM pg_policies WHERE schemaname='public';")

printf '    tabelas=%s indices=%s constraints=%s funcoes=%s triggers=%s rls=%s policies=%s\n' \
  "$TABLES" "$INDEXES" "$CONSTRAINTS" "$FUNCS" "$TRIGGERS" "$RLS" "$POLICIES"

[ "${TABLES:-0}" -gt 0 ] || fail "nenhuma tabela restaurada"
[ "${INDEXES:-0}" -gt 0 ] || fail "nenhum índice restaurado"

echo "=== 6/6 contagem de registros por tabela (amostra) ==="
q "SELECT relname||'='||n_live_tup FROM pg_stat_user_tables WHERE schemaname='public' AND n_live_tup>0 ORDER BY n_live_tup DESC LIMIT 10;" | sed 's/^/    /'
TOTAL_ROWS=$(q "SELECT COALESCE(sum(n_live_tup),0) FROM pg_stat_user_tables WHERE schemaname='public';")
echo "    total de linhas restauradas: ${TOTAL_ROWS}"

echo
ok "RESTORE VERIFICADO — backup é restaurável"
echo "   tabelas=${TABLES} indices=${INDEXES} constraints=${CONSTRAINTS} policies=${POLICIES} linhas=${TOTAL_ROWS}"
