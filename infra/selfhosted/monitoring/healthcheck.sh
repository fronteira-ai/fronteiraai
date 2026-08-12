#!/usr/bin/env bash
# ParaguAI — monitoramento mínimo do VPS self-hosted (Sprint 16, Fase 8).
#
# Deliberadamente simples: sem Prometheus, sem Grafana, sem agente. Um
# script idempotente que roda de hora em hora, imprime um relatório legível
# e sai com código != 0 quando algo exige atenção humana — o suficiente
# para um alerta por e-mail/webhook sem instalar uma pilha de observabilidade
# que ninguém vai manter antes do primeiro lançamento.
#
# Exit codes: 0 = tudo ok | 1 = ALERTA (uma ou mais checagens falharam)
set -uo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/backups/paraguai}"
DISK_THRESHOLD="${DISK_THRESHOLD:-80}"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-84}"   # 3 dias + 12h de folga
CRITICAL_CONTAINERS="${CRITICAL_CONTAINERS:-supabase-db supabase-rest supabase-auth supabase-storage supabase-kong}"

ALERTS=0
alert() { echo "🔴 ALERTA: $*"; ALERTS=$((ALERTS + 1)); }
ok()    { echo "🟢 $*"; }
warn()  { echo "🟡 $*"; }

echo "=== ParaguAI healthcheck — $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

# ── 1. Disco ─────────────────────────────────────────────────────────────
USED=$(df --output=pcent / | tail -1 | tr -dc '0-9')
if [ "${USED:-100}" -ge "$DISK_THRESHOLD" ]; then
  alert "disco em ${USED}% (limite ${DISK_THRESHOLD}%)"
else
  ok "disco em ${USED}%"
fi

# ── 2. Memória e CPU ─────────────────────────────────────────────────────
MEM=$(free | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
[ "${MEM:-0}" -ge 90 ] && warn "memória em ${MEM}%" || ok "memória em ${MEM}%"
ok "load average:$(cut -d' ' -f1-3 /proc/loadavg | sed 's/^/ /')"

# ── 3. Containers críticos ───────────────────────────────────────────────
for c in $CRITICAL_CONTAINERS; do
  STATE=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo "ausente")
  if [ "$STATE" != "running" ]; then
    alert "container ${c} não está rodando (estado: ${STATE})"
  fi
done
[ "$ALERTS" -eq 0 ] && ok "containers críticos rodando"

# ── 4. PostgreSQL responde ───────────────────────────────────────────────
if docker exec supabase-db pg_isready -U postgres >/dev/null 2>&1; then
  ok "PostgreSQL aceitando conexão"
else
  alert "PostgreSQL NÃO responde a pg_isready"
fi

# ── 5. Último backup: existe, é recente e teve sucesso ───────────────────
# As três coisas são checadas separadamente de propósito: um backup antigo,
# um backup que falhou e um backup ausente são problemas diferentes.
LAST_RESULT="${BACKUP_ROOT}/last_result.json"
if [ ! -f "$LAST_RESULT" ]; then
  alert "nenhum registro de backup em ${LAST_RESULT} — backup nunca rodou?"
else
  STATUS=$(grep -o '"status"[^,]*' "$LAST_RESULT" | cut -d'"' -f4)
  [ "$STATUS" = "ok" ] || alert "último backup terminou com status='${STATUS}'"

  AGE_H=$(( ( $(date +%s) - $(stat -c %Y "$LAST_RESULT") ) / 3600 ))
  if [ "$AGE_H" -gt "$MAX_BACKUP_AGE_HOURS" ]; then
    alert "último backup tem ${AGE_H}h (máximo tolerado ${MAX_BACKUP_AGE_HOURS}h)"
  else
    ok "último backup há ${AGE_H}h, status=${STATUS}"
  fi
fi

# ── 6. Espaço ocupado pelos backups e nº de cópias retidas ───────────────
if [ -d "$BACKUP_ROOT" ]; then
  COUNT=$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d | wc -l)
  SIZE=$(du -sh "$BACKUP_ROOT" 2>/dev/null | cut -f1)
  [ "$COUNT" -lt 2 ] && warn "apenas ${COUNT} backup(s) retido(s)" || ok "${COUNT} backups retidos, ocupando ${SIZE}"
fi

# ── 7. Cópia externa ─────────────────────────────────────────────────────
# Um backup que só existe no VPS não sobrevive à perda do VPS. Ausência de
# cópia externa é ALERTA, nunca um detalhe.
if [ -z "${RCLONE_REMOTE:-}" ]; then
  alert "RCLONE_REMOTE não configurado — não há cópia externa dos backups"
elif ! rclone lsd "$RCLONE_REMOTE" >/dev/null 2>&1; then
  alert "destino externo ${RCLONE_REMOTE} inacessível"
else
  ok "destino externo acessível"
fi

echo "=== ${ALERTS} alerta(s) ==="
exit $([ "$ALERTS" -eq 0 ] && echo 0 || echo 1)
