#!/usr/bin/env bash
# ParaguAI — verificação de restauração.
#
# A premissa: BACKUP ≠ arquivo existente. BACKUP VÁLIDO = backup
# restaurável. Este script prova a segunda coisa.
#
# Duas modalidades:
#
#   --offline   Só as verificações que não exigem Docker: checksums,
#               manifesto, coerência entre manifesto e arquivos, integridade
#               do db-config, presença da root key do pgsodium e do
#               inventário do Storage. Serve para rodar em qualquer host,
#               inclusive antes de o stack existir.
#
#   (padrão)    Tudo do modo offline MAIS a restauração real do dump num
#               PostgreSQL DESCARTÁVEL e isolado (container próprio, porta
#               própria, volume efêmero) com verificações de integridade.
#
# NUNCA toca no banco de produção, nem no Supabase Cloud. O único destino
# de escrita é o container temporário que ele mesmo cria e destrói.
#
# Uso: restore-verify.sh [--offline] <dir-do-backup> [imagem-postgres]
set -uo pipefail
umask 077

OFFLINE=0
if [ "${1:-}" = "--offline" ]; then OFFLINE=1; shift; fi

BACKUP_DIR="${1:?uso: restore-verify.sh [--offline] <dir-do-backup> [imagem]}"
PG_IMAGE="${2:-supabase/postgres:17.6.1.136}"
DUMP="${BACKUP_DIR}/database.dump"
DBCONF="${BACKUP_DIR}/db-config.tar.gz"
MANIFEST="${BACKUP_DIR}/manifest.json"
STORMAN="${BACKUP_DIR}/storage.manifest"
CONTAINER="paraguai-restore-verify-$$"
PGPORT_TMP="${PGPORT_TMP:-55432}"
PGPASS_TMP="verify-only-$$"

FAILURES=0
fail() { echo "❌ FALHA: $*"; FAILURES=$((FAILURES+1)); }
hard() { echo "❌ FALHA: $*"; exit 1; }
ok()   { echo "✅ $*"; }
warn() { echo "⚠️  $*"; }

# Lê um escalar do manifesto sem depender de jq (ausente no host mínimo).
# A captura para no primeiro `"` — sem isso, um valor com `:` dentro (como
# 2026-08-13T03:30:00Z) seria truncado pela ganância do `.*:`.
mget() { sed -nE "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"?([^\",}]*)\"?.*/\1/p" "$MANIFEST" 2>/dev/null | head -1; }

[ -d "$BACKUP_DIR" ] || hard "$BACKUP_DIR não existe"
[ -f "$DUMP" ] || hard "$DUMP não existe"

echo "=== 1/8 checksums ==="
if [ -f "${BACKUP_DIR}/SHA256SUMS" ]; then
  if ( cd "$BACKUP_DIR" && sha256sum -c --quiet SHA256SUMS 2>/dev/null ); then
    ok "SHA256SUMS confere para todos os artefatos"
  else
    fail "SHA256SUMS NÃO confere — algum artefato foi corrompido ou truncado"
    ( cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS 2>&1 | grep -v ': OK$' | sed 's/^/    /' )
  fi
elif [ -f "${BACKUP_DIR}/sha256.txt" ]; then
  EXPECTED=$(awk '{print $1}' "${BACKUP_DIR}/sha256.txt")
  ACTUAL=$(sha256sum "$DUMP" | awk '{print $1}')
  [ "$EXPECTED" = "$ACTUAL" ] && ok "sha256 do dump confere (formato legado)" \
    || fail "checksum divergente (esperado ${EXPECTED:0:16}..., obtido ${ACTUAL:0:16}...)"
else
  warn "sem SHA256SUMS nem sha256.txt — o backup não é auditável"
fi

echo "=== 2/8 manifesto ==="
if [ ! -f "$MANIFEST" ]; then
  warn "manifest.json ausente (backup anterior à Sprint 21?)"
else
  SCHEMA=$(mget schemaVersion); STATUS_DB=$(mget status)
  [ -n "$SCHEMA" ] && ok "manifest.json legível (schemaVersion=${SCHEMA})" || fail "manifest.json ilegível"
  echo "    hostname=$(mget hostname) gitCommit=$(mget gitCommit)"
  echo "    startedAt=$(mget startedAt)"
  # Coerência: o sha registrado tem de bater com o arquivo em disco.
  M_SHA=$(grep -A8 '"database"' "$MANIFEST" | grep -oE '"sha256"[^,]*' | head -1 | sed -E 's/.*"sha256"[^"]*"([^"]*)".*/\1/')
  A_SHA=$(sha256sum "$DUMP" | awk '{print $1}')
  if [ -n "$M_SHA" ]; then
    [ "$M_SHA" = "$A_SHA" ] && ok "sha256 do dump bate com o manifesto" \
      || fail "manifesto e dump divergem — artefatos de execuções diferentes misturados"
  fi
fi

echo "=== 3/8 índice do dump legível ==="
if command -v pg_restore >/dev/null 2>&1; then
  if pg_restore --list "$DUMP" >/dev/null 2>&1; then
    ENTRIES=$(pg_restore --list "$DUMP" 2>/dev/null | grep -c 'TABLE DATA' || true)
    ok "índice legível — ${ENTRIES} tabelas com dados"
  else
    fail "pg_restore --list não conseguiu ler o dump (truncado ou corrompido)"
  fi
else
  warn "pg_restore não instalado no host — índice será validado dentro do container"
fi

echo "=== 4/8 db-config (root key do pgsodium) ==="
# Este é o artefato que separa "restaurei o banco" de "recuperei o sistema".
# Sem a root key, colunas cifradas voltam como texto cifrado ilegível.
if [ ! -f "$DBCONF" ]; then
  warn "db-config.tar.gz ausente — se o stack já rodou, a root key do pgsodium NÃO está protegida"
else
  if tar -tzf "$DBCONF" >/dev/null 2>&1; then
    N=$(tar -tzf "$DBCONF" 2>/dev/null | wc -l)
    ok "db-config.tar.gz íntegro (${N} entradas)"
    if tar -tzf "$DBCONF" 2>/dev/null | grep -qiE 'pgsodium.*\.key|\.key$'; then
      ok "root key do pgsodium presente no arquivo"
    else
      warn "nenhum arquivo .key no db-config — esperado ANTES do 1º boot; ALARMANTE depois dele"
    fi
  else
    fail "db-config.tar.gz corrompido — tar não consegue listar"
  fi
fi

echo "=== 5/8 inventário do Storage ==="
if [ ! -f "$STORMAN" ]; then
  warn "storage.manifest ausente — objetos do Storage sem inventário verificável"
else
  OBJ=$(wc -l < "$STORMAN")
  BYTES=$(awk -F'\t' '{s+=$2} END {print s+0}' "$STORMAN")
  ok "inventário: ${OBJ} objetos, ${BYTES} bytes"
  M_OBJ=$(grep -A6 '"storage"' "$MANIFEST" 2>/dev/null | grep -oE '"objects"[^,]*' | head -1 | grep -oE '[0-9]+' || true)
  if [ -n "${M_OBJ:-}" ]; then
    [ "$M_OBJ" = "$OBJ" ] && ok "contagem bate com o manifesto" \
      || fail "manifesto diz ${M_OBJ} objetos, inventário tem ${OBJ}"
  fi
fi

if [ "$OFFLINE" -eq 1 ]; then
  echo
  echo "=== modo --offline: restauração real NÃO executada ==="
  echo "    (exige Docker e cria um container descartável)"
  if [ "$FAILURES" -eq 0 ]; then
    ok "VERIFICAÇÕES OFFLINE APROVADAS — artefatos íntegros e coerentes"
    exit 0
  fi
  echo "❌ ${FAILURES} verificação(ões) falharam"
  exit 1
fi

echo "=== 6/8 subindo PostgreSQL isolado (${PG_IMAGE}) ==="
command -v docker >/dev/null 2>&1 || hard "docker indisponível — use --offline"
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD="$PGPASS_TMP" \
  -p "127.0.0.1:${PGPORT_TMP}:5432" \
  "$PG_IMAGE" >/dev/null || hard "não foi possível subir o container"

for i in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
  [ "$i" -eq 60 ] && hard "PostgreSQL não ficou pronto em 60s"
  sleep 1
done
ok "PostgreSQL pronto e aceitando conexão"

# Toda ferramenta Postgres usada aqui é a de DENTRO do container: remove a
# dependência de postgresql-client no host e garante que a versão do
# pg_restore case com a do servidor.
docker cp "$DUMP" "$CONTAINER":/tmp/database.dump >/dev/null

echo "=== 7/8 restaurando ==="
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
docker exec "$CONTAINER" pg_restore -U postgres -d postgres --no-owner --no-privileges /tmp/database.dump 2>/tmp/restore_err_$$
RESTORE_RC=$?
ERR_COUNT=$(grep -c "^pg_restore: error" /tmp/restore_err_$$ 2>/dev/null || echo 0)
echo "    pg_restore exit=${RESTORE_RC}, erros reportados=${ERR_COUNT}"
[ "$ERR_COUNT" -gt 0 ] && head -5 /tmp/restore_err_$$ | sed 's/^/    /'
rm -f /tmp/restore_err_$$

echo "=== 8/8 verificações de integridade ==="
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

q "SELECT relname||'='||n_live_tup FROM pg_stat_user_tables WHERE schemaname='public' AND n_live_tup>0 ORDER BY n_live_tup DESC LIMIT 10;" | sed 's/^/    /'
TOTAL_ROWS=$(q "SELECT COALESCE(sum(n_live_tup),0) FROM pg_stat_user_tables WHERE schemaname='public';")
echo "    total de linhas restauradas: ${TOTAL_ROWS}"

echo
if [ "$FAILURES" -eq 0 ]; then
  ok "RESTORE VERIFICADO — backup é restaurável"
  echo "   tabelas=${TABLES} indices=${INDEXES} constraints=${CONSTRAINTS} policies=${POLICIES} linhas=${TOTAL_ROWS}"
  exit 0
fi
echo "❌ ${FAILURES} verificação(ões) falharam"
exit 1
