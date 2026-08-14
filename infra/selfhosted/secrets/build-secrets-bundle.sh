#!/usr/bin/env bash
# ParaguAI — bundle criptografado de segredos (Sprint 30).
#
# ── O PROBLEMA QUE ESTE ARQUIVO RESOLVE ─────────────────────────────────
# A Sprint 20 desenhou a custódia: os arquivos de configuração secreta vivem
# no VPS, e uma cópia cifrada vive no R2 para o dia em que o VPS não existir
# mais. A Sprint 28 constatou que essa cópia nunca passou de desenho — não
# havia ferramenta alguma que a produzisse. Um procedimento manual não
# documentado é, na prática, um procedimento que não acontece.
#
# ── A ASSIMETRIA QUE SUSTENTA TUDO ──────────────────────────────────────
# Este script CIFRA para o recipient público e não tem como decifrar: a
# identidade privada nunca esteve no VPS. Comprometer o servidor dá acesso
# aos segredos EM USO, mas não à cópia de recuperação — e é essa diferença
# que torna o backup do R2 seguro de manter.
#
# ── ONDE O PLAINTEXT VIVE ───────────────────────────────────────────────
# /run/paraguai — /run é tmpfs (memória, `noexec,nosuid,nodev`). O texto em
# claro existe apenas durante a operação e NUNCA toca disco persistente:
# não há setor para recuperar depois, e um reboot leva embora qualquer
# resíduo. É por isso que não usamos /tmp nem um diretório do repositório.
#
# ── O QUE NÃO ENTRA NO BUNDLE, DE PROPÓSITO ─────────────────────────────
# `rclone.conf` fica FORA. Ele é a credencial de bootstrap: se a chave do R2
# estivesse dentro do bundle que está no R2, seria preciso a credencial do
# R2 para buscar a credencial do R2. Ela mora no gerenciador de senhas.
# A identidade privada AGE também fica fora — por definição.
#
# Uso:
#   build-secrets-bundle.sh --check      pré-requisitos (não altera nada)
#   build-secrets-bundle.sh --build      coleta, valida, cifra
#   build-secrets-bundle.sh --upload     envia ao R2 e confere ida/volta
#   build-secrets-bundle.sh --verify     rebaixa do R2 e compara sha256
#   build-secrets-bundle.sh --cleanup    remove os artefatos de trabalho
#   build-secrets-bundle.sh --self-test  ciclo completo com dados SINTÉTICOS
#
# `--self-test` existe para que o pipeline possa ser provado de ponta a ponta
# sem nenhum segredo real — inclusive antes de os segredos existirem.
set -euo pipefail
umask 077
IFS=$' \t\n'

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
unset BASH_ENV CDPATH ENV GLOBIGNORE

readonly AGE=/usr/bin/age
readonly RCLONE=/usr/bin/rclone
readonly TAR=/usr/bin/tar

readonly RECIPIENT=/etc/paraguai/age-recipient
readonly RCLONE_CFG=/etc/paraguai/rclone.conf
readonly WORKDIR=/run/paraguai
readonly BUNDLE="${WORKDIR}/paraguai-secrets.age"
readonly REMOTE_BASE="r2:paraguai-backups/paraguai-secrets"
readonly REMOTE_OBJ="${REMOTE_BASE}/paraguai-secrets.age"

# Fontes FIXAS no código. Aceitar caminhos por argumento ou por ambiente
# transformaria este script — que roda como root — num "cifre qualquer
# arquivo do sistema e mande para fora".
readonly SOURCES=(
  /opt/supabase-stack/docker/.env
  /etc/paraguai/backup.env
)

die()  { printf 'build-secrets-bundle: %s\n' "$1" >&2; exit "${2:-1}"; }
ok()   { printf '  ✅ %s\n' "$1"; }
bad()  { printf '  ❌ %s\n' "$1"; }
warn() { printf '  ⚠️  %s\n' "$1"; }
sec()  { printf '\n== %s ==\n' "$1"; }

MODE=""
case "${1:-}" in
  --check) MODE=check ;; --build) MODE=build ;; --upload) MODE=upload ;;
  --verify) MODE=verify ;; --cleanup) MODE=cleanup ;; --self-test) MODE=selftest ;;
  *) printf 'uso: %s --check|--build|--upload|--verify|--cleanup|--self-test\n' \
       "$(basename "$0")" >&2; exit 64 ;;
esac
[ "$#" -eq 1 ] || die "este comando aceita exatamente uma opção" 64
[ "$(id -u)" -eq 0 ] || die "execute como root (as fontes são root-only)" 77

# ── Validação de um arquivo KEY=VALUE ───────────────────────────────────
# Reporta NOME de variável e NÚMERO de linha; nunca o valor. Um validador
# que imprime o conteúdo para explicar o erro vaza exatamente o que deveria
# proteger.
validate_env() {
  local f="$1" line n=0 key rc=0
  local -a seen=()
  [ -s "$f" ] || { bad "$(basename "$f"): arquivo vazio"; return 1; }
  while IFS= read -r line || [ -n "$line" ]; do
    n=$((n+1))
    case "$line" in
      ''|'#'*) continue ;;
    esac
    if ! printf '%s' "$line" | grep -qE '^[A-Z][A-Z0-9_]*='; then
      bad "$(basename "$f"):${n}: linha não é KEY=VALUE válida"; rc=1; continue
    fi
    key="${line%%=*}"
    if printf '%s\n' "${seen[@]:-}" | grep -qx "$key"; then
      bad "$(basename "$f"): variável duplicada: ${key}"; rc=1
    fi
    seen+=("$key")
    # Placeholder remanescente = arquivo não foi preenchido. Cifrar isso
    # produziria um backup de configuração inútil, com aparência de válido.
    case "${line#*=}" in
      *'<<'*'>>'*) bad "$(basename "$f"): ${key} ainda contém placeholder"; rc=1 ;;
    esac
  done < "$f"
  [ "$rc" -eq 0 ] && ok "$(basename "$f"): ${#seen[@]} variáveis, sintaxe válida"
  return "$rc"
}

prepare_workdir() {
  install -d -o root -g root -m 0700 "$WORKDIR"
}

# Remoção explícita, arquivo a arquivo. Nunca `rm -rf` num diretório que
# roda como root.
shred_file() {
  [ -e "$1" ] || return 0
  shred -u "$1" 2>/dev/null || rm -f "$1"
}

check_prereqs() {
  local rc=0
  for b in "$AGE" "$RCLONE" "$TAR"; do
    [ -x "$b" ] && ok "$(basename "$b") disponível" || { bad "$b ausente"; rc=1; }
  done
  if [ -f "$RECIPIENT" ]; then
    if grep -q 'AGE-SECRET-KEY' "$RECIPIENT"; then
      bad "o recipient contém uma identidade PRIVADA — incidente de custódia"; rc=1
    elif grep -qE '^age1[0-9a-z]+$' "$RECIPIENT"; then
      ok "recipient público válido (sha256 $(sha256sum "$RECIPIENT" | cut -c1-16)…)"
    else
      bad "recipient não parece uma chave pública age"; rc=1
    fi
  else
    bad "recipient ausente: ${RECIPIENT}"; rc=1
  fi
  [ -f "$RCLONE_CFG" ] && ok "rclone.conf presente" || { bad "rclone.conf ausente"; rc=1; }
  findmnt -no FSTYPE /run 2>/dev/null | grep -qx tmpfs \
    && ok "/run é tmpfs — o plaintext não toca disco persistente" \
    || warn "/run NÃO é tmpfs: o plaintext tocaria disco"
  # A identidade privada jamais deve estar aqui. Isto não é paranoia: é a
  # única propriedade que torna o bundle no R2 seguro.
  if find /etc/paraguai /root /var/lib/paraguai -maxdepth 3 -type f \
       -exec grep -l 'AGE-SECRET-KEY' {} + 2>/dev/null | grep -q .; then
    bad "IDENTIDADE PRIVADA AGE encontrada no host — incidente de custódia"; rc=1
  else
    ok "nenhuma identidade privada AGE no host (o VPS cifra, não decifra)"
  fi
  return "$rc"
}

encrypt_to_bundle() {   # $1=diretório com o conteúdo  $2=destino .age
  local src="$1" dst="$2"
  "$TAR" --create --gzip --file=- --sort=name --owner=0 --group=0 \
         --numeric-owner --mtime='UTC 2020-01-01' --directory="$src" . \
    | "$AGE" -R "$RECIPIENT" -o "$dst"
  chmod 0600 "$dst"
}

case "$MODE" in

check)
  sec "pré-requisitos"
  RC=0; check_prereqs || RC=1
  sec "fontes de segredo"
  PRESENT=0
  for f in "${SOURCES[@]}"; do
    if [ -f "$f" ]; then
      ok "$(basename "$f") presente ($(stat -c '%U:%G %a' "$f"))"; PRESENT=$((PRESENT+1))
    else
      warn "$(basename "$f"): ainda não provisionado — nada a empacotar"
    fi
  done
  [ "$PRESENT" -eq 0 ] && warn "nenhuma fonte existe ainda: --build não tem o que cifrar"
  sec "destino"
  ok "remoto: ${REMOTE_OBJ}"
  ok "trabalho: ${WORKDIR} (0700 root:root)"
  printf '\n'
  [ "$RC" -eq 0 ] && { printf '== pré-requisitos conformes ==\n'; exit 0; }
  printf '== pré-requisitos com falha ==\n'; exit 1
  ;;

build)
  check_prereqs >/dev/null || die "pré-requisitos não atendidos (rode --check)" 3
  prepare_workdir
  STAGE="${WORKDIR}/stage"
  install -d -o root -g root -m 0700 "$STAGE"

  sec "coleta e validação"
  COUNT=0; RC=0
  for f in "${SOURCES[@]}"; do
    [ -f "$f" ] || { warn "$(basename "$f") ausente — ignorado"; continue; }
    validate_env "$f" || RC=1
    install -m 0600 "$f" "${STAGE}/$(basename "$f")"
    COUNT=$((COUNT+1))
  done
  [ "$RC" -eq 0 ] || { find "$STAGE" -type f -exec shred -u {} + 2>/dev/null || true
                       rmdir "$STAGE" 2>/dev/null || true
                       die "validação falhou — nada foi cifrado" 4; }
  [ "$COUNT" -gt 0 ] || { rmdir "$STAGE" 2>/dev/null || true
                          die "nenhuma fonte disponível — nada a cifrar" 5; }

  # Manifesto sem segredo: nomes, tamanhos e sha256 dos arquivos incluídos.
  {
    printf 'bundleVersion=1\n'
    printf 'createdAt=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'hostname=%s\n' "$(hostname)"
    printf 'gitCommit=%s\n' "$(git -C /opt/paraguai rev-parse HEAD 2>/dev/null || echo unknown)"
    printf 'recipientSha256=%s\n' "$(sha256sum "$RECIPIENT" | awk '{print $1}')"
    for f in "$STAGE"/*; do
      printf 'file=%s size=%s sha256=%s\n' \
        "$(basename "$f")" "$(stat -c %s "$f")" "$(sha256sum "$f" | awk '{print $1}')"
    done
  } > "${STAGE}/MANIFEST"
  chmod 0600 "${STAGE}/MANIFEST"

  sec "cifragem"
  encrypt_to_bundle "$STAGE" "$BUNDLE"
  ok "bundle criado: $(stat -c %s "$BUNDLE") bytes"
  ok "sha256: $(sha256sum "$BUNDLE" | awk '{print $1}')"

  # O plaintext some imediatamente após a cifragem — não espera o upload.
  find "$STAGE" -type f -exec shred -u {} + 2>/dev/null || true
  rmdir "$STAGE"
  [ -d "$STAGE" ] && bad "stage não removido" || ok "plaintext destruído (stage removido)"

  # Prova de que o resultado é realmente cifrado.
  head -c 22 "$BUNDLE" | grep -q 'age-encryption.org' \
    && ok "formato age confirmado" || bad "cabeçalho age não encontrado"
  ;;

upload)
  [ -f "$BUNDLE" ] || die "bundle inexistente — rode --build antes" 6
  LOCAL_SHA="$(sha256sum "$BUNDLE" | awk '{print $1}')"
  sec "upload"
  RCLONE_CONFIG="$RCLONE_CFG" "$RCLONE" copyto "$BUNDLE" "$REMOTE_OBJ" --s3-no-check-bucket
  ok "enviado: ${REMOTE_OBJ}"
  sec "verificação ida-e-volta"
  BACK="${WORKDIR}/verify.age"
  RCLONE_CONFIG="$RCLONE_CFG" "$RCLONE" copyto "$REMOTE_OBJ" "$BACK" --s3-no-check-bucket
  REMOTE_SHA="$(sha256sum "$BACK" | awk '{print $1}')"
  shred_file "$BACK"
  if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
    ok "sha256 idêntico — upload íntegro (${LOCAL_SHA})"
  else
    bad "sha256 divergente — upload NÃO é confiável"; exit 7
  fi
  ;;

verify)
  sec "verificação do bundle remoto"
  prepare_workdir
  BACK="${WORKDIR}/verify.age"
  RCLONE_CONFIG="$RCLONE_CFG" "$RCLONE" copyto "$REMOTE_OBJ" "$BACK" --s3-no-check-bucket \
    || die "não foi possível baixar ${REMOTE_OBJ}" 8
  ok "baixado: $(stat -c %s "$BACK") bytes"
  ok "sha256 remoto: $(sha256sum "$BACK" | awk '{print $1}')"
  head -c 22 "$BACK" | grep -q 'age-encryption.org' \
    && ok "formato age confirmado" || bad "conteúdo remoto não é um arquivo age"
  if [ -f "$BUNDLE" ]; then
    cmp -s "$BUNDLE" "$BACK" && ok "idêntico ao bundle local" || bad "DIFERE do bundle local"
  fi
  shred_file "$BACK"
  ok "cópia de verificação destruída"
  ;;

cleanup)
  sec "limpeza"
  for f in "$BUNDLE" "${WORKDIR}/verify.age"; do
    [ -e "$f" ] && { shred_file "$f"; ok "removido: $(basename "$f")"; }
  done
  if [ -d "${WORKDIR}/stage" ]; then
    find "${WORKDIR}/stage" -type f -exec shred -u {} + 2>/dev/null || true
    rmdir "${WORKDIR}/stage" 2>/dev/null || true
    ok "stage removido"
  fi
  REMAIN="$(find "$WORKDIR" -type f 2>/dev/null | wc -l)"
  [ "$REMAIN" -eq 0 ] && ok "nenhum arquivo residual em ${WORKDIR}" \
                      || bad "${REMAIN} arquivo(s) ainda em ${WORKDIR}"
  ;;

selftest)
  # Ciclo completo com dados SINTÉTICOS: prova o pipeline sem que exista um
  # único segredo real no sistema.
  check_prereqs >/dev/null || die "pré-requisitos não atendidos" 3
  prepare_workdir
  T="${WORKDIR}/selftest"; install -d -o root -g root -m 0700 "$T"
  TSTAGE="${T}/stage"; install -d -o root -g root -m 0700 "$TSTAGE"
  TBUNDLE="${T}/selftest.age"
  TOBJ="${REMOTE_BASE}/selftest-$(date -u +%Y%m%dT%H%M%SZ).age"

  sec "1. plaintext sintético"
  printf 'TEST_SECRET=synthetic-not-real\nTEST_TOKEN=synthetic-token\n' > "${TSTAGE}/synthetic.env"
  chmod 0600 "${TSTAGE}/synthetic.env"
  ok "criado (2 variáveis sintéticas)"
  validate_env "${TSTAGE}/synthetic.env"

  sec "2. validador rejeita entrada inválida"
  printf 'ok=1\n' > "${T}/bad1"; validate_env "${T}/bad1" >/dev/null 2>&1 \
    && bad "aceitou nome minúsculo" || ok "rejeita nome de variável inválido"
  printf 'A=1\nA=2\n' > "${T}/bad2"; validate_env "${T}/bad2" >/dev/null 2>&1 \
    && bad "aceitou duplicata" || ok "rejeita variável duplicada"
  printf 'A=<<GERAR>>\n' > "${T}/bad3"; validate_env "${T}/bad3" >/dev/null 2>&1 \
    && bad "aceitou placeholder" || ok "rejeita placeholder não preenchido"
  : > "${T}/bad4"; validate_env "${T}/bad4" >/dev/null 2>&1 \
    && bad "aceitou arquivo vazio" || ok "rejeita arquivo vazio"
  rm -f "${T}/bad1" "${T}/bad2" "${T}/bad3" "${T}/bad4"

  sec "3. cifragem"
  encrypt_to_bundle "$TSTAGE" "$TBUNDLE"
  T_SHA="$(sha256sum "$TBUNDLE" | awk '{print $1}')"
  ok "ciphertext: $(stat -c %s "$TBUNDLE") bytes  sha256=${T_SHA}"
  grep -q 'synthetic-not-real' "$TBUNDLE" 2>/dev/null \
    && bad "plaintext sobreviveu no ciphertext" || ok "plaintext não aparece no ciphertext"
  head -c 22 "$TBUNDLE" | grep -q 'age-encryption.org' && ok "formato age confirmado"

  sec "4. o VPS NÃO decifra"
  if "$AGE" -d -o /dev/null "$TBUNDLE" 2>/dev/null; then
    bad "o VPS decifrou — custódia COMPROMETIDA"
  else
    ok "decrypt falhou como esperado (nenhuma identidade no host)"
  fi

  sec "5. R2 ida e volta"
  RCLONE_CONFIG="$RCLONE_CFG" "$RCLONE" copyto "$TBUNDLE" "$TOBJ" --s3-no-check-bucket
  ok "upload"
  TBACK="${T}/back.age"
  RCLONE_CONFIG="$RCLONE_CFG" "$RCLONE" copyto "$TOBJ" "$TBACK" --s3-no-check-bucket
  B_SHA="$(sha256sum "$TBACK" | awk '{print $1}')"
  [ "$T_SHA" = "$B_SHA" ] && ok "sha256 idêntico ida e volta" || bad "sha256 divergente"

  sec "6. remoção do objeto de teste"
  RCLONE_CONFIG="$RCLONE_CFG" "$RCLONE" deletefile "$TOBJ" --s3-no-check-bucket
  N="$(RCLONE_CONFIG="$RCLONE_CFG" "$RCLONE" ls "$REMOTE_BASE" --s3-no-check-bucket 2>/dev/null | wc -l)"
  ok "objetos restantes no prefixo de teste: ${N}"

  sec "7. limpeza"
  find "$T" -type f -exec shred -u {} + 2>/dev/null || true
  rmdir "$TSTAGE" "$T" 2>/dev/null || true
  [ -d "$T" ] && bad "diretório de teste não removido" || ok "todo o plaintext e ciphertext de teste destruídos"
  REMAIN="$(find "$WORKDIR" -type f 2>/dev/null | wc -l)"
  [ "$REMAIN" -eq 0 ] && ok "nenhum resíduo em ${WORKDIR}" || bad "${REMAIN} resíduo(s)"
  ;;
esac
