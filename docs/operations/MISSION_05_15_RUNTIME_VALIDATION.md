# MISSION 05.15 — FLUENCE VPS: VALIDAÇÃO DE RUNTIME ISOLADA

**Categoria**: `docs/operations/`
**Branch**: `mission-05-15-runtime-validation` (a partir de `origin/main` = `c43538b`; base 05.14 @ `37fe889`)
**Escopo**: preparação e auditoria. **Nenhum build e nenhum container executado no VPS**, nenhum
secret criado, Docker/Caddy/DNS de produção intocados, nenhum cron executado, banco não modificado,
sem merge e sem deploy. Stack Supabase e Mission 04 preservados.
**Política de cache de 300 s: NÃO aplicada** (proibido nesta missão) — permanece apenas como proposta da 05.14.

---

## 1. SEGURANÇA DO BUILD

### 1.1 Segredos no repositório — verificado (sem imprimir valores)

| Verificação | Resultado |
|---|---|
| JWTs completos (`eyJhbGciOi…`) em arquivos **rastreados** | **0** em **1.775** arquivos rastreados |
| Arquivos com menção textual a `service_role` | 4, **todos documentação** (`DECISIONS.md`, `RELEASE_CERTIFICATION_1.7.md`, `SELFHOSTED_INFRASTRUCTURE.md`) — prosa, sem valor |
| `.env.example` / `.env.selfhosted.example` | sem JWT; valores são placeholders/URLs de exemplo |
| Atribuições com valor real nos exemplos | inspecionadas e **não** são material de chave (a triagem por JWT é conclusiva: nenhuma) |

### 1.2 Contexto de build — endurecido nesta missão

- O working tree tem **5 arquivos `.env*`** (`.env.local`, `.env.development.local`,
  `.env.local.legacy-rollback` + 2 exemplos). `.env.local` e o `.legacy-rollback` contêm a
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (pública por definição) e a **`SUPABASE_SERVICE_ROLE_KEY`**
  (ignora RLS — o ativo crítico).
- O `.dockerignore` cobre `.env` e `.env.*`. **Nesta missão removi as duas negações** que
  re-incluíam os `.example` no contexto: agora **nenhum `.env*` entra no build context**. Motivo:
  o Next não carrega `.example` (inútil no build) e a regra absoluta elimina o risco de alguém
  preencher um `.example` com valor real no futuro.
- O estágio **runner** do `Dockerfile` copia apenas `.next/standalone`, `.next/static` e `public`
  — **nenhum** `.env*` pode aparecer na imagem final, por construção.
- Segredos entram **em runtime** por `env_file: /etc/paraguai/app.env` (`root:root 0600`, fora do
  Git), nunca como build arg. Os **únicos** build args são os três `NEXT_PUBLIC_*` (públicos por
  definição e exigidos pelo `lib/env.ts` em tempo de build).

### 1.3 Efeitos colaterais na inicialização — verificados (task 6)

| Verificação | Resultado |
|---|---|
| `instrumentation.ts` (hook de boot do Next) | **não existe** |
| Import de scripts de seed/migração no app | **0** ocorrências |
| O `npm run build` toca banco? | **não** (`next build` puro) |
| Escrita/migração no boot do container? | **nenhuma identificada** — o processo é `node server.js` |
| **Ressalva importante** | as rotas `POST/GET /api/cron/*` **fazem trabalho real** (sync de conectores, varredura de alertas). Elas só executam com `CRON_SECRET` válido e **não** são chamadas na validação, exceto no teste explícito e único descrito no §4 |

---

## 2. CONFIGURAÇÕES FINAIS (estado da branch)

| Arquivo | Configuração | Validação |
|---|---|---|
| `Dockerfile` | multi-stage Node 22; `deps` (`npm ci`) → `builder` (3 build args `NEXT_PUBLIC_*`, `NEXT_TELEMETRY_DISABLED=1`) → `runner` (não-root `nextjs:1001`, `PORT=3100`, `HOSTNAME=0.0.0.0`) | artefatos exigidos **existem**: `.next/standalone/server.js` e `.next/static` (verificado no build) |
| `.dockerignore` | exclui `.env*` (agora **sem exceções**), `node_modules`, `.next`, `.git`, `supabase`, `database`, `infra`, `docs`, `*.md`, logs | 5 arquivos `.env*` no working tree, todos cobertos |
| `docker-compose.app.yml` | **isolado** do stack Supabase; `memory: 1G`; `cpus: "2.0"`; `restart: unless-stopped`; `env_file` 0600; porta só em `127.0.0.1:3100`; volume `/srv/paraguai/isr-cache:/app/.next/cache`; log `max-size 50m` × 5 | caminhos relativos resolvem do repo (`context: ../../..`) |
| **Healthcheck** | `wget /robots.txt` (rota **estática** do build) — não usa SSR nem banco; `interval 30s`, `start_period 25s`, `retries 3` | coerente com o critério de não consumir CPU/conexões no monitoramento |
| `next.config.ts` | `output: "standalone"`; `images.unoptimized` **ligado por env** (`SELF_HOSTED_IMAGES_UNOPTIMIZED=1`, definido só no Dockerfile) | em Vercel a variável não existe ⇒ comportamento de produção **inalterado** |
| Persistência de cache | volume dedicado para `.next/cache` (ISR/data) | sem ele, cada restart dispararia rajada de regenerações |

**Recursos**: memória de runtime 1 GB (teto) · CPU 2,0 cores · pico de build 1,5–2,5 GB (build com
teto; swap de 4 GB como rede) · imagem ~250–400 MB · cache ISR 100–500 MB (estimativa).

---

## 3. DEPENDÊNCIAS PENDENTES

| # | Dependência | Estado | Por que bloqueia |
|---|---|---|---|
| **D1** | **Isolamento do checkout** — `CORRIGE a Etapa A da 05.14` | `/opt/paraguai` **não é repositório git** (diretório de produção, dono `ubuntu`) e é referenciado por **5 units systemd**: `paraguai-backup.service/.timer`, `paraguai-healthcheck.service/.timer`, `paraguai-container-status.service`. O `git checkout` que eu havia proposto ali é **impossível e inseguro** (alteraria o script de backup em produção) | usar diretório **novo** (`/opt/paraguai-app`) — ver §4 |
| **D2** | **Caminho de deploy do código para o VPS** | **não existe**: o host não tem credencial do GitHub para o repo do app, e não há CI de deploy; `/opt/paraguai` foi populado por cópia | decidir: `rsync`/`scp` do repo (como foi feito antes), *deploy key* no host, ou CI. **Criar credencial é "criar secret" ⇒ fora desta missão** |
| **D3** | **`/etc/paraguai/app.env`** | **ausente** (criado na Etapa A). `backup.env` existe e confirma o padrão de custódia (`640 root:paraguai`) | as chaves `ANON_KEY`/SERVICE_ROLE **já existem no host** em `/opt/supabase-stack/docker/.env` ⇒ **reaproveitáveis sem criar segredo novo**; `NEXT_PUBLIC_SITE_URL` é constante | 
| **D4** | **`CRON_SECRET` no VPS** | **não existe** no host (existe na Vercel/`app.env` futuro) | **criar/reutilizar é criar secret ⇒ precisa de autorização**; sem ele, as rotas de cron devolvem 401 (não quebra a navegação) |
| **D5** | `EXCHANGE_RATE_API_KEY` | ausente **em todo lugar** (causa de `exchange_rates` vazia, Mission 05.4) | não bloqueia a validação; bloqueia a funcionalidade de câmbio |
| **D6** | Imagens (`sharp` × imgproxy) | decidido: `unoptimized` por env (05.14 §5) | nenhuma ação pendente para a validação |
| **D7** | Endereço da API dentro do container | `NEXT_PUBLIC_SUPABASE_URL=https://api.fronteiraai.com` sai pelo **Caddy do próprio host** (hairpin via DNS público) | verificar no smoke; alternativa se falhar: usar `--add-host` ou o nome do serviço na rede `supabase_default` |

---

## 4. PLANO DE EXECUÇÃO NO VPS (comandos reproduzíveis — **não executados**)

```bash
# ── 0) PRÉ-REQUISITOS (uma vez, root) ────────────────────────────────────────
sudo install -d -o root -g root -m 0755 /srv/paraguai/isr-cache
sudo install -m 0600 -o root -g root /dev/null /etc/paraguai/app.env
#    preencher app.env (NOMES): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#    NEXT_PUBLIC_SITE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, EXCHANGE_RATE_API_KEY,
#    SELF_HOSTED_IMAGES_UNOPTIMIZED=1   -- reutilizar ANON/SERVICE do stack .env existente

# ── 1) CHECKOUT ISOLADO  (D1/D2: NUNCA tocar /opt/paraguai) ─────────────────
sudo install -d -o ubuntu -g ubuntu -m 0755 /opt/paraguai-app
#   (a) cópia por rsync/ssh da máquina de desenvolvimento, ou (b) clone autenticado
sudo -u ubuntu rsync -a --delete --exclude node_modules --exclude .next \
  daniel@<dev>:/caminho/repo/ /opt/paraguai-app/     # caminho (a)
#   conferir que /opt/paraguai permaneceu intacto:
ls -la /opt/paraguai | head -3 && sudo systemctl is-active paraguai-backup.timer

# ── 2) BUILD DA IMAGEM (isolada; janela calma; teto de memória) ─────────────
cd /opt/paraguai-app
sudo docker compose --env-file /etc/paraguai/app.env -f infra/selfhosted/app/docker-compose.app.yml build
sudo docker images | grep paraguai-web      # confirmar imagem criada
#   a imagem NÃO deve conter .env/chaves embutidas:
sudo docker run --rm --entrypoint sh paraguai-web:latest -c 'find / -maxdepth 4 -name ".env*" 2>/dev/null | head; echo BUSCA-FIM'

# ── 3) SUBIR SÓ O FRONTEND, SÓ EM LOOPBACK ──────────────────────────────────
sudo docker compose --env-file /etc/paraguai/app.env -f infra/selfhosted/app/docker-compose.app.yml up -d
sudo docker inspect paraguai-web --format 'health={{.State.Health.Status}} restarts={{.RestartCount}}'

# ── 4) SMOKE (localhost — NÃO chamar /api/cron/* exceto no passo 6) ─────────
for p in / /products "/search?q=perfume" "/lojas" /robots.txt /sitemap.xml \
         "/api/exchange/current" "/api/exchange/health"; do
  printf "%-28s %s\n" "$p" "$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3100$p")"; done
#   produto real (com e sem oferta pública) — pegar um slug do banco antes:
SLUG=$(sudo docker exec supabase-db psql -U postgres -X -q -At \
  -c "SELECT slug FROM products p WHERE EXISTS (SELECT 1 FROM offers o JOIN stores s ON s.id=o.store_id AND s.active WHERE o.product_id=p.id AND o.available) LIMIT 1;")
curl -sS -o /dev/null -w "product=%{http_code} t=%{time_total}s\n" "http://127.0.0.1:3100/product/$SLUG"
#   verificar que a API self-hosted responde a partir do container:
sudo docker exec paraguai-web sh -c 'wget -q -O /dev/null https://api.fronteiraai.com/rest/v1/ && echo api=ok || echo api=FAIL'

# ── 5) MEDIÇÃO DE RECURSOS (antes/depois) ───────────────────────────────────
sudo docker stats --no-stream paraguai-web
uptime; free -m | sed -n 2p; df -h / | tail -1
sudo docker exec supabase-db psql -U postgres -X -q -At -c \
 "SELECT count(*) FROM pg_stat_activity WHERE backend_type='client backend';"

# ── 6) TESTE ÚNICO do segredo de cron (opcional; dispara trabalho REAL) ─────
#   SOMENTE com aprovação; é a rota mais barata (refresh de câmbio, sem crawl)
curl -sS -o /dev/null -w 'cron=%{http_code}\n' \
  -H "Authorization: Bearer $(sudo grep -oP '^CRON_SECRET=\K.*' /etc/paraguai/app.env)" \
  http://127.0.0.1:3100/api/cron/exchange/refresh

# ── 7) ENCERRAR APENAS O FRONTEND (nunca o stack) ───────────────────────────
sudo docker compose -f infra/selfhosted/app/docker-compose.app.yml down
```

---

## 5. CRITÉRIOS DE SUCESSO E ROLLBACK

### 5.1 Critérios de sucesso (todos obrigatórios)

| # | Critério | Medida |
|---|---|---|
| S1 | Container **healthy** e **0 restarts** | `docker inspect --format '{{.State.Health.Status}} {{.RestartCount}}'` |
| S2 | Todas as rotas do smoke respondem **200** (home, catálogo, busca, produto com e sem oferta, lojas, robots, sitemap, APIs de câmbio) | laço `curl` do §4.4 |
| S3 | **Acesso à API self-hosted** funciona de dentro do container (D7) | `wget https://api.fronteiraai.com/rest/v1/` → 401 (esperado, sem chave = **conectividade OK**) |
| S4 | RAM do frontend dentro do teto (**< 1 GB**), com folga no host (> 2 GB livres) | `docker stats`, `free -m` |
| S5 | **Os 8 containers Supabase permanecem `healthy`**, com o mesmo uptime (nenhum reinício) | `docker ps` (baseline do §5.3) |
| S6 | **Nenhuma piora** nos contadores do banco (`PGRST003`, `57014`) e conexões **≤ 20** durante a validação | logs do PostgREST + `pg_stat_activity` |
| S7 | Nenhum erro de build/runtime novo no log do container | `docker logs paraguai-web` |
| S8 | A imagem **não contém** `.env*`/chaves | `find / -name '.env*'` dentro da imagem (§4.2) |

**Baseline de comparação (medido 14/10 15:30 UTC, antes de qualquer mudança)**: 8 containers
`Up 7 days (healthy)`; **13** conexões client; banco **380 MB**; `load average` **1,02 / 0,95 / 0,93**;
RAM **1.468 MB usada / 7.432**; disco **23 GB de 91 GB (26%)**.

### 5.2 Rollback (sempre apenas do frontend)

| Cenário | Ação |
|---|---|
| Falha no build | nenhum estado criado; corrigir e repetir (nenhum impacto) |
| Falha no `up`/healthcheck | `docker compose -f infra/selfhosted/app/docker-compose.app.yml down` |
| Consumo de RAM/CPU acima do esperado | `down` + ajustar limites no compose; o host nunca fica sem folga porque o teto é 1 GB/2 CPUs |
| **Sinal de contenção no banco** (`57014`/`PGRST003` crescendo, conexões subindo) | `down` **imediatamente** — é o risco principal (4 vCPU compartilhados) |
| Impacto em qualquer serviço existente | `down` do frontend e conferir `docker ps` + `systemctl is-active paraguai-backup.timer paraguai-healthcheck.timer` |

**Nada é irreversível**: nenhum dado é criado/alterado (o PostgreSQL não é tocado), o DNS não muda,
o Caddy não muda, e o `/opt/paraguai` de produção não é tocado.

### 5.3 O que NÃO fazer durante a validação

Não alterar `/opt/paraguai`; não tocar em `docker-compose.override.yml` do stack; não expor porta
fora do loopback; não customizar o Caddyfile; não chamar `/api/cron/connectors/sync` (dispara crawl
completo); não aplicar `revalidate` de 300 s em produtos/preços/câmbio.

---

## 6. GO / NO-GO

- **GO** para: a auditoria de segurança, o endurecimento do `.dockerignore`, a revisão das
  configurações e o **plano de validação** (tudo verificado por leitura + quatro gates locais
  executados nesta branch).
- **GO condicional** para executar a validação isolada no VPS: exige **(a)** autorização explícita
  (build e container são proibidos nesta missão), **(b)** definição do caminho de deploy (**D2**) e
  do checkout isolado (**D1**), **(c)** criação/uso do `app.env` (**D3/D4** — envolve reutilizar
  segredos existentes e definir o `CRON_SECRET`), e **(d)** janela com o proprietário disponível
  para acompanhar as medições.
- **NO-GO** para: construir/subir qualquer coisa no VPS agora, expor o app via Caddy/DNS, aplicar a
  política de cache de 300 s, criar secrets, executar crons, mesclar ou fazer deploy.
- **Limitação declarada**: o `Dockerfile`/compose continuam **não construídos e não executados**
  (sem Docker engine na máquina de desenvolvimento). O que validei: artefato `standalone` presente,
  contexto de build sem nenhum `.env*`, imagem final construída só de `/standalone + /static +
  public`, ausência de efeitos colaterais de inicialização, e os quatro gates locais — **não** afirmo
  que o container funciona; afirmo o que verifiquei.
