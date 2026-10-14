#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# ParaguAI — disparador self-hosted dos crons do frontend (Mission 05.18)
#
# Substitui, SEM duplicar, o que hoje é feito por vercel.json (3 rotas diárias) e
# por .github/workflows/high-frequency-crons.yml (4 rotas */5 e */15). As rotas do
# app são Route Handlers comuns autenticados por segredo compartilhado
# (lib/cron-auth.ts, requireCronSecret, timing-safe, fail-closed): nenhum
# acoplamento ao runtime de cron da Vercel — ver docs/engineering/CRON_INFRASTRUCTURE.md.
#
# Uso (systemd): ExecStart=/opt/paraguai-app/infra/selfhosted/app/cron/run-crons.sh due
#   due  → executa somente os endpoints cuja cadência venceu NESTE minuto
#   all  → executa todos (uso manual/diagnóstico)
#
# Segurança: o segredo vem de /etc/paraguai/app.env (root:root 0600), nunca de
# argumento ou de variável de ambiente do unit. O container já está em loopback;
# o Caddy do cutover é que publica o hostname.
# ─────────────────────────────────────────────────────────────────────────────
set -eu
ENV_FILE=/etc/paraguai/app.env
BASE=${CRON_BASE:-http://127.0.0.1:3100}
MODE=${1:-due}

[ -r "$ENV_FILE" ] || { echo "ERRO: $ENV_FILE ilegível" >&2; exit 1; }
[ "$(id -u)" = "0" ] || { echo "ERRO: rode como root (o env é 0600)" >&2; exit 1; }

# CRON_SECRET pode não existir ainda (Mission 05.17: não criado). Sem ele, as
# rotas respondem 401 — falham fechadas, exatamente o comportamento desejado.
SECRET=$(grep -oP '^CRON_SECRET=\K.*' "$ENV_FILE" 2>/dev/null || true)
[ -n "${SECRET:-}" ] || { echo "AVISO: CRON_SECRET ausente em $ENV_FILE — as rotas responderão 401" >&2; exit 0; }

MIN=$(date -u +%M); HOUR=$(date -u +%H)

# ── cadência: melhor esforço, idempotente por desenho (connectors/sync roda só
# conectores DUE; exchange/refresh grava nova linha por execução) ─────────────
call() { # nome, path
  url="$BASE$2"
  code=$(curl -sS -o /tmp/cron-out -w '%{http_code}' --max-time 60 -H "Authorization: Bearer $SECRET" "$url" || echo 000)
  printf '%s %-46s http=%s\n' "$(date -u +%FT%TZ)" "$1" "$code"
  [ "$code" = "200" ] || logger -t paraguai-cron "FALHA $1 http=$code url=$url"
}

if [ "$MODE" = "all" ]; then
  call exchange-refresh  /api/cron/exchange/refresh
  call market-pulse      /api/cron/realtime-commerce/market-pulse
  call buyer-alerts      /api/cron/realtime-commerce/buyer-alerts
  call merge-suggestions /api/cron/canonical-catalog/merge-suggestions
  call connectors-sync   /api/cron/connectors/sync
  call snapshot          /api/cron/marketplace-operations/snapshot
  call outbox            /api/cron/canonical-catalog/outbox-maintenance
  exit 0
fi

# */5 → câmbio (o mais sensível a frescor)
case "$MIN" in 0|5|10|15|20|25|30|35|40|45|50|55) call exchange-refresh /api/cron/exchange/refresh ;; esac
# */15 → tempo real + merge de sugestões + sync de conectores DUE
case "$MIN" in 0|15|30|45)
  call market-pulse      /api/cron/realtime-commerce/market-pulse
  call buyer-alerts      /api/cron/realtime-commerce/buyer-alerts
  call merge-suggestions /api/cron/canonical-catalog/merge-suggestions
  call connectors-sync   /api/cron/connectors/sync
  ;;
esac
# diários (UTC), horários escolhidos para não coincidir com o backup (03:31) nem com o healthcheck (de hora em hora)
[ "$MIN" = "0" ] && [ "$HOUR" = "03" ] && call outbox /api/cron/canonical-catalog/outbox-maintenance
[ "$MIN" = "0" ] && [ "$HOUR" = "07" ] && call snapshot /api/cron/marketplace-operations/snapshot
exit 0
