#!/usr/bin/env bash
# ParaguAI — provisionamento reprodutível do host self-hosted (Sprint 29).
#
# ── O PROBLEMA QUE ESTE ARQUIVO RESOLVE ─────────────────────────────────
# A auditoria da Sprint 28 respondeu "NÃO" à pergunta que importa: *se o VPS
# for perdido, um `git clone` reconstrói a infraestrutura?* Wrappers, sudoers
# e units já eram reprodutíveis — mas usuário de serviço, diretórios,
# permissões, swap e firewall existiam apenas como comandos digitados uma
# vez. Um runbook em prosa não é infraestrutura; é uma lembrança.
#
# Este script torna a camada NÃO-SECRETA do host reproduzível a partir do
# repositório.
#
# ── O QUE ELE DELIBERADAMENTE NÃO FAZ ───────────────────────────────────
# Não gera segredo algum: nem senha, nem JWT, nem chave, nem identidade age,
# nem backup.env, nem rclone.conf. Não instala o Supabase, não sobe
# container, não cria volume, não inicia o backup. Segredo e primeiro boot
# são gates próprios, e misturá-los aqui destruiria a propriedade que torna
# este script seguro de rodar: ele pode ser executado a qualquer momento,
# em qualquer host, sem consequência irreversível.
#
# ── MODOS ───────────────────────────────────────────────────────────────
#   install-host.sh            → --check (PADRÃO: apenas verifica)
#   install-host.sh --check    → idem, explícito
#   install-host.sh --install  → aplica as correções necessárias
#
# O padrão é verificar, nunca alterar. Um script de provisionamento que
# modifica o host quando executado sem argumento é uma armadilha esperando
# um dedo distraído.
#
# Saída: 0 = conforme | 1 = há divergências (em --check) ou falha (em --install)
set -euo pipefail
umask 077

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH
unset IFS BASH_ENV CDPATH ENV GLOBIGNORE

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
INFRA="${REPO_ROOT}/infra/selfhosted"

# ── Contrato da arquitetura (Sprints 22–28) ─────────────────────────────
SERVICE_USER=paraguai
SERVICE_HOME=/var/lib/paraguai
SERVICE_SHELL=/usr/sbin/nologin
SWAPFILE=/swapfile
SWAP_BYTES=4294967296          # 4 GiB
SWAPPINESS=10
SYSCTL_FILE=/etc/sysctl.d/99-paraguai.conf
SSH_PORT=22

# path:owner:group:mode
DIRS=(
  "/srv/paraguai:root:root:0755"
  "/srv/paraguai/postgres:root:root:0700"
  "/srv/paraguai/storage:root:root:0755"
  "/backups/paraguai:${SERVICE_USER}:${SERVICE_USER}:0750"
  "/etc/paraguai:root:${SERVICE_USER}:0750"
)

UNITS=(
  "${INFRA}/backup/paraguai-backup.service"
  "${INFRA}/backup/paraguai-backup.timer"
  "${INFRA}/monitoring/paraguai-healthcheck.service"
  "${INFRA}/monitoring/paraguai-healthcheck.timer"
)

MODE=check
case "${1:-}" in
  ""|--check) MODE=check ;;
  --install)  MODE=install ;;
  *) printf 'uso: %s [--check|--install]\n' "$(basename "$0")" >&2; exit 64 ;;
esac
[ "$#" -le 1 ] || { printf 'erro: argumentos em excesso\n' >&2; exit 64; }

DRIFT=0
ok()   { printf '  ✅ %s\n' "$1"; }
fix()  { printf '  🔧 %s\n' "$1"; }
bad()  { printf '  ❌ %s\n' "$1"; DRIFT=$((DRIFT+1)); }
warn() { printf '  ⚠️  %s\n' "$1"; }
sec()  { printf '\n== %s ==\n' "$1"; }

[ "$(id -u)" -eq 0 ] || { printf 'ERRO: execute como root (sudo)\n' >&2; exit 77; }
[ -d "$INFRA" ] || { printf 'ERRO: repositório não encontrado em %s\n' "$INFRA" >&2; exit 2; }

printf '== ParaguAI — provisionamento do host (modo: %s) ==\n' "$MODE"
printf '   repositório: %s\n' "$REPO_ROOT"

# ── 1. Usuário de serviço ───────────────────────────────────────────────
sec "usuário de serviço"
if id "$SERVICE_USER" >/dev/null 2>&1; then
  ok "usuário ${SERVICE_USER} existe (uid=$(id -u "$SERVICE_USER") gid=$(id -g "$SERVICE_USER"))"
  CUR_SHELL="$(getent passwd "$SERVICE_USER" | cut -d: -f7)"
  [ "$CUR_SHELL" = "$SERVICE_SHELL" ] \
    && ok "shell = ${SERVICE_SHELL}" \
    || bad "shell é '${CUR_SHELL}', esperado ${SERVICE_SHELL} — NÃO altero automaticamente (pode quebrar serviços)"
elif [ "$MODE" = install ]; then
  # --system: uid no range de serviço. Sem senha utilizável, sem login.
  useradd --system --create-home --home-dir "$SERVICE_HOME" \
          --shell "$SERVICE_SHELL" --user-group "$SERVICE_USER"
  passwd -l "$SERVICE_USER" >/dev/null
  fix "usuário ${SERVICE_USER} criado (uid=$(id -u "$SERVICE_USER"))"
else
  bad "usuário ${SERVICE_USER} AUSENTE"
fi

if id "$SERVICE_USER" >/dev/null 2>&1; then
  # A fronteira de privilégio inteira depende disto. Nunca "corrigir"
  # adicionando ao grupo — se estiver lá, é incidente, não drift.
  if id -nG "$SERVICE_USER" | tr ' ' '\n' | grep -qx docker; then
    bad "${SERVICE_USER} está no grupo docker — isso ANULA a fronteira de privilégio"
  else
    ok "${SERVICE_USER} fora do grupo docker"
  fi
fi

# ── 2. Diretórios ───────────────────────────────────────────────────────
sec "diretórios"
for entry in "${DIRS[@]}"; do
  IFS=: read -r p o g m <<< "$entry"
  if [ ! -d "$p" ]; then
    if [ "$MODE" = install ]; then
      install -d -o "$o" -g "$g" -m "$m" "$p"; fix "criado ${p} (${o}:${g} ${m})"
    else
      bad "${p} AUSENTE (esperado ${o}:${g} ${m})"
    fi
    continue
  fi
  cur="$(stat -c '%U:%G %a' "$p")"
  want="${o}:${g} ${m#0}"
  if [ "$cur" = "$want" ]; then
    ok "${p} (${cur})"
  elif [ "$MODE" = install ]; then
    chown "${o}:${g}" "$p"; chmod "$m" "$p"; fix "${p}: ${cur} -> ${want}"
  else
    bad "${p} está '${cur}', esperado '${want}'"
  fi
done

# ── 3. Swap ─────────────────────────────────────────────────────────────
# Amortecedor contra OOM num host com 7,3 GiB e limites de memória somando
# ~6 GB. Nunca destrói swap existente: divergência de tamanho é REPORTADA,
# porque desligar swap em produção derruba processos.
sec "swap"
if swapon --show=NAME --noheadings 2>/dev/null | grep -qx "$SWAPFILE"; then
  cur_bytes="$(stat -c %s "$SWAPFILE" 2>/dev/null || echo 0)"
  if [ "$cur_bytes" -eq "$SWAP_BYTES" ]; then
    ok "swap ativa em ${SWAPFILE} ($((cur_bytes/1024/1024/1024)) GiB)"
  else
    warn "swap ativa com $((cur_bytes/1024/1024)) MiB, esperado $((SWAP_BYTES/1024/1024)) MiB — divergência REPORTADA, não corrigida"
  fi
  cur_mode="$(stat -c '%a %U:%G' "$SWAPFILE")"
  [ "$cur_mode" = "600 root:root" ] && ok "${SWAPFILE} 600 root:root" || bad "${SWAPFILE} está '${cur_mode}'"
elif swapon --show --noheadings 2>/dev/null | grep -q .; then
  warn "existe swap em outro dispositivo — não crio uma segunda"
elif [ "$MODE" = install ]; then
  fallocate -l "$SWAP_BYTES" "$SWAPFILE"
  chmod 600 "$SWAPFILE"
  mkswap "$SWAPFILE" >/dev/null
  swapon "$SWAPFILE"
  fix "swap de $((SWAP_BYTES/1024/1024/1024)) GiB criada e ativada"
else
  bad "sem swap — esperado ${SWAPFILE} de $((SWAP_BYTES/1024/1024/1024)) GiB"
fi

if grep -qE "^${SWAPFILE}[[:space:]]" /etc/fstab 2>/dev/null; then
  ok "fstab já referencia ${SWAPFILE}"
elif [ "$MODE" = install ]; then
  printf '%s none swap sw 0 0\n' "$SWAPFILE" >> /etc/fstab; fix "fstab atualizado"
else
  bad "fstab não referencia ${SWAPFILE} (swap não sobreviveria a um reboot)"
fi

cur_sw="$(cat /proc/sys/vm/swappiness)"
if [ "$cur_sw" = "$SWAPPINESS" ]; then
  ok "swappiness = ${SWAPPINESS}"
elif [ "$MODE" = install ]; then
  printf 'vm.swappiness=%s\n' "$SWAPPINESS" > "$SYSCTL_FILE"
  sysctl -q -w "vm.swappiness=${SWAPPINESS}"; fix "swappiness ${cur_sw} -> ${SWAPPINESS}"
else
  bad "swappiness = ${cur_sw}, esperado ${SWAPPINESS}"
fi

# ── 4. Firewall ─────────────────────────────────────────────────────────
# Só a porta do SSH. A 443 entra no gate do Caddy — abrir porta sem serviço
# atrás é superfície gratuita. Regras desconhecidas são REPORTADAS, jamais
# removidas: podem ser deliberadas, e apagá-las às cegas é como um script
# de provisionamento derruba um host.
sec "firewall (ufw)"
if ! command -v ufw >/dev/null 2>&1; then
  bad "ufw não instalado"
else
  if ufw status | head -1 | grep -q 'Status: active'; then
    ok "ufw ativo"
  elif [ "$MODE" = install ]; then
    # A permissão de SSH SEMPRE antes de qualquer política de negação.
    ufw allow "${SSH_PORT}/tcp" comment 'SSH' >/dev/null
    ufw default deny incoming >/dev/null
    ufw default allow outgoing >/dev/null
    ufw --force enable >/dev/null
    fix "ufw habilitado com ${SSH_PORT}/tcp liberado"
  else
    bad "ufw inativo"
  fi

  if ufw status verbose 2>/dev/null | grep -q 'deny (incoming)'; then
    ok "política de entrada = deny"
  elif [ "$MODE" = install ]; then
    ufw default deny incoming >/dev/null; fix "política de entrada -> deny"
  else
    bad "política de entrada não é deny"
  fi

  if ufw status 2>/dev/null | grep -qE "^${SSH_PORT}/tcp[[:space:]]+ALLOW"; then
    ok "${SSH_PORT}/tcp liberado"
  elif [ "$MODE" = install ]; then
    ufw allow "${SSH_PORT}/tcp" comment 'SSH' >/dev/null; fix "${SSH_PORT}/tcp liberado"
  else
    bad "${SSH_PORT}/tcp NÃO liberado"
  fi

  # Qualquer coisa além do SSH é reportada para inspeção humana.
  # `|| true`: quando NÃO há regra extra — o caso saudável — o grep filtra
  # tudo e sai 1, o que sob `set -e` abortaria o script no meio.
  EXTRA="$(ufw status 2>/dev/null | awk '/ALLOW/ {print $1}' | grep -vE "^${SSH_PORT}/tcp$" | sort -u | tr '\n' ' ' || true)"
  [ -z "$EXTRA" ] && ok "nenhuma regra além do SSH" || warn "regras adicionais presentes (NÃO removidas): ${EXTRA}"
fi

# ── 5. Fronteiras de privilégio ─────────────────────────────────────────
# Delegado aos instaladores já versionados: duas implementações do mesmo
# procedimento divergem, e a que diverge é sempre a que roda no desastre.
sec "wrappers privilegiados"
for inst in install-backup-privilege.sh install-healthcheck-privilege.sh; do
  script="${INFRA}/provision/${inst}"
  if [ ! -x "$script" ]; then
    bad "${inst} ausente ou não executável"
    continue
  fi
  # Só aplica se o --check reprovar. Reinstalar por reflexo escreveria em
  # /usr/local/sbin e /etc/sudoers.d a cada execução e faria o relatório
  # dizer "aplicado" mesmo quando nada mudou — um provisionador que sempre
  # diz que alterou algo ensina a ignorar o que ele diz.
  if "$script" --check >/dev/null 2>&1; then
    ok "${inst} --check conforme"
  elif [ "$MODE" = install ]; then
    if "$script" >/dev/null 2>&1; then
      fix "${inst} aplicado"
      "$script" --check >/dev/null 2>&1 && ok "${inst} conforme após aplicação" || bad "${inst} continua divergente"
    else
      bad "${inst} FALHOU"
    fi
  else
    bad "${inst} --check reprovou"
  fi
done

if command -v visudo >/dev/null 2>&1; then
  visudo -c >/dev/null 2>&1 && ok "conjunto sudoers do host válido" || bad "conjunto sudoers INVÁLIDO"
fi

# ── 6. Units systemd ────────────────────────────────────────────────────
# Instaladas, validadas e recarregadas — mas NÃO habilitadas: ambas exigem
# /etc/paraguai/backup.env, que é gate de segredo. Habilitar agora só
# produziria falha horária.
sec "units systemd"
RELOAD=0
for src in "${UNITS[@]}"; do
  name="$(basename "$src")"
  dst="/etc/systemd/system/${name}"
  if [ ! -f "$src" ]; then bad "fonte ausente: ${src}"; continue; fi
  if [ -f "$dst" ] && cmp -s "$src" "$dst"; then
    ok "${name} instalada e idêntica ao repositório"
  elif [ "$MODE" = install ]; then
    install -o root -g root -m 0644 "$src" "$dst"; RELOAD=1; fix "${name} instalada"
  else
    [ -f "$dst" ] && bad "${name} DIVERGE do repositório" || bad "${name} não instalada"
  fi
done

if [ "$MODE" = install ] && [ "$RELOAD" -eq 1 ]; then
  systemctl daemon-reload; fix "systemctl daemon-reload"
fi

for src in "${UNITS[@]}"; do
  name="$(basename "$src")"
  if systemd-analyze verify "$src" 2>&1 | grep -vE 'netplan-ovs-cleanup|RestartMode' | grep -q .; then
    bad "${name} reprovou em systemd-analyze verify"
  else
    ok "${name} válida"
  fi
done

if [ -f /etc/paraguai/backup.env ]; then
  warn "backup.env existe — habilitar os timers é decisão do gate de segredos, não deste script"
else
  ok "timers NÃO habilitados (backup.env ainda não existe — correto)"
fi

# ── 7. Configuração externa (NUNCA provisionada aqui) ───────────────────
# Estes arquivos contêm ou dependem de material que não pertence ao Git.
# Ausência aqui não é defeito de infraestrutura: é etapa humana pendente.
sec "configuração externa (fora do escopo deste script)"
for f in /etc/paraguai/age-recipient /etc/paraguai/rclone.conf; do
  if [ -f "$f" ]; then
    cur="$(stat -c '%U:%G %a' "$f")"
    [ "$cur" = "root:${SERVICE_USER} 640" ] \
      && ok "$(basename "$f") presente (${cur})" \
      || bad "$(basename "$f") está '${cur}', esperado 'root:${SERVICE_USER} 640'"
  else
    warn "$(basename "$f"): external credential/configuration not provisioned"
  fi
done
[ -f /etc/paraguai/backup.env ] || warn "backup.env: external credential/configuration not provisioned"

# ── Veredito ────────────────────────────────────────────────────────────
printf '\n'
if [ "$DRIFT" -eq 0 ]; then
  printf '== host conforme (modo: %s) ==\n' "$MODE"
  exit 0
fi
printf '== %s divergência(s) (modo: %s) ==\n' "$DRIFT" "$MODE"
[ "$MODE" = check ] && printf '   rode com --install para aplicar o que for corrigível automaticamente\n'
exit 1
