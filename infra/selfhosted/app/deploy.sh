#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# ParaguAI — deploy reproduzível do frontend no VPS Fluence (Mission 05.18)
#
# Uso:
#   sudo ./deploy.sh                  # constrói e publica o commit atual do checkout
#   sudo ./deploy.sh --rollback       # volta para a imagem IMEDIATAMENTE anterior
#   sudo ./deploy.sh --status         # mostra o que está no ar (sem alterar nada)
#
# Garantias:
#   • Toca SOMENTE o container `paraguai-web` (projeto/compose próprios). O stack
#     Supabase (supabase-db/rest/kong/auth/storage/imgproxy/meta/studio) tem
#     projeto e rede independentes e NÃO é referenciado por este script.
#   • Versão identificável: tag de imagem = paraguai-web:<sha-curto> + o sha
#     gravado em .deployed-commit; a tag :previous guarda o que estava no ar.
#   • Rollback = retag + `up -d`, sem rebuild.
#   • Não expõe porta (o compose publica apenas em 127.0.0.1:3100).
#   • Não cria nem lê credenciais: elas vivem em /etc/paraguai/app.env (0600),
#     consumidas pelo `env_file` do compose e pelo build secret.
# ─────────────────────────────────────────────────────────────────────────────
set -eu

APP_DIR=/opt/paraguai-app
COMPOSE_FILE="$APP_DIR/infra/selfhosted/app/docker-compose.app.yml"
ENV_FILE=/etc/paraguai/app.env
IMAGE=paraguai-web
STAMP="$APP_DIR/.deployed-commit"
BASE=http://127.0.0.1:3100

log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || die "rode com sudo"
[ -r "$ENV_FILE" ] || die "$ENV_FILE ausente ou ilegível"
[ -f "$COMPOSE_FILE" ] || die "$COMPOSE_FILE ausente"

compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }
running_image() { docker inspect paraguai-web --format '{{.Config.Image}}' 2>/dev/null || echo ""; }

# ── rotas que a primeira visita do usuário bate (warm-up pós-deploy) ─────────
warm_up() {
  for p in / /products /lojas "/search?q=perfume"; do
    printf '  warm %-22s %s\n' "$p" "$(curl -sS -o /dev/null -w '%{http_code} %{time_total}s' --max-time 90 "$BASE$p" || echo FALHA)"
  done
}

health_gate() {
  i=0
  while [ $i -lt 40 ]; do
    st=$(docker inspect paraguai-web --format '{{.State.Health.Status}}' 2>/dev/null || echo none)
    [ "$st" = "healthy" ] && { log "health=healthy"; return 0; }
    i=$((i+1)); sleep 3
  done
  die "healthcheck não ficou healthy em 120s — use --rollback"
}

smoke_gate() {
  fail=0
  for p in / /products /lojas /robots.txt /api/exchange/health; do
    code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 90 "$BASE$p" || echo 000)
    printf '  %-22s %s\n' "$p" "$code"
    [ "$code" = "200" ] || fail=1
  done
  [ "$fail" = "0" ] || die "smoke falhou — use --rollback"
}

case "${1:-}" in
  --status)
    log "imagem no ar: $(running_image)"
    log "commit registrado: $(cat "$STAMP" 2>/dev/null || echo '(sem registro)')"
    docker images "$IMAGE" --format '  {{.Repository}}:{{.Tag}}  {{.CreatedSince}}  {{.Size}}'
    docker inspect paraguai-web --format '  health={{.State.Health.Status}} restarts={{.RestartCount}}' 2>/dev/null || true
    exit 0
    ;;
  --rollback)
    prev=$(docker image inspect "$IMAGE:previous" --format '{{.Id}}' 2>/dev/null) || die "não há $IMAGE:previous — rollback indisponível"
    log "rollback para $IMAGE:previous ($(docker image inspect "$IMAGE:previous" --format '{{index .Config.Labels "commit"}}' 2>/dev/null || echo '?'))"
    docker tag "$IMAGE:previous" "$IMAGE:latest"
    docker compose -f "$COMPOSE_FILE" up -d
    health_gate; smoke_gate
    log "rollback concluído"
    exit 0
    ;;
  "" ) ;;
  *) die "argumento não reconhecido: $1" ;;
esac

cd "$APP_DIR"
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "nogit-$(date -u +%Y%m%d%H%M)")
DIRTY=$(git status --porcelain 2>/dev/null | wc -l)
log "deploy do commit $SHA (arquivos não commitados: $DIRTY)"
[ "$DIRTY" = "0" ] || log "AVISO: checkout sujo — o deploy NÃO reflete mudanças não commitadas"

# 1) preservar a imagem que está no ar como :previous (rollback instantâneo)
cur=$(running_image)
if [ -n "$cur" ]; then
  docker tag "$cur" "$IMAGE:previous" && log "imagem atual preservada como $IMAGE:previous ($cur)"
fi

# 2) construir a imagem versionada (o build secret fornece o ambiente completo)
log "build $IMAGE:$SHA (npm ci + next build; ~4-6 min nesta máquina)"
APP_IMAGE="$IMAGE:$SHA" compose build
docker tag "$IMAGE:$SHA" "$IMAGE:latest"
printf '%s\n' "$SHA" > "$STAMP"

# 3) subir e validar
APP_IMAGE="$IMAGE:$SHA" compose up -d
health_gate
smoke_gate
log "warm-up (evita a 1ª visita lenta pós-restart)"
warm_up
log "OK — $IMAGE:$SHA no ar em 127.0.0.1:3100"
log "rollback disponível: sudo $0 --rollback"
