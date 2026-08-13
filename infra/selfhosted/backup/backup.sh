#!/usr/bin/env bash
# ParaguAI — backup do Supabase self-hosted.
#
# Roda a cada 3 dias via systemd timer (ver backup.timer). NÃO toca no
# Supabase Cloud: opera exclusivamente contra o stack self-hosted.
#
# ── POR QUE ESTE SCRIPT NÃO É SÓ UM pg_dump (Sprint 20) ──────────────────
# A auditoria de custódia mostrou que o dump lógico do PostgreSQL é
# NECESSÁRIO mas não SUFICIENTE para reconstruir o ambiente:
#
#   • os objetos do Storage (imagens do catálogo, projeção 10–20 GB) não
#     estão no banco — vivem em /srv/paraguai/storage;
#   • a root key do pgsodium vive no volume Docker nomeado `db-config`
#     (montado em /etc/postgresql-custom). O pg_dump exporta colunas
#     cifradas como TEXTO CIFRADO: sem essa chave, o dado restaurado
#     existe e é ilegível — para sempre.
#
# Por isso o backup produz três artefatos e um manifesto que os amarra.
#
# Produz, por execução, em /backups/paraguai/<YYYY-MM-DD>/:
#   database.dump      pg_dump -Fc, comprimido
#   db-config.tar.gz   conteúdo de /etc/postgresql-custom (pgsodium + conf)
#   storage.manifest   inventário do Storage (contagem, bytes, listagem)
#   manifest.json      metadados + sha256 de cada artefato
#   SHA256SUMS         checksums verificáveis por `sha256sum -c`
#
# ── O QUE CONTA COMO SUCESSO ────────────────────────────────────────────
# O dump só é considerado válido depois de quatro provas:
#   1. pg_dump terminar com exit 0;
#   2. o arquivo existir e ter tamanho > MIN_DUMP_BYTES;
#   3. `pg_restore --list` conseguir ler o índice (prova de que não está
#      truncado — um arquivo existente NÃO é um backup);
#   4. o sha256 ser gravado.
# A retenção só apaga backup antigo DEPOIS disso.
#
# ── ESTADOS ─────────────────────────────────────────────────────────────
#   ok        todos os artefatos capturados e replicados
#   degraded  o banco está salvo, mas algo secundário faltou (db-config
#             inacessível, Storage sem cópia externa, R2 não configurado)
#   failed    o dump do banco falhou — NÃO há backup desta execução
#
# `degraded` sai com 0 de propósito: o backup do banco é real e não deve
# ser marcado como falho. Quem grita é o healthcheck.sh, que lê o
# last_result.json e transforma cada lacuna em ALERTA. O que não pode
# acontecer é lacuna silenciosa.
#
# ── SEGREDOS ────────────────────────────────────────────────────────────
# Nenhum valor sensível é impresso, logado ou escrito no manifesto. A
# senha chega por PGPASSWORD (libpq) e nunca aparece em linha de comando.
# umask 077: todo artefato nasce legível só pelo dono.
set -euo pipefail
umask 077

: "${PGHOST:?PGHOST obrigatório}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER obrigatório}"
: "${PGDATABASE:=postgres}"
: "${PGPASSWORD:?PGPASSWORD obrigatório (nunca versionado — ver .env.example)}"

BACKUP_ROOT="${BACKUP_ROOT:-/backups/paraguai}"
RETENTION_COUNT="${RETENTION_COUNT:-10}"     # ~30 dias com cadência de 3 dias
MIN_DUMP_BYTES="${MIN_DUMP_BYTES:-10240}"
STORAGE_PATH="${STORAGE_PATH:-/srv/paraguai/storage}"
DB_CONFIG_VOLUME="${DB_CONFIG_VOLUME:-}"     # vazio = detecção automática
LOG_FILE="${LOG_FILE:-${BACKUP_ROOT}/backup.log}"
LAST_RESULT_FILE="${LAST_RESULT_FILE:-${BACKUP_ROOT}/last_result.json}"

STAMP="$(date -u +%Y-%m-%d)"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DEST="${BACKUP_ROOT}/${STAMP}"
DUMP="${DEST}/database.dump"
DBCONF="${DEST}/db-config.tar.gz"
STORMAN="${DEST}/storage.manifest"

mkdir -p "$DEST"
log() { printf '%s [backup] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG_FILE"; }

# Toda escrita intermediária acontece aqui e some ao final, inclusive se o
# script morrer no meio.
TMPDIR_RUN="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR_RUN"; }
trap cleanup EXIT

# Estado por artefato — vira manifesto e last_result.
DB_STATUS="pending"; DBCONF_STATUS="pending"; STORAGE_STATUS="pending"
EXTERNAL="absent";   DEGRADED=0
DUMP_SHA=""; DUMP_SIZE=0; TABLE_COUNT=0
DBCONF_SHA=""; DBCONF_SIZE=0; DBCONF_HAS_KEY="false"
STOR_OBJECTS=0; STOR_BYTES=0; STOR_SHA=""

degrade() { DEGRADED=1; log "DEGRADADO: $1"; }

write_result() {
  # $1=status $2=mensagem. Sem segredos.
  cat > "$LAST_RESULT_FILE" <<EOF
{
  "status": "$1",
  "message": "$2",
  "startedAt": "${STARTED_AT}",
  "finishedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "path": "${DEST}",
  "database": "${DB_STATUS}",
  "dbConfig": "${DBCONF_STATUS}",
  "storage": "${STORAGE_STATUS}",
  "external": "${EXTERNAL}"
}
EOF
}

on_error() {
  log "FALHA: $1"
  DB_STATUS="failed"
  write_result "failed" "$1"
  exit 1
}

log "iniciando backup de ${PGDATABASE}@${PGHOST}:${PGPORT} -> ${DEST}"

# ── 1. BANCO ─────────────────────────────────────────────────────────────
# -Fc (custom): comprimido, restaurável seletivamente por pg_restore, e o
# único formato cujo índice pode ser validado sem restaurar de fato.
if ! pg_dump --format=custom --compress=9 --no-owner --no-privileges \
      --file="$DUMP" 2>>"$LOG_FILE"; then
  on_error "pg_dump retornou erro"
fi

[ -f "$DUMP" ] || on_error "dump não foi criado"

DUMP_SIZE=$(wc -c < "$DUMP")
[ "$DUMP_SIZE" -ge "$MIN_DUMP_BYTES" ] || on_error "dump suspeito de truncado (${DUMP_SIZE} bytes < ${MIN_DUMP_BYTES})"

# Prova de legibilidade: se o arquivo estiver corrompido, isto falha aqui e
# não daqui a três semanas, no dia do desastre.
TABLE_COUNT=$(pg_restore --list "$DUMP" 2>/dev/null | grep -c 'TABLE DATA' || true)
[ "$TABLE_COUNT" -gt 0 ] || on_error "pg_restore --list não encontrou TABLE DATA — dump ilegível"

DUMP_SHA=$(sha256sum "$DUMP" | awk '{print $1}')
DB_STATUS="ok"
log "banco OK: ${DUMP_SIZE} bytes, ${TABLE_COUNT} tabelas com dados, sha256=${DUMP_SHA:0:16}..."

# ── 2. db-config (pgsodium root key + configuração do Postgres) ──────────
# Lemos o volume pelo mountpoint em vez de subir um container só para ler
# um diretório: menos peça móvel, e o backup não passa a depender de uma
# imagem auxiliar. Exige leitura de /var/lib/docker (root).
capture_db_config() {
  command -v docker >/dev/null 2>&1 || { DBCONF_STATUS="skipped:no-docker"; degrade "docker indisponível — db-config não capturado"; return; }

  local vol="$DB_CONFIG_VOLUME"
  if [ -z "$vol" ]; then
    vol=$(docker volume ls --quiet 2>/dev/null | grep -E '(^|_)db-config$' | head -1 || true)
  fi
  if [ -z "$vol" ]; then
    DBCONF_STATUS="absent:no-volume"; degrade "volume db-config não existe (stack nunca iniciado?)"; return
  fi

  local mp
  mp=$(docker volume inspect -f '{{ .Mountpoint }}' "$vol" 2>/dev/null || true)
  if [ -z "$mp" ] || [ ! -d "$mp" ]; then
    DBCONF_STATUS="failed:no-mountpoint"; degrade "mountpoint de ${vol} inacessível"; return
  fi
  if [ ! -r "$mp" ]; then
    DBCONF_STATUS="failed:permission"; degrade "sem permissão de leitura em ${mp} (executar como root)"; return
  fi

  # tar determinístico: ordem estável e sem metadado volátil, para que dois
  # backups de um conteúdo idêntico produzam o mesmo sha256.
  if ! tar --sort=name --owner=0 --group=0 --numeric-owner \
           --mtime='UTC 2020-01-01' -czf "$DBCONF" -C "$mp" . 2>>"$LOG_FILE"; then
    DBCONF_STATUS="failed:tar"; degrade "tar de db-config falhou"; return
  fi

  # A razão de ser deste artefato. Se a chave não estiver aqui, dizemos —
  # em vez de deixar um .tar.gz vazio dando aparência de proteção.
  if tar -tzf "$DBCONF" 2>/dev/null | grep -qiE 'pgsodium.*\.key|\.key$'; then
    DBCONF_HAS_KEY="true"
  else
    DBCONF_HAS_KEY="false"
    degrade "db-config capturado, mas SEM chave pgsodium (normal antes do 1º boot)"
  fi

  DBCONF_SIZE=$(wc -c < "$DBCONF")
  DBCONF_SHA=$(sha256sum "$DBCONF" | awk '{print $1}')
  DBCONF_STATUS="ok"
  log "db-config OK: volume=${vol} ${DBCONF_SIZE} bytes pgsodiumKey=${DBCONF_HAS_KEY}"
}
capture_db_config

# ── 3. Storage (inventário local + sincronização incremental) ────────────
# Os objetos NÃO entram no diretório do backup: são grandes demais e já
# vivem em disco. O que produzimos aqui é um INVENTÁRIO verificável, e a
# cópia real vai por `rclone sync` incremental para o destino externo.
capture_storage() {
  if [ ! -d "$STORAGE_PATH" ]; then
    STORAGE_STATUS="absent:no-path"; degrade "${STORAGE_PATH} não existe (Storage ainda não provisionado)"; return
  fi

  # Listagem estável: caminho relativo + tamanho, ordenada.
  ( cd "$STORAGE_PATH" && find . -type f -printf '%P\t%s\n' 2>/dev/null | LC_ALL=C sort ) > "$STORMAN" || {
    STORAGE_STATUS="failed:inventory"; degrade "não foi possível inventariar o Storage"; return
  }
  STOR_OBJECTS=$(wc -l < "$STORMAN")
  STOR_BYTES=$(awk -F'\t' '{s+=$2} END {print s+0}' "$STORMAN")
  STOR_SHA=$(sha256sum "$STORMAN" | awk '{print $1}')
  log "storage inventariado: ${STOR_OBJECTS} objetos, ${STOR_BYTES} bytes"

  if [ -z "${RCLONE_REMOTE:-}" ]; then
    STORAGE_STATUS="local-only"; degrade "Storage SEM cópia externa (RCLONE_REMOTE não configurado)"; return
  fi
  if ! command -v rclone >/dev/null 2>&1; then
    STORAGE_STATUS="failed:no-rclone"; degrade "rclone ausente — Storage não replicado"; return
  fi
  # sync incremental: só o delta sobe. Destino separado dos dumps.
  if rclone sync "$STORAGE_PATH" "${RCLONE_REMOTE}/storage" >>"$LOG_FILE" 2>&1; then
    STORAGE_STATUS="ok"
    log "storage replicado -> ${RCLONE_REMOTE}/storage"
  else
    STORAGE_STATUS="failed:sync"; degrade "rclone sync do Storage falhou"
  fi
}
capture_storage

# ── 4. Manifesto + checksums ─────────────────────────────────────────────
# Amarra os artefatos: detecta corrupção, truncamento, artefato faltando e
# mistura de versões (dump de uma data com db-config de outra). Sem segredos.
GIT_COMMIT=$(git -C /opt/paraguai rev-parse HEAD 2>/dev/null || echo "unknown")
cat > "${DEST}/manifest.json" <<EOF
{
  "schemaVersion": 1,
  "backupType": "supabase-selfhosted",
  "startedAt": "${STARTED_AT}",
  "finishedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$(hostname)",
  "gitCommit": "${GIT_COMMIT}",
  "database": {
    "status": "${DB_STATUS}",
    "name": "${PGDATABASE}",
    "host": "${PGHOST}",
    "file": "database.dump",
    "format": "custom",
    "sizeBytes": ${DUMP_SIZE},
    "sha256": "${DUMP_SHA}",
    "tableDataEntries": ${TABLE_COUNT},
    "pgDumpVersion": "$(pg_dump --version | head -1)"
  },
  "dbConfig": {
    "status": "${DBCONF_STATUS}",
    "file": "db-config.tar.gz",
    "sizeBytes": ${DBCONF_SIZE},
    "sha256": "${DBCONF_SHA}",
    "pgsodiumKeyPresent": ${DBCONF_HAS_KEY}
  },
  "storage": {
    "status": "${STORAGE_STATUS}",
    "file": "storage.manifest",
    "path": "${STORAGE_PATH}",
    "objects": ${STOR_OBJECTS},
    "totalBytes": ${STOR_BYTES},
    "sha256": "${STOR_SHA}"
  }
}
EOF

( cd "$DEST" && sha256sum $(ls database.dump db-config.tar.gz storage.manifest manifest.json 2>/dev/null) > SHA256SUMS )
# Compatibilidade com o formato anterior (consumido por ferramentas e docs).
printf '%s  database.dump\n' "$DUMP_SHA" > "${DEST}/sha256.txt"

# ── 5. Cópia externa dos artefatos pequenos ──────────────────────────────
# Backup que só existe no mesmo VPS não sobrevive à perda do VPS. Quando
# RCLONE_REMOTE está definido, replica; quando não está, é registrado como
# AUSENTE — nunca silenciosamente tratado como sucesso.
if [ -n "${RCLONE_REMOTE:-}" ]; then
  if command -v rclone >/dev/null 2>&1 && rclone copy "$DEST" "${RCLONE_REMOTE}/${STAMP}" >>"$LOG_FILE" 2>&1; then
    log "cópia externa OK -> ${RCLONE_REMOTE}/${STAMP}"
    EXTERNAL="ok"
  else
    log "AVISO: cópia externa FALHOU (backup local permanece válido)"
    EXTERNAL="failed"; DEGRADED=1
  fi
else
  log "AVISO: RCLONE_REMOTE não configurado — SEM cópia externa"
  EXTERNAL="absent"; DEGRADED=1
fi

# ── 6. Retenção ──────────────────────────────────────────────────────────
# Só remove depois de o backup novo estar validado. Nunca deixa o diretório
# sem nenhum backup.
mapfile -t DIRS < <(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r)
if [ "${#DIRS[@]}" -gt "$RETENTION_COUNT" ]; then
  for old in "${DIRS[@]:$RETENTION_COUNT}"; do
    log "retenção: removendo ${old}"
    rm -rf "${BACKUP_ROOT:?}/${old}"
  done
fi

if [ "$DEGRADED" -eq 0 ]; then
  write_result "ok" "database+dbConfig+storage external=${EXTERNAL}"
  log "concluído: OK"
else
  write_result "degraded" "database=${DB_STATUS} dbConfig=${DBCONF_STATUS} storage=${STORAGE_STATUS} external=${EXTERNAL}"
  log "concluído: DEGRADADO — o banco está salvo, mas há lacunas (ver healthcheck)"
fi
