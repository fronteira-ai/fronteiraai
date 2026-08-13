#!/usr/bin/env bash
# ParaguAI — backup do PostgreSQL self-hosted (Sprint 16).
#
# Roda a cada 3 dias via systemd timer (ver backup.timer). NÃO toca no
# Supabase Cloud: opera exclusivamente contra o Postgres self-hosted cujo
# host é passado por variável de ambiente.
#
# Produz, por execução:
#   /backups/paraguai/<YYYY-MM-DD>/database.dump   (pg_dump -Fc, comprimido)
#   /backups/paraguai/<YYYY-MM-DD>/metadata.json
#   /backups/paraguai/<YYYY-MM-DD>/sha256.txt
#
# Um backup só é considerado bem-sucedido depois de:
#   1. pg_dump terminar com exit 0;
#   2. o arquivo existir e ter tamanho > MIN_DUMP_BYTES;
#   3. `pg_restore --list` conseguir ler o índice do arquivo (prova de que
#      o dump não está truncado/corrompido — um arquivo existente NÃO é
#      um backup);
#   4. o sha256 ser gravado.
# Qualquer falha sai com código != 0, deixa a marca de falha em
# LAST_RESULT_FILE e não remove backup antigo nenhum.
set -euo pipefail

: "${PGHOST:?PGHOST obrigatório}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER obrigatório}"
: "${PGDATABASE:=postgres}"
: "${PGPASSWORD:?PGPASSWORD obrigatório (nunca versionado — ver .env.example)}"

BACKUP_ROOT="${BACKUP_ROOT:-/backups/paraguai}"
RETENTION_COUNT="${RETENTION_COUNT:-10}"     # ~30 dias com cadência de 3 dias
MIN_DUMP_BYTES="${MIN_DUMP_BYTES:-10240}"
LOG_FILE="${LOG_FILE:-${BACKUP_ROOT}/backup.log}"
LAST_RESULT_FILE="${LAST_RESULT_FILE:-${BACKUP_ROOT}/last_result.json}"

STAMP="$(date -u +%Y-%m-%d)"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DEST="${BACKUP_ROOT}/${STAMP}"
DUMP="${DEST}/database.dump"

mkdir -p "$DEST"
log() { printf '%s [backup] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG_FILE"; }

write_result() {
  # $1=status $2=mensagem
  cat > "$LAST_RESULT_FILE" <<EOF
{
  "status": "$1",
  "message": "$2",
  "startedAt": "${STARTED_AT}",
  "finishedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "path": "${DEST}"
}
EOF
}

on_error() {
  log "FALHA: $1"
  write_result "failed" "$1"
  exit 1
}

log "iniciando backup de ${PGDATABASE}@${PGHOST}:${PGPORT} -> ${DEST}"

# -Fc (custom): comprimido, restaurável seletivamente por pg_restore, e o
# único formato cujo índice pode ser validado sem restaurar de fato.
if ! pg_dump --format=custom --compress=9 --no-owner --no-privileges \
      --file="$DUMP" 2>>"$LOG_FILE"; then
  on_error "pg_dump retornou erro"
fi

[ -f "$DUMP" ] || on_error "dump não foi criado"

SIZE=$(wc -c < "$DUMP")
[ "$SIZE" -ge "$MIN_DUMP_BYTES" ] || on_error "dump suspeito de truncado (${SIZE} bytes < ${MIN_DUMP_BYTES})"

# Prova de legibilidade: se o arquivo estiver corrompido, isto falha aqui e
# não daqui a três semanas, no dia do desastre.
TABLE_COUNT=$(pg_restore --list "$DUMP" 2>/dev/null | grep -c 'TABLE DATA' || true)
[ "$TABLE_COUNT" -gt 0 ] || on_error "pg_restore --list não encontrou TABLE DATA — dump ilegível"

SHA=$(sha256sum "$DUMP" | awk '{print $1}')
printf '%s  database.dump\n' "$SHA" > "${DEST}/sha256.txt"

cat > "${DEST}/metadata.json" <<EOF
{
  "database": "${PGDATABASE}",
  "host": "${PGHOST}",
  "startedAt": "${STARTED_AT}",
  "finishedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "sizeBytes": ${SIZE},
  "sha256": "${SHA}",
  "tableDataEntries": ${TABLE_COUNT},
  "pgDumpVersion": "$(pg_dump --version | head -1)",
  "format": "custom"
}
EOF

log "OK: ${SIZE} bytes, ${TABLE_COUNT} tabelas com dados, sha256=${SHA:0:16}..."

# ── Cópia externa ────────────────────────────────────────────────────────
# Backup que só existe no mesmo VPS não sobrevive à perda do VPS. Quando
# RCLONE_REMOTE está definido, replica; quando não está, é registrado como
# AUSENTE — nunca silenciosamente tratado como sucesso.
if [ -n "${RCLONE_REMOTE:-}" ]; then
  if rclone copy "$DEST" "${RCLONE_REMOTE}/${STAMP}" >>"$LOG_FILE" 2>&1; then
    log "cópia externa OK -> ${RCLONE_REMOTE}/${STAMP}"
    EXTERNAL="ok"
  else
    log "AVISO: cópia externa FALHOU (backup local permanece válido)"
    EXTERNAL="failed"
  fi
else
  log "AVISO: RCLONE_REMOTE não configurado — SEM cópia externa"
  EXTERNAL="absent"
fi

# ── Retenção ─────────────────────────────────────────────────────────────
# Só remove depois de o backup novo estar validado. Nunca deixa o diretório
# sem nenhum backup.
mapfile -t DIRS < <(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r)
if [ "${#DIRS[@]}" -gt "$RETENTION_COUNT" ]; then
  for old in "${DIRS[@]:$RETENTION_COUNT}"; do
    log "retenção: removendo ${old}"
    rm -rf "${BACKUP_ROOT:?}/${old}"
  done
fi

write_result "ok" "external=${EXTERNAL} size=${SIZE} sha256=${SHA}"
log "concluído"
