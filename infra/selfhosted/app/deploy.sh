#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# ParaguAI — deploy reproduzível do frontend no VPS Fluence
# Mission 05.18 (criação) · Mission 05.19 (auditoria + correções)
#
# Uso:
#   sudo ./deploy.sh                 # publica o commit do checkout atual
#   sudo ./deploy.sh --force         # idem, aceitando checkout sujo (NÃO versionável)
#   sudo ./deploy.sh --rollback      # volta para a imagem anterior (sem rebuild)
#   sudo ./deploy.sh --status        # mostra o que está no ar (não altera nada)
#
# Correções da auditoria da 05.19:
#   • checkout sujo agora ABORTA (antes era só aviso): sem isso a tag do commit
#     mentiria — o binário no ar não corresponderia ao sha registrado.
#   • `compose config --quiet` antes do build: erro de sintaxe/variável no compose
#     para o deploy ANTES de gastar 4-6 min de build e um restart.
#   • `--rollback` usa o mesmo helper `compose()` (com `--env-file`) e reescreve o
#     sha registrado — antes o rollback deixava `.deployed-commit` mentindo.
#   • conclusão sempre anunciada explicitamente (o script anterior podia terminar
#     sem distinguir sucesso de interrupção).
#
# Garantias: toca SOMENTE o container `paraguai-web` (projeto/rede `app`); o stack
# Supabase tem projeto e rede independentes e nunca é referenciado aqui. Segredos
# vivem apenas em /etc/paraguai/app.env (root:root 0600), consumidos pelo
# `env_file` e pelo build secret — nunca ecoados por este script.
# ─────────────────────────────────────────────────────────────────────────────
set -eu

APP_DIR=/opt/paraguai-app
COMPOSE_FILE="$APP_DIR/infra/selfhosted/app/docker-compose.app.yml"
ENV_FILE=/etc/paraguai/app.env
IMAGE=paraguai-web
STAMP="$APP_DIR/.deployed-commit"
STAMP_PREV="$APP_DIR/.deployed-commit.previous"
BASE=http://127.0.0.1:3100
FORCE=0

log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }

compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }
running_image() { docker inspect paraguai-web --format '{{.Config.Image}}' 2>/dev/null || echo ""; }

health_gate() {
  i=0
  while [ "$i" -lt 40 ]; do
    st=$(docker inspect paraguai-web --format '{{.State.Health.Status}}' 2>/dev/null || echo none)
    [ "$st" = "healthy" ] && { log "health=healthy"; return 0; }
    i=$((i+1)); sleep 3
  done
  die "healthcheck não ficou healthy em 120s — rode --rollback"
}

smoke_gate() {
  fail=0
  for p in / /products /lojas /robots.txt /api/exchange/health; do
    code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 90 "$BASE$p" || echo 000)
    printf '  %-22s %s\n' "$p" "$code"
    [ "$code" = "200" ] || fail=1
  done
  [ "$fail" = "0" ] || die "smoke falhou — rode --rollback"
}

warm_up() {
  for p in / /products /lojas "/search?q=perfume"; do
    printf '  warm %-22s %s\n' "$p" "$(curl -sS -o /dev/null -w '%{http_code} %{time_total}s' --max-time 90 "$BASE$p" || echo FALHA)"
  done
}

case "${1:-}" in
  --status)
    log "imagem no ar : $(running_image)"
    log "commit       : $(cat "$STAMP" 2>/dev/null || echo '(sem registro)')"
    log "anterior     : $(cat "$STAMP_PREV" 2>/dev/null || echo '(sem registro)')"
    docker images "$IMAGE" --format '  {{.Repository}}:{{.Tag}}  {{.CreatedSince}}  {{.Size}}'
    docker inspect paraguai-web --format '  health={{.State.Health.Status}} restarts={{.RestartCount}}' 2>/dev/null || true
    exit 0 ;;
  --rollback)
    docker image inspect "$IMAGE:previous" >/dev/null 2>&1 || die "não há $IMAGE:previous — rollback indisponível"
    log "voltando para $IMAGE:previous"
    docker tag "$IMAGE:previous" "$IMAGE:latest"
    compose up -d
    [ -f "$STAMP_PREV" ] && cp -f "$STAMP_PREV" "$STAMP"
    health_gate; smoke_gate
    log "ROLLBACK CONCLUÍDO — commit registrado: $(cat "$STAMP" 2>/dev/null || echo '?')"
    exit 0 ;;
  --force) FORCE=1 ;;
  "" ) ;;
  *) die "argumento não reconhecido: $1 (use --status | --rollback | --force)" ;;
esac

[ "$(id -u)" = "0" ] || die "rode com sudo"
[ -r "$ENV_FILE" ] || die "$ENV_FILE ausente ou ilegível"
[ -f "$COMPOSE_FILE" ] || die "$COMPOSE_FILE ausente"
cd "$APP_DIR"

# 0) o compose precisa ser válido ANTES de gastar build + restart
compose config --quiet || die "compose inválido — corrija antes de tentar o deploy"

# 1) versão identificável
# /opt/paraguai-app é um CHECKOUT DE CONTEÚDO (extraído de `git archive`), não um
# repositório: **não existe .git lá**. Descoberto na Fase B — com o código anterior
# este script MORRERIA no VPS ("não foi possível determinar o commit"), e o deploy
# versionado nunca aconteceria. Fonte de verdade: `.source-commit`, gravado na
# transferência com o `git rev-parse` da máquina que publica. Quando existe .git
# (checkout de desenvolvedor), o git continua tendo precedência.
GIT_OK=0
if git rev-parse --short HEAD >/dev/null 2>&1; then
  GIT_OK=1
  SHA=$(git rev-parse --short HEAD)
else
  SHA=$(tr -d '[:space:]' < "$APP_DIR/.source-commit" 2>/dev/null || echo "")
fi
[ -n "$SHA" ] || die "sem .git e sem $APP_DIR/.source-commit — impossível versionar o deploy"
DIRTY=0
[ "$GIT_OK" = "1" ] && DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$DIRTY" != "0" ]; then
  [ "$FORCE" = "1" ] || die "checkout sujo ($DIRTY arquivo(s)) — a imagem não corresponderia ao commit $SHA. Use --force apenas em ensaio."
  log "AVISO: checkout sujo e --force informado: o binário NÃO corresponde a $SHA"
fi
log "deploy do commit $SHA"

# 2) preservar o que está no ar (rollback instantâneo)
cur=$(running_image)
if [ -n "$cur" ]; then
  docker tag "$cur" "$IMAGE:previous"
  [ -f "$STAMP" ] && cp -f "$STAMP" "$STAMP_PREV"
  log "preservado como $IMAGE:previous ($cur)"
fi

# 3) build versionado (build secret fornece o ambiente completo)
log "build $IMAGE:$SHA (npm ci + next build: 3-6 min nesta máquina)"
APP_IMAGE="$IMAGE:$SHA" compose build
docker tag "$IMAGE:$SHA" "$IMAGE:latest"
printf '%s\n' "$SHA" > "$STAMP"

# 4) subir e validar
APP_IMAGE="$IMAGE:$SHA" compose up -d
health_gate
smoke_gate
log "warm-up (evita a 1ª visita lenta pós-restart)"
warm_up
log "DEPLOY CONCLUÍDO — $IMAGE:$SHA em 127.0.0.1:3100"
log "rollback: sudo $0 --rollback"
