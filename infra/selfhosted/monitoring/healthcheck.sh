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
# A lista de containers críticos NÃO é mais configurável aqui: ela vive
# fixa dentro do wrapper privilegiado (Sprint 27). Aceitar o conjunto por
# variável de ambiente significaria empurrar um valor externo — vindo de um
# EnvironmentFile — para dentro de um contexto root.

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
# Este script roda como `paraguai`, que NÃO tem acesso ao Docker (fora do
# grupo `docker`, sem leitura do socket) — e isso é decisão de arquitetura,
# não limitação. O estado vem de um wrapper privilegiado sem argumentos, que
# devolve apenas `<nome> <status> <health>` para uma lista FIXA de
# containers. Ver infra/selfhosted/privilege/.
CONTAINER_STATUS_WRAPPER=/usr/local/sbin/paraguai-container-status
STATUS_OUT=""
if [ ! -x "$CONTAINER_STATUS_WRAPPER" ]; then
  alert "wrapper de status ausente — rode provision/install-healthcheck-privilege.sh"
elif ! STATUS_OUT=$(sudo -n "$CONTAINER_STATUS_WRAPPER" 2>/dev/null); then
  alert "não foi possível consultar o estado dos containers (sudo/wrapper falhou)"
  STATUS_OUT=""
fi

DB_STATE=""; DB_HEALTH=""
if [ -n "$STATUS_OUT" ]; then
  # Contador local: o veredito desta seção não pode depender de alertas de
  # disco ou memória emitidos antes dela.
  CONTAINER_ALERTS=0
  while read -r NAME STATE HEALTH; do
    [ -n "${NAME:-}" ] || continue
    if [ "$NAME" = "supabase-db" ]; then DB_STATE="$STATE"; DB_HEALTH="$HEALTH"; fi
    if [ "$STATE" != "running" ]; then
      alert "container ${NAME} não está rodando (estado: ${STATE})"
      CONTAINER_ALERTS=$((CONTAINER_ALERTS + 1))
    fi
  done <<< "$STATUS_OUT"
  [ "$CONTAINER_ALERTS" -eq 0 ] && ok "containers críticos rodando"
fi

# ── 4. PostgreSQL responde ───────────────────────────────────────────────
# Sem `docker exec`: o compose oficial já define um healthcheck no serviço
# `db` (pg_isready a cada 5s), então o próprio Docker mantém esse estado.
# Lê-lo é a mesma informação sem expor execução dentro do container.
#
# Os casos são separados porque significam coisas diferentes para quem está
# de plantão: container fora do ar, container no ar sem healthcheck, e
# container no ar reprovando o healthcheck exigem respostas distintas.
if [ -z "$STATUS_OUT" ]; then
  alert "PostgreSQL: estado indisponível (não foi possível consultar os containers)"
elif [ "$DB_STATE" != "running" ]; then
  alert "PostgreSQL: não verificável — container supabase-db está '${DB_STATE}'"
else
  case "$DB_HEALTH" in
    healthy) ok "PostgreSQL aceitando conexão" ;;
    none)    alert "PostgreSQL: container sem healthcheck definido — prontidão não verificável" ;;
    *)       alert "PostgreSQL NÃO está saudável (health=${DB_HEALTH})" ;;
  esac
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

  # ── 5b. Cobertura por artefato (Sprint 21) ─────────────────────────────
  # O dump do banco não recupera o ambiente sozinho. Estes dois artefatos
  # são checados SEPARADAMENTE porque falham por motivos diferentes e têm
  # consequências diferentes — e porque uma lacuna aqui é invisível: o
  # backup do banco continua verde enquanto o sistema fica irrecuperável.
  field() { grep -o "\"$1\"[^,}]*" "$LAST_RESULT" | head -1 | cut -d'"' -f4; }

  DBCONF_ST=$(field dbConfig)
  case "${DBCONF_ST:-}" in
    ok)          ok "db-config (root key do pgsodium) incluído no backup" ;;
    ""|absent:*) alert "db-config NÃO está no backup (${DBCONF_ST:-ausente}) — a root key do pgsodium não tem cópia" ;;
    *)           alert "db-config com problema: ${DBCONF_ST}" ;;
  esac

  STOR_ST=$(field storage)
  case "${STOR_ST:-}" in
    ok)          ok "Storage replicado para o destino externo" ;;
    local-only)  alert "Storage SEM cópia externa — os objetos não sobrevivem à perda do VPS" ;;
    ""|absent:*) alert "Storage não coberto pelo backup (${STOR_ST:-ausente})" ;;
    *)           alert "Storage com problema: ${STOR_ST}" ;;
  esac
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
