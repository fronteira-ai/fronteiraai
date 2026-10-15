#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# ParaguAI — vigilância preventiva do Kong (Mission 05.30, item 4)
#
# PROBLEMA MEDIDO: o Kong cresce em memória ao longo do tempo — 233 MiB logo
# após a recriação (05.25) → 356 MiB (4 h) → 437 MiB (57%) → **447,5 MiB (58%)**
# em ~7 h. Não é cache de arquivo: o cgroup mostrava `anon` = 97% do consumo.
# O risco é OOM-kill do ponto único de entrada da API (`api.fronteiraai.com`).
#
# Este script NÃO reinicia nada (proibido). Ele só MEDE e ALERTA, para que o
# reinício (janela de ~5 s) aconteça por decisão humana, com antecedência.
#
# Uso: kgong-alert.sh            (silencioso quando saudável; texto quando alerta)
#      kgong-alert.sh --json     (para integrar em monitoramento)
#
# INSTALAÇÃO (NÃO executada na 05.30 — timers são proibidos nesta missão):
#   sudo install -m 0755 -o root -g root kgong-alert.sh /opt/paraguai-app/infra/selfhosted/app/
#   # e acrescentar ao timer de healthcheck existente, ex.:
#   #   ExecStartPre=/opt/paraguai-app/infra/selfhosted/app/kgong-alert.sh
# ─────────────────────────────────────────────────────────────────────────────
set -eu
WARN=${WARN_PCT:-70}
CRIT=${CRIT_PCT:-85}
KONG=${KONG_CONTAINER:-supabase-kong}

mem_raw=$(docker inspect -f '{{.HostConfig.Memory}}' "$KONG" 2>/dev/null || echo 0)
[ "$mem_raw" -gt 0 ] || { echo "ERRO: não foi possível ler o limite de memória de $KONG" >&2; exit 2; }

# uso do cgroup: mais fiel que `docker stats` (que soma cache de página)
KID=$(docker inspect -f '{{.Id}}' "$KONG")
CG=$(find /sys/fs/cgroup -maxdepth 3 -type d -name "*${KID}*" 2>/dev/null | head -1)
cur=$(cat "$CG/memory.current" 2>/dev/null || docker stats --no-stream --format '{{.MemUsage}}' "$KONG")

pct=$(( cur * 100 / mem_raw ))
anon=$(awk '/^anon /{print $2}' "$CG/memory.stat" 2>/dev/null || echo 0)

if [ "${1:-}" = "--json" ]; then
  printf '{"container":"%s","used_bytes":%s,"limit_bytes":%s,"pct":%s,"anon_bytes":%s,"warn_pct":%s,"crit_pct":%s}\n' \
    "$KONG" "$cur" "$mem_raw" "$pct" "$anon" "$WARN" "$CRIT"
  exit 0
fi

if [ "$pct" -ge "$CRIT" ]; then
  printf 'CRITICO: %s em %s%% do limite (%s de %s bytes). Risco de OOM-kill do ponto unico de entrada da API.\n' \
    "$KONG" "$pct" "$cur" "$mem_raw"
  printf 'Acao: agendar reinicio do Kong em janela de baixo trafego (~5 s):\n'
  printf '  sudo docker compose -f /opt/supabase-stack/docker/docker-compose.yml -f /opt/supabase-stack/docker/docker-compose.kong-stab.yml up -d --no-deps kong\n'
  exit 2
fi
if [ "$pct" -ge "$WARN" ]; then
  printf 'ATENCAO: %s em %s%% do limite (%s de %s bytes) — planejar janela de reinicio.\n' \
    "$KONG" "$pct" "$cur" "$mem_raw"
  exit 1
fi
exit 0
