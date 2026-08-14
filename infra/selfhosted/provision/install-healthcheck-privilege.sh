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
SRC_SUDOERS="${SRC_DIR}/paraguai-container-status.sudoers"

DST_WRAPPER=/usr/local/sbin/paraguai-container-status
DST_SUDOERS=/etc/sudoers.d/paraguai-container-status
SERVICE_USER=paraguai

CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

ok()  { printf '  ✅ %s\n' "$1"; }
bad() { printf '  ❌ %s\n' "$1"; }
die() { printf 'ERRO: %s\n' "$1" >&2; exit "${2:-1}"; }

[ "$(id -u)" -eq 0 ] || die "execute como root (sudo)" 77
[ -f "$SRC_WRAPPER" ] || die "fonte ausente: $SRC_WRAPPER" 2
[ -f "$SRC_SUDOERS" ] || die "fonte ausente: $SRC_SUDOERS" 2
id "$SERVICE_USER" >/dev/null 2>&1 || die "usuário ${SERVICE_USER} não existe" 3
bash -n "$SRC_WRAPPER" || die "wrapper com erro de sintaxe — nada foi instalado" 4

if [ "$CHECK_ONLY" -eq 1 ]; then
  echo "== verificação (nenhuma alteração) =="
  RC=0
  [ -f "$DST_WRAPPER" ] && ok "wrapper instalado" || { bad "wrapper AUSENTE"; RC=1; }
  [ -f "$DST_SUDOERS" ] && ok "sudoers instalado" || { bad "sudoers AUSENTE"; RC=1; }
  if [ -f "$DST_WRAPPER" ]; then
    [ "$(stat -c '%U:%G %a' "$DST_WRAPPER")" = "root:root 755" ] \
      && ok "wrapper root:root 0755" || { bad "wrapper com dono/modo errado"; RC=1; }
    cmp -s "$SRC_WRAPPER" "$DST_WRAPPER" \
      && ok "wrapper idêntico ao versionado" || { bad "wrapper DIVERGE do repositório"; RC=1; }
  fi
  if [ -f "$DST_SUDOERS" ]; then
    [ "$(stat -c '%U:%G %a' "$DST_SUDOERS")" = "root:root 440" ] \
      && ok "sudoers root:root 0440" || { bad "sudoers com dono/modo errado"; RC=1; }
    visudo -cf "$DST_SUDOERS" >/dev/null \
      && ok "sudoers sintaticamente válido" || { bad "sudoers INVÁLIDO"; RC=1; }
  fi
  exit "$RC"
fi

echo "== instalando a fronteira de privilégio do healthcheck =="

install -o root -g root -m 0755 "$SRC_WRAPPER" "$DST_WRAPPER"
ok "wrapper  -> ${DST_WRAPPER} ($(stat -c '%U:%G %a' "$DST_WRAPPER"))"

# Validado ANTES de entrar em /etc/sudoers.d: um arquivo malformado ali
# quebra o `sudo` do host inteiro, inclusive o seu.
TMP_SUDOERS="$(mktemp)"
trap 'rm -f "$TMP_SUDOERS"' EXIT
install -o root -g root -m 0440 "$SRC_SUDOERS" "$TMP_SUDOERS"
visudo -cf "$TMP_SUDOERS" >/dev/null || die "sudoers candidato inválido — NADA foi instalado" 5
install -o root -g root -m 0440 "$TMP_SUDOERS" "$DST_SUDOERS"
ok "sudoers  -> ${DST_SUDOERS} ($(stat -c '%U:%G %a' "$DST_SUDOERS"))"

visudo -c >/dev/null || die "conjunto sudoers do host ficou inválido" 6
ok "conjunto sudoers do host válido"

sudo -l -U "$SERVICE_USER" 2>/dev/null | grep -q 'paraguai-container-status' \
  && ok "${SERVICE_USER} recebeu a capacidade" \
  || die "${SERVICE_USER} não recebeu a capacidade" 7

# A fronteira só faz sentido se o usuário continuar fora do Docker.
if id -nG "$SERVICE_USER" | tr ' ' '\n' | grep -qx docker; then
  die "${SERVICE_USER} está no grupo docker — isso anula a fronteira de privilégio" 8
fi
ok "${SERVICE_USER} continua fora do grupo docker"

echo
echo "Instalado. O healthcheck passa a ler o estado dos containers sem que o"
echo "usuário de serviço tenha qualquer acesso ao Docker."
