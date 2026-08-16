#!/usr/bin/env bash
# ParaguAI — instala a fronteira de privilégio do healthcheck (Sprint 27).
#
# Mesmo motivo do install-backup-privilege.sh: o Git não preserva dono nem
# modo. Sem este script, um `git clone` numa VM nova deixaria o wrapper como
# arquivo comum do usuário que clonou, e o healthcheck voltaria a alertar
# para sempre que os containers estão ausentes — inclusive com o stack
# saudável.
#
#     Git → install-healthcheck-privilege.sh → wrapper + sudoers → healthcheck.sh
#
# Idempotente. Não contém segredo algum — instala CAPACIDADE, nunca MATERIAL.
#
# Uso:  sudo infra/selfhosted/provision/install-healthcheck-privilege.sh [--check]
set -euo pipefail
umask 022

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../privilege" && pwd)"
SRC_WRAPPER="${SRC_DIR}/paraguai-container-status"

DST_WRAPPER=/usr/local/sbin/paraguai-container-status
OBSOLETE_SUDOERS=/etc/sudoers.d/paraguai-container-status
SERVICE_USER=paraguai

CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

ok()  { printf '  ✅ %s\n' "$1"; }
bad() { printf '  ❌ %s\n' "$1"; }
die() { printf 'ERRO: %s\n' "$1" >&2; exit "${2:-1}"; }

[ "$(id -u)" -eq 0 ] || die "execute como root (sudo)" 77
[ -f "$SRC_WRAPPER" ] || die "fonte ausente: $SRC_WRAPPER" 2
id "$SERVICE_USER" >/dev/null 2>&1 || die "usuário ${SERVICE_USER} não existe" 3
bash -n "$SRC_WRAPPER" || die "wrapper com erro de sintaxe — nada foi instalado" 4

if [ "$CHECK_ONLY" -eq 1 ]; then
  echo "== verificação (nenhuma alteração) =="
  RC=0
  [ -f "$DST_WRAPPER" ] && ok "wrapper instalado" || { bad "wrapper AUSENTE"; RC=1; }
  [ -f "$OBSOLETE_SUDOERS" ] && { bad "regra sudoers OBSOLETA ainda presente: ${OBSOLETE_SUDOERS}"; RC=1; } \
    || ok "regra sudoers obsoleta ausente (o wrapper roda por systemd, nao por sudo)"
  if [ -f "$DST_WRAPPER" ]; then
    [ "$(stat -c '%U:%G %a' "$DST_WRAPPER")" = "root:root 755" ] \
      && ok "wrapper root:root 0755" || { bad "wrapper com dono/modo errado"; RC=1; }
    cmp -s "$SRC_WRAPPER" "$DST_WRAPPER" \
      && ok "wrapper idêntico ao versionado" || { bad "wrapper DIVERGE do repositório"; RC=1; }
  fi
  exit "$RC"
fi

echo "== instalando a fronteira de privilégio do healthcheck =="

install -o root -g root -m 0755 "$SRC_WRAPPER" "$DST_WRAPPER"
ok "wrapper  -> ${DST_WRAPPER} ($(stat -c '%U:%G %a' "$DST_WRAPPER"))"

# Sprint 34D: a regra sudoers foi retirada. Desde a Sprint 34B o wrapper é
# executado por paraguai-container-status.service, como root, pelo systemd —
# o usuário `paraguai` nunca mais precisa escalar privilégio para ler o
# estado dos containers. Manter a regra seria conservar uma capacidade que
# ninguém exerce, e capacidade não exercida é superfície de ataque parada.
#
# A remoção é feita aqui (e não só no repositório) para que um host
# provisionado antes desta Sprint convirja ao estado correto.
if [ -f "$OBSOLETE_SUDOERS" ]; then
  rm -f "$OBSOLETE_SUDOERS"
  visudo -c >/dev/null || die "conjunto sudoers do host ficou inválido após a remoção" 6
  ok "regra sudoers obsoleta removida (${OBSOLETE_SUDOERS})"
else
  ok "nenhuma regra sudoers obsoleta a remover"
fi

# A fronteira só faz sentido se o usuário continuar fora do Docker.
if id -nG "$SERVICE_USER" | tr ' ' '\n' | grep -qx docker; then
  die "${SERVICE_USER} está no grupo docker — isso anula a fronteira de privilégio" 8
fi
ok "${SERVICE_USER} continua fora do grupo docker"

echo
echo "Instalado. O healthcheck passa a ler o estado dos containers sem que o"
echo "usuário de serviço tenha qualquer acesso ao Docker."
