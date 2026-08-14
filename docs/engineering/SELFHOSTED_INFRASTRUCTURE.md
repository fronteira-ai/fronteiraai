# Infraestrutura Self-Hosted — Fluence VPS + Supabase

> Sprint 16. Documento de **preparação**, não de migração. O Supabase Cloud
> permanece a fonte de verdade até que uma Sprint posterior autorize
> explicitamente a troca.

## 1. Por que

| Restrição atual (Supabase Free) | Efeito |
|---|---|
| Egress acumulado 21,46 GB | Projeto **bloqueado por `exceed_egress_quota`** (HTTP 402) |
| Database 400,42 MB / 500 MB | **80% do teto**; o catálogo real ainda nem foi importado |
| Free **não oferece backup de projeto** | Um catálogo de ~18 mil produtos **sem nenhuma cópia** |

O bloqueio de egress é reversível; a ausência de backup não. Esta é a
motivação principal — a economia de custo é consequência, não objetivo.

## 2. Inventário do que o ParaguAI usa do Supabase (auditado, Fase 0)

| Recurso | Uso real | Consequência para o self-hosted |
|---|---|---|
| **PostgreSQL** | 69 tabelas, 232 índices, 803 constraints, 2 materialized views | Serviço central |
| **Migrations** | 26 em `supabase/migrations/` + 17 em `database/migrations/` | Ordem e baselines precisam ser respeitadas |
| **RLS** | 68 de 69 tabelas com RLS, 49 policies ativas | Papéis `anon`/`authenticated`/`service_role` obrigatórios |
| **Auth (GoTrue)** | e-mail/senha, `signUp`, `signOut`, `getUser`, `exchangeCodeForSession` | **GoTrue obrigatório** |
| **`auth.users` / `auth.uid()`** | **18 FKs** e **92 usos em policies** | ⚠️ Ver §3 — restrição de ordem |
| **Storage** | 1 bucket: `catalog`, público para leitura | Serviço obrigatório |
| **PostgREST** | Todo acesso a dados | Serviço obrigatório |
| **Realtime** | **ZERO uso** — nenhum `.channel(`, `postgres_changes` ou `removeChannel` | **Desligado** (o domínio `realtime-commerce` é nome de negócio) |
| **Edge Functions** | Nenhuma (`supabase/functions/` não existe) | Não instalar |
| **Cron** | Vercel Cron + GitHub Actions, via HTTP | Nenhum `pg_cron`; nada a migrar no banco |
| **Extensões** | `pgcrypto`, `uuid-ossp`, `pg_net`, `pg_stat_statements`, `supabase_vault` | Todas presentes na imagem `supabase/postgres` |
| **`gen_random_uuid()`** | 99 usos | Nativo no PG ≥ 13 — sem dependência de extensão |
| **`storage.*` / `vault` / `pg_cron` / `net.http` em migrations** | Zero | Schema **não** acoplado a features gerenciadas |

### 3. Incompatibilidades e restrições encontradas

1. **⚠️ Ordem de inicialização (bloqueante).** O schema referencia
   `auth.users` (18 FKs) e `auth.uid()` (92 policies). No Cloud o schema
   `auth` já existe. No self-hosted, **quem o cria é o GoTrue**: aplicar as
   migrations antes de o GoTrue subir **falha**. Ordem obrigatória:
   `db` → `auth` (cria `auth`) → migrations do ParaguAI → demais serviços.
2. **Papéis do banco.** `anon`, `authenticated`, `service_role`,
   `authenticator` precisam existir antes das policies. O stack oficial os
   cria no init; um Postgres "puro" não.
3. **`pg_net` não existe no `postgres:*` oficial.** Confirmado no teste de
   restauração (§6). Use a imagem `supabase/postgres`.
4. **As chaves mudam.** `ANON_KEY`/`SERVICE_ROLE_KEY` do self-hosted são
   JWTs assinados com **outro** `JWT_SECRET` — as chaves do Cloud não
   funcionam, e vice-versa.
5. **SMTP.** Com `ENABLE_EMAIL_AUTOCONFIRM=false` e sem SMTP configurado,
   cadastros ficam presos em "pendente de confirmação".
6. **Usuários existentes.** `auth.users` do Cloud não vem no `pg_dump` do
   schema `public`. Migrar contas é um passo próprio da Sprint de migração.

## 4. Arquitetura

```
                        INTERNET
                           │  443/TCP (só isto entra)
                           ▼
                  ┌──────────────────┐
                  │  Caddy (proxy)   │  TLS automático (Let's Encrypt)
                  └────────┬─────────┘
                           │ 127.0.0.1
              ┌────────────┴────────────┐
              ▼                         ▼
      ┌───────────────┐         ┌───────────────┐
      │ Kong :8000    │         │ Studio :3000  │ Basic Auth
      └───────┬───────┘         └───────────────┘
     ┌────────┼─────────┬──────────────┐
     ▼        ▼         ▼              ▼
  PostgREST  GoTrue   Storage      (Realtime: DESLIGADO)
     └────────┴─────────┴──────────────┘
                    ▼
        ┌────────────────────────┐
        │ PostgreSQL :5432       │  bind 127.0.0.1 — NUNCA público
        │ /srv/paraguai/postgres │
        └───────────┬────────────┘
                    │ pg_dump -Fc (a cada 3 dias)
                    ▼
        /backups/paraguai/<data>/   ──rclone──▶  destino externo (§8)
```

A aplicação ParaguAI (Next.js) **permanece na Vercel** nesta fase. Só o
backend de dados sai do Cloud — decisão deliberada: reduz o escopo da
migração e mantém o rollback trivial (trocar duas variáveis de ambiente).

## 5. Sizing

Dimensionado a partir de números **medidos**, não estimados no vácuo:

| Fonte | Valor |
|---|---|
| Database no Cloud hoje | 400,42 MB |
| Dump comprimido do schema completo (medido, seed local) | 621 KB para 977 linhas |
| Tabelas / índices / constraints | 69 / 232 / 803 |
| Catálogo alvo | ~18 mil produtos + ofertas + `price_history` + `market_changes` |

**Recomendação: 4 vCPU / 8 GB RAM / 80–100 GB SSD.**

| Componente | RAM |
|---|---|
| PostgreSQL (limite no compose) | 3,0 GB |
| Storage | 768 MB |
| Kong + PostgREST | 1,0 GB |
| GoTrue | 384 MB |
| Studio | 512 MB |
| SO + Docker + folga | ~2 GB |
| **Total** | **~8 GB** |

Disco: banco (~2–5 GB com crescimento de 1 ano e 232 índices) + Storage de
imagens (~10–20 GB) + **10 backups retidos** (~2–3 GB) + WAL + SO ⇒ 80 GB
com folga real. O maior consumidor de disco a médio prazo é o Storage de
imagens, não o banco.

Início com 2 vCPU / 7 GB é viável para validação, mas **8 GB é o alvo**: os
limites acima somados não cabem confortavelmente em 7 GB com o SO.

## 6. Backup — o requisito central

`infra/selfhosted/backup/`

| Item | Decisão |
|---|---|
| Formato | `pg_dump --format=custom --compress=9` (restauração seletiva + índice verificável) |
| Cadência | **3 dias**, via systemd timer com `Persistent=true` (não pula ciclo após reboot) |
| Retenção | 10 cópias ≈ 30 dias |
| Integridade | sha256 por artefato + `SHA256SUMS` + `manifest.json` |
| Cópia externa | `rclone`; **ausência é ALERTA**, nunca silêncio |

### 6.1 Três artefatos, não um (auditoria da Sprint 20)

O dump lógico do PostgreSQL é **necessário e insuficiente**. Faltavam duas
coisas para reconstruir o ambiente, e nenhuma delas está dentro do banco:

| Artefato | O que salva | Por que o `pg_dump` não resolve |
|---|---|---|
| `database.dump` | dados e schema | — |
| `db-config.tar.gz` | `/etc/postgresql-custom` do volume Docker `db-config`, onde vive a **root key do pgsodium** | o dump exporta colunas cifradas como **texto cifrado**: sem a chave, o dado restaurado existe e é ilegível |
| `storage.manifest` + `rclone sync` | objetos do Storage (`/srv/paraguai/storage`, projeção 10–20 GB) | as imagens do catálogo nunca estiveram no banco |

O `manifest.json` amarra os três (timestamp UTC, hostname, commit do Git,
tamanho e sha256 de cada um) e é o que detecta o erro mais traiçoeiro:
**mistura de versões** — um dump de uma data com um `db-config` de outra.
Nenhum segredo entra no manifesto.

> ⚠️ O volume `db-config` precisa ser restaurado **antes** do primeiro boot
> do `db`. Se o Postgres inicializar sozinho, gera uma root key nova e o
> dado cifrado antigo fica inacessível para sempre.

### 6.2 Estados: `ok`, `degraded`, `failed`

`degraded` sai com código 0 **de propósito** — o backup do banco é real e
não deve ser marcado como falho porque o R2 ainda não foi configurado.
Quem transforma cada lacuna em ALERTA é o `healthcheck.sh`, que lê o
`last_result.json` e checa `dbConfig` e `storage` **separadamente**: falham
por motivos diferentes e têm consequências diferentes. O que não pode
existir é lacuna silenciosa.

**Um backup só é declarado bem-sucedido depois de quatro provas**: `pg_dump`
sair 0; o arquivo passar de um tamanho mínimo; **`pg_restore --list`
conseguir ler o índice** (prova de que não está truncado); e o sha256 ser
gravado. A retenção só apaga o antigo **depois** disso.

### 6.3 Fronteira de privilégio do backup

O backup roda como `paraguai`: `nologin`, sem `sudo`, **fora do grupo
`docker`**, sem leitura de `/var/run/docker.sock` nem de `/var/lib/docker`.
Mas capturar o `db-config` exige root. Em vez de afrouxar o usuário de
serviço, o privilégio foi isolado num único componente auditado:

```
Git                                        ← fonte da verdade
 └─ infra/selfhosted/privilege/            wrapper + regra sudoers
 └─ infra/selfhosted/provision/            instalador (exige root)
        ↓  install-backup-privilege.sh
   /usr/local/sbin/paraguai-dbconfig-dump  root:root 0755
   /etc/sudoers.d/paraguai-dbconfig        root:root 0440
        ↓  sudo -n, zero argumentos, tar.gz em STDOUT
   backup.sh (como paraguai, sem Docker)
```

O wrapper não aceita argumento algum — verificado nos dois lados: a regra
usa a forma `comando ""` e o próprio script sai com 64 se receber qualquer
coisa. Não escreve em disco (transporte é STDOUT, o que elimina temporário
e race) e **não usa `-h`/`--dereference`**, então um symlink dentro do
volume é arquivado como symlink, nunca seguido — sem isso, o wrapper viraria
um "leia qualquer arquivo como root".

### 6.4 Onde vive a configuração do R2

O `backup.sh` chama `rclone` sem passar caminho de configuração, então quem
decide o arquivo é o ambiente. Deixado no padrão, o rclone resolveria
`$HOME/.config/rclone/rclone.conf` — para o usuário de serviço, um caminho
que **ele mesmo pode criar e reescrever**. O serviço poderia, na prática,
apontar os próprios backups para um destino sob seu controle.

Por isso o caminho é explícito e fica fora do alcance de escrita do serviço:

| Item | Valor |
|---|---|
| Arquivo | `/etc/paraguai/rclone.conf` |
| Dono / modo | `root:paraguai 0640` — serviço **lê**, não **escreve** |
| Mecanismo | `RCLONE_CONFIG=/etc/paraguai/rclone.conf` no `backup.env` (`EnvironmentFile`) |
| Destino | `RCLONE_REMOTE=<remote>:<bucket>` |

Nenhuma alteração de código foi necessária: `RCLONE_CONFIG` é lido pelo
próprio rclone, e o `EnvironmentFile` já existia na unit. O token R2 é
restrito ao bucket e **não tem `CreateBucket`** — por isso as operações de
envio usam `--s3-no-check-bucket`.

> O `healthcheck.sh` também usa o remote (`rclone lsd`). O mecanismo que o
> agendar precisa carregar o **mesmo** `EnvironmentFile`, senão alerta falta
> de configuração como se fosse falha de destino.

**Por que o instalador existe:** o Git não preserva dono nem modo
privilegiado. Sem `install-backup-privilege.sh`, uma VM reconstruída teria
a fronteira apenas *descrita* no repositório, não *instalada* — e o backup
voltaria a rodar degradado, sem a root key. O script é idempotente e tem
modo `--check` para auditar um host existente sem alterá-lo.

### Teste de restauração — executado, não descrito

`restore-verify.sh` restaura num PostgreSQL **descartável** e verifica.
Resultado real desta Sprint, contra o banco local:

```
✅ sha256 confere
✅ índice legível — 118 tabelas com dados no dump
✅ PostgreSQL pronto e aceitando conexão
   tabelas=69 indices=232 constraints=803 funcoes=51 triggers=3 rls=68 policies=49
   total de linhas restauradas: 977
✅ RESTORE VERIFICADO — backup é restaurável
```

Os 23 erros do `pg_restore` foram inspecionados e são benignos: `schema
"auth" already exists` (o stub que a própria verificação cria) e
`extension "pg_net" is not available` (ausente na imagem `postgres` pura —
motivo de usar `supabase/postgres` na restauração real).

> **BACKUP ≠ arquivo existente. BACKUP VÁLIDO = backup restaurável.**

## 7. Segurança (Fase 9)

- **Somente 443 aberta.** SSH em porta alternativa, apenas por chave,
  `PermitRootLogin no`, `PasswordAuthentication no`.
- **PostgreSQL jamais público**: bind `127.0.0.1`; acesso administrativo só
  por túnel SSH. É o item nº 1 da Fase 9 e está codificado no override.
- **Studio** em loopback + Basic Auth no proxy.
- **Segredos fora do Git**, garantido por construção: `.gitignore` mantém
  `.env*` ignorado e libera **apenas** os `*.example`. Verificado —
  `.env.selfhosted` e `infra/selfhosted/.env` dão `IGNORADO`.
- `unattended-upgrades` para patches de segurança do SO.
- `fail2ban` no SSH.

## 8. Cópia externa — opções e custos

Backup no mesmo VPS **não é backup**: não sobrevive à perda do VPS.

| Opção | Custo/mês (~5 GB) | Prós | Contras |
|---|---|---|---|
| **Cloudflare R2** | **US$ 0** até 10 GB; sem taxa de egress | Sem custo de saída, S3-compatível | Exige conta Cloudflare |
| Backblaze B2 | ~US$ 0,03 | Barato, S3-compatível | Egress cobrado acima de 3× o armazenado |
| Hetzner Storage Box | ~€ 3,20 (1 TB) | Muito espaço, SFTP/rsync | Preço fixo alto para 5 GB |
| Segundo VPS Fluence | ~US$ 10,78 | Mesmo provedor | Caro para a finalidade; correlacionado |

**Recomendo Cloudflare R2**: nesta escala é gratuito, e a ausência de taxa
de egress é exatamente a falha que nos trouxe até aqui.

## 9. Custos estimados

| Item | Mensal |
|---|---|
| Fluence VPS (base medida: 2 vCPU/4 GB/25 GB = **US$ 10,78**) | US$ 11–25 conforme o tier de 4 vCPU/8 GB |
| Cloudflare R2 (< 10 GB) | US$ 0 |
| Domínio/TLS (Let's Encrypt) | US$ 0 |
| **Total** | **~US$ 11–25** |

**Bandwidth na Fluence é ilimitado, sem taxa de egress** — o que remove
estruturalmente a causa do bloqueio atual.

> O tier exato de 4 vCPU / 8 GB não está publicado no site; só o console
> mostra. Os dois pontos conhecidos são US$ 10,78 (2 vCPU/4 GB/25 GB) e
> US$ 15,24 (2 vCPU/7 GB/50 GB). **Confirme no console antes de fechar o
> orçamento.**

Fontes: [Fluence — Virtual Servers](https://www.fluence.network/virtual-servers) ·
[Fluence — DigitalOcean vs Fluence](https://www.fluence.network/blog/digitalocean-droplets-vs-fluence/)

## 10. Ordem de instalação

1. Provisionar VPS (Ubuntu LTS), criar usuário `paraguai`, endurecer SSH.
2. `ufw`: permitir 443 e a porta do SSH; **negar o resto**.
3. Docker + Compose.
4. Clonar o stack oficial num commit fixo, aplicar o override.
5. Preencher `.env` a partir do `.env.example` (segredos via `openssl rand`).
6. `docker compose up -d db` → `auth` (**cria o schema `auth`**) → resto.
7. Aplicar migrations **nesta ordem** (ver §3.1).
8. Criar o bucket `catalog` (público para leitura).
9. Instalar timer de backup; **rodar o primeiro backup à mão**.
10. **Rodar `restore-verify.sh` antes de confiar em qualquer coisa.**
11. Caddy + TLS + Basic Auth no Studio.
12. `healthcheck.sh` no cron horário.

## 11. Custódia de segredos e recuperação de desastre

Arquitetura aprovada na Sprint 20 (**modelo F + E**). A regra que a
sustenta: **a chave que decifra a cópia de recuperação nunca toca o VPS.**
Comprometer o servidor expõe os segredos em uso, mas não a capacidade de
decifrar o backup deles.

```
RAIZ (fora do VPS, fora do Git)
  identidade age  +  credenciais R2
  → password manager  +  1 cópia offline
        │ decifra
        ▼
BUNDLE  paraguai-secrets.age
  [A] .env do Supabase   [B] backup.env   [C] secrets operacionais
  → réplicas: R2 (junto dos backups) e laptop
        │ materializa
        ▼
OPERAÇÃO (VPS), separados por domínio — um vazamento não expõe os demais
  /opt/supabase-stack/docker/.env      0600 root:root
  /etc/paraguai/backup.env             0640 root:paraguai
  /etc/paraguai/rclone.conf            0640 root:paraguai
```

Os três são **legíveis** pelo processo que precisa deles e **imutáveis**
para ele: root é o dono. Um serviço que pode reescrever a própria
configuração pode redirecionar o próprio backup — ver §6.4.

**Fora do bundle, deliberadamente:** `rclone.conf` (é o *bootstrap* do
disaster recovery — se estivesse dentro do bundle que está no R2, seria
preciso a credencial do R2 para buscar a credencial do R2), chaves SSH,
certificados TLS (o ACME reemite) e arquivos do sistema.

**Ferramenta:** [`age`](https://github.com/FiloSottile/age) ≥ 1.1
(binário estático, sem servidor, sem daemon). A identidade privada vive no
password manager e numa cópia offline; o VPS conhece no máximo o
*recipient* público. Nenhuma identidade foi criada ainda.

### 11.1 O que é insubstituível

A Sprint 19 desligou `realtime`, `supavisor` e `functions` — e isso tornou
**inertes** três das quatro chaves de criptografia (`SECRET_KEY_BASE`,
`VAULT_ENC_KEY`, `REALTIME_DB_ENC_KEY`), que continuam obrigatórias apenas
porque o compose as interpola. Sobra **uma** chave verdadeiramente
irrecuperável: a **root key do pgsodium**. `PG_META_CRYPTO_KEY` é ativa
mas regenerável (perde-se apenas as conexões salvas do Studio).

Rotação: `SUPABASE_PUBLISHABLE_KEY`/`SECRET_KEY` e senhas rotacionam sem
downtime; `JWT_SECRET` e `POSTGRES_PASSWORD` exigem janela coordenada
(invalidam chaves derivadas e credenciais de serviço); a root key do
pgsodium **não rotaciona** sem re-cifrar o conteúdo do Vault.

### 11.2 Provisionamento reprodutível do host

Até a Sprint 28, a resposta a *"um `git clone` reconstrói a infraestrutura?"*
era **não**: wrappers, sudoers e units eram versionados, mas usuário de
serviço, diretórios, permissões, swap e firewall existiam apenas como
comandos digitados uma vez. Um runbook em prosa não é infraestrutura.

```bash
sudo infra/selfhosted/provision/install-host.sh --check     # padrão: só verifica
sudo infra/selfhosted/provision/install-host.sh --install   # aplica
```

O modo padrão é **verificar, nunca alterar** — um provisionador que modifica
o host quando executado sem argumento é uma armadilha esperando um dedo
distraído. Ambos os modos são idempotentes: a segunda execução não reporta
alteração alguma.

| O script reproduz | O script **nunca** toca |
|---|---|
| usuário `paraguai` (nologin, sem sudo, fora do grupo docker) | segredos de qualquer tipo |
| `/srv/paraguai/{postgres,storage}`, `/backups/paraguai`, `/etc/paraguai` com dono e modo | `backup.env`, `rclone.conf` |
| swap 4 GiB + `swappiness=10` + `fstab` | identidade privada `age` |
| UFW: deny incoming, `22/tcp` liberado | Docker, containers, volumes |
| wrappers e sudoers (delegando aos instaladores existentes) | primeiro boot |
| as 4 units systemd + `daemon-reload` | habilitar timers |
| **recipient AGE público** (`infra/selfhosted/age/age-recipient`) | **identidade AGE privada** |

Sobre o recipient: a metade **pública** é versionada de propósito. Sem ela,
uma VM nova subiria sem saber *para quem* cifrar os backups — e a etapa mais
fácil de esquecer num desastre é a que não está em lugar nenhum. A metade
**privada** continua fora do VPS e fora do Git; é ela que decifra, e é por
isso que o servidor nunca a vê. O provisionamento tem uma guarda explícita:
se o arquivo versionado contiver `AGE-SECRET-KEY`, ele **recusa instalar**
em vez de espalhar material privado pelo host.

Três decisões que o script encapsula: **não destrói** — divergência de swap
ou regra de firewall desconhecida é *reportada*, nunca removida, porque
apagar às cegas é como um provisionador derruba um host; **não duplica** —
os wrappers vêm dos instaladores já versionados, e duas implementações do
mesmo procedimento divergem justamente no dia do desastre; e **não habilita
os timers**, porque ambos dependem do `backup.env`, que é gate de segredo.

Configuração externa (`age-recipient`, `rclone.conf`, `backup.env`) é
reportada como `external credential/configuration not provisioned` — ausência
ali não é defeito de infraestrutura, é etapa humana pendente.

### 11.3 Bundle cifrado de segredos

A Sprint 20 desenhou a cópia cifrada; a Sprint 28 constatou que nada a
produzia. `infra/selfhosted/secrets/build-secrets-bundle.sh` fecha isso:

```bash
sudo infra/selfhosted/secrets/build-secrets-bundle.sh --check      # pré-requisitos
sudo infra/selfhosted/secrets/build-secrets-bundle.sh --build      # coleta, valida, cifra
sudo infra/selfhosted/secrets/build-secrets-bundle.sh --upload     # envia e confere ida/volta
sudo infra/selfhosted/secrets/build-secrets-bundle.sh --verify     # rebaixa e compara sha256
sudo infra/selfhosted/secrets/build-secrets-bundle.sh --cleanup    # destrói os artefatos
sudo infra/selfhosted/secrets/build-secrets-bundle.sh --self-test  # ciclo com dados sintéticos
```

**Onde o texto em claro vive:** `/run/paraguai` — `/run` é **tmpfs**
(`noexec,nosuid,nodev`). O plaintext existe só durante a operação e **nunca
toca disco persistente**: não há setor para recuperar depois. Ele é destruído
com `shred` imediatamente após a cifragem, antes mesmo do upload.

**Fontes fixas no código** (`docker/.env` e `backup.env`). Aceitar caminhos
por argumento ou ambiente transformaria um script que roda como root num
"cifre qualquer arquivo do sistema e mande para fora".

**`rclone.conf` fica FORA do bundle, de propósito** — é a credencial de
*bootstrap*: se a chave do R2 estivesse dentro do bundle que está no R2,
seria preciso a credencial do R2 para buscar a credencial do R2. Ela mora no
gerenciador de senhas. A identidade privada AGE também fica fora, por
definição.

**Validação antes de cifrar:** cada arquivo precisa ser `KEY=VALUE` válido,
sem duplicatas, sem placeholder `<<GERAR>>` remanescente e não-vazio. Erros
citam nome de variável e número de linha — **nunca o valor**. Cifrar um
`.env` ainda com placeholders produziria um backup de aparência válida e
conteúdo inútil.

**A assimetria que sustenta o modelo:** o script cifra para o recipient
público e não tem como decifrar. O `--self-test` prova isso executando um
`age -d` que **deve falhar** — comprometer o servidor dá acesso aos segredos
em uso, não à cópia de recuperação.

### 11.4 Recuperação após perda total do VPS

VM → SSH → Docker → swap → firewall → dependências (`postgresql-client`
**≥ 17**, `rclone`, `age`, Caddy) → **credencial R2 do password manager** →
baixar dump + `db-config.tar.gz` + bundle → decifrar segredos →
`git clone` nas refs fixas (`/opt/paraguai`, `/opt/supabase-stack`) →
diretórios e usuário → **restaurar `db-config` ANTES do 1º boot** →
`db` → `auth` (cria o schema `auth`) → migrations → demais serviços →
`pg_restore` → `rclone sync` do Storage → Caddy/TLS → DNS →
`restore-verify.sh` + `healthcheck.sh`.

RTO estimado 2–4 h. RPO: até 3 dias (banco), 24 h (Storage).

## 12. O que esta Sprint deliberadamente NÃO fez

Sem tocar no Cloud, sem migração de produção, sem trocar `.env.local`, sem
DNS, sem commit/push. `.env.selfhosted.example` é template — a aplicação
continua apontando para onde apontava.
