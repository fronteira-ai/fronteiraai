#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# ParaguAI — disparador self-hosted dos crons do frontend
# Mission 05.18 (criação) · 05.19 (plano) · 05.20 Fase C (isolamento por allowlist)
#
# Uso:  run-crons.sh due        # só o que venceu neste minuto (systemd timer)
#       run-crons.sh all        # todos os AUTORIZADOS, para diagnóstico
#       run-crons.sh dry-run    # imprime o que faria, SEM chamar nada
#
# ── ISOLAMENTO POR ALLOWLIST (Mission 05.20 Fase C) ──────────────────────────
# A Fase C autoriza apenas o cron de câmbio. Este script decide o que roda por
# horário, então ativar o timer sem barreira executaria também os seis outros.
# A barreira é um arquivo de autorização explícita, com UMA chave por linha:
#
#     /etc/paraguai/cron-allow.txt      (root:root 0644, fora do Git)
#
#   exchange-refresh | market-pulse | buyer-alerts | merge-suggestions
#   connectors-sync  | outbox       | snapshot
#
# **Falha fechada**: sem o arquivo (ou sem a chave), nada é executado — o script
# registra `SKIP` em vez de chamar o endpoint. Para ativar um cron novo, ele
# precisa ser escrito no arquivo deliberadamente. É isso que permite habilitar o
# timer em produção com o câmbio isolado, sem depender de disciplina do operador.
#
# ── BUG CORRIGIDO NA 05.19 / CORRIGIDO DE NOVO NA 05.20 ──────────────────────
# (a) A versão original comparava `date -u +%M` com padrões sem zero à esquerda
#     (`case "$MIN" in 0|5|10|...)`): os minutos 00 e 05 nunca casavam e o câmbio
#     era silenciosamente pulado 2×/hora.
# (b) A correção com `$((10#...))` era **bash-only**: o VPS roda dash em /bin/sh
#     e o script morria em runtime (`arithmetic expression: expecting EOF: "10#55"`).
#     `$((08))` também não serve: zero à esquerda é OCTAL em POSIX.
# Forma portável adotada: remover o zero textualmente (`${MIN#0}`) e comparar com
# aritmética modular sobre um valor já sem zero à esquerda.
#
# ── CADÊNCIA ────────────────────────────────────────────────────────────────
#   exchange/refresh                     */5
#   market-pulse · buyer-alerts          */15
#   merge-suggestions · connectors/sync  */15
#   outbox-maintenance                   03:00 UTC
#   marketplace-operations/snapshot      07:00 UTC
# ─────────────────────────────────────────────────────────────────────────────
set -eu
ENV_FILE=/etc/paraguai/app.env
ALLOW_FILE=${PARAGUAI_CRON_ALLOW:-/etc/paraguai/cron-allow.txt}
BASE=${CRON_BASE:-http://127.0.0.1:3100}
MODE=${1:-due}
LOCK=/var/lock/paraguai-crons.lock

[ "$MODE" = "dry-run" ] || [ "$(id -u)" = "0" ] || { echo "ERRO: rode como root (o env é 0600)" >&2; exit 1; }

# trava de concorrência (não bloqueia: se já há execução, sai em silêncio)
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK" || true
  flock -n 9 2>/dev/null || { echo "$(date -u +%FT%TZ) já em execução — disparo ignorado"; exit 0; }
fi

# autorização explícita por endpoint (ver cabeçalho). Falha fechada por desenho.
allowed() {
  [ -r "$ALLOW_FILE" ] || return 1
  grep -qx "$1" "$ALLOW_FILE"
}

if [ "$MODE" != "dry-run" ]; then
  [ -r "$ENV_FILE" ] || { echo "ERRO: $ENV_FILE ilegível" >&2; exit 1; }
  SECRET=$(grep -oP '^CRON_SECRET=\K.*' "$ENV_FILE" 2>/dev/null || true)
  [ -n "${SECRET:-}" ] || { echo "AVISO: CRON_SECRET ausente em $ENV_FILE — as rotas responderiam 401" >&2; exit 0; }
fi

call() { # chave, path
  if ! allowed "$1"; then
    printf '%s SKIP %-32s (não autorizado em %s)\n' "$(date -u +%FT%TZ)" "$1" "$ALLOW_FILE"
    return 0
  fi
  if [ "$MODE" = "dry-run" ]; then printf '  DRY %-32s %s\n' "$1" "$2"; return 0; fi
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 60 -H "Authorization: Bearer $SECRET" "$BASE$2" || echo 000)
  printf '%s %-32s http=%s\n' "$(date -u +%FT%TZ)" "$1" "$code"
  [ "$code" = "200" ] || logger -t paraguai-cron "FALHA $1 http=$code url=$BASE$2"
  return 0
}

MIN=$(date -u +%M); MIN=${MIN#0}
HOUR=$(date -u +%H); HOUR=${HOUR#0}

if [ "$MODE" = "all" ]; then
  call exchange-refresh  /api/cron/exchange/refresh
  call market-pulse      /api/cron/realtime-commerce/market-pulse
  call buyer-alerts      /api/cron/realtime-commerce/buyer-alerts
  call merge-suggestions /api/cron/canonical-catalog/merge-suggestions
  call connectors-sync   /api/cron/connectors/sync
  call outbox            /api/cron/canonical-catalog/outbox-maintenance
  call snapshot          /api/cron/marketplace-operations/snapshot
  exit 0
fi

[ $((MIN % 5)) -eq 0 ] && call exchange-refresh /api/cron/exchange/refresh
if [ $((MIN % 15)) -eq 0 ]; then
  call market-pulse      /api/cron/realtime-commerce/market-pulse
  call buyer-alerts      /api/cron/realtime-commerce/buyer-alerts
  call merge-suggestions /api/cron/canonical-catalog/merge-suggestions
  call connectors-sync   /api/cron/connectors/sync
fi
[ "$HOUR" -eq 3 ] && [ "$MIN" -eq 0 ] && call outbox   /api/cron/canonical-catalog/outbox-maintenance
[ "$HOUR" -eq 7 ] && [ "$MIN" -eq 0 ] && call snapshot /api/cron/marketplace-operations/snapshot
exit 0
