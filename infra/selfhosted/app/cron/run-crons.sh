#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# ParaguAI — disparador self-hosted dos crons do frontend
# Mission 05.18 (criação) · Mission 05.19 (correção do plano de agendamento)
#
# Uso:  run-crons.sh due        # só o que venceu neste minuto (systemd timer)
#       run-crons.sh all        # todos, para diagnóstico
#       run-crons.sh dry-run    # imprime o que faria, SEM chamar nada
#
# ── BUG CORRIGIDO NA 05.19 ───────────────────────────────────────────────────
# A versão anterior comparava `date -u +%M` com padrões sem zero à esquerda
# (`case "$MIN" in 0|5|10|...)`). `%M` devolve DOIS dígitos ("00", "05"), então
# os minutos 00 e 05 — justamente os de câmbio */5 — nunca casavam e o refresh
# de câmbio era silenciosamente pulado 2×/hora. Agora a comparação é numérica
# (`10#`) com aritmética modular, que é imune a zero à esquerda.
#
# ── CADÊNCIA PRESERVADA (mesma dos agendadores antigos) ───────────────────────
#   exchange/refresh                        */5     (GHA high-frequency-crons)
#   realtime-commerce/market-pulse          */15    (GHA)
#   realtime-commerce/buyer-alerts          */15    (GHA)
#   canonical-catalog/merge-suggestions     */15    (GHA)
#   connectors/sync                         */15    (GHA; vercel.json tinha 06:00 —
#                                                    mantida a frequência MAIOR: a
#                                                    rota só roda conectores DUE,
#                                                    idempotente, então */15 preserva
#                                                    o efeito sem duplicar trabalho)
#   canonical-catalog/outbox-maintenance    03:00   (vercel.json)
#   marketplace-operations/snapshot         07:00   (vercel.json)
#
# ── SEM EXECUÇÃO SIMULTÂNEA ──────────────────────────────────────────────────
# Duas barreiras independentes: (1) o unit é `Type=oneshot` SEM `RemainAfterExit`,
# e o systemd SE RECUSA a iniciar uma unit que já está ativa — se uma execução
# demorar mais que os 5 min do timer, o disparo seguinte é descartado, nunca
# sobreposto; (2) `flock` neste script, que também protege execuções manuais
# concorrentes. As chamadas HTTP são SEQUENCIAIS (`call` aguarda cada resposta).
# ─────────────────────────────────────────────────────────────────────────────
set -eu
ENV_FILE=/etc/paraguai/app.env
BASE=${CRON_BASE:-http://127.0.0.1:3100}
MODE=${1:-due}
LOCK=/var/lock/paraguai-crons.lock

[ "$MODE" = "dry-run" ] || [ "$(id -u)" = "0" ] || { echo "ERRO: rode como root (o env é 0600)" >&2; exit 1; }

# trava de concorrência (não bloqueia: se já há execução, sai em silêncio)
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK" || true
  flock -n 9 2>/dev/null || { echo "$(date -u +%FT%TZ) já em execução — disparo ignorado"; exit 0; }
fi

if [ "$MODE" != "dry-run" ]; then
  [ -r "$ENV_FILE" ] || { echo "ERRO: $ENV_FILE ilegível" >&2; exit 1; }
  SECRET=$(grep -oP '^CRON_SECRET=\K.*' "$ENV_FILE" 2>/dev/null || true)
  # Fail-closed: sem segredo as rotas devolvem 401. Não inventamos segredo aqui.
  [ -n "${SECRET:-}" ] || { echo "AVISO: CRON_SECRET ausente em $ENV_FILE — as rotas responderão 401 (nada será executado)" >&2; exit 0; }
fi

call() { # nome, path
  if [ "$MODE" = "dry-run" ]; then printf '  DRY %-46s %s\n' "$1" "$2"; return 0; fi
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 60 -H "Authorization: Bearer $SECRET" "$BASE$2" || echo 000)
  printf '%s %-46s http=%s\n' "$(date -u +%FT%TZ)" "$1" "$code"
  [ "$code" = "200" ] || logger -t paraguai-cron "FALHA $1 http=$code url=$BASE$2"
  return 0
}

MIN=$((10#$(date -u +%M)))
HOUR=$((10#$(date -u +%H)))

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
