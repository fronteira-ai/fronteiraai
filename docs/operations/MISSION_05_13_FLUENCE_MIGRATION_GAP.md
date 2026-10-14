# MISSION 05.13 — VERCEL → FLUENCE VPS: GAP DE MIGRAÇÃO

**Categoria**: `docs/operations/`
**Branch**: `mission-05-13-fluence-migration-gap` (a partir de `origin/main` = `c43538b`)
**Produção**: **read-only**. Nenhuma alteração de DNS, Docker, Caddy, secrets, banco ou cron; nenhum serviço iniciado; nenhum deploy. Mission 04 preservada (byte-idêntica).
**Natureza**: inventário + diagnóstico + configuração proposta. **Nada aplicado.**
**Vistoria**: 2026-10-14 15:00 UTC · VPS `94.103.168.244` (Fluence) · arquivos de config do repositório.

---

## 1. O QUE JÁ ESTÁ MIGRADO (`JÁ OPERACIONAL NO VPS`)

| Componente | Estado verificado | Evidência |
|---|---|---|
| **Stack Supabase self-hosted completo** | 8 containers `Up 7 days (healthy)`: `db` (postgres 17.6.1.136), `rest` (PostgREST v14.12), `kong` 3.9.3, `auth` (GoTrue), `storage`, `imgproxy`, `meta`, `studio` | `docker ps` |
| **PostgreSQL** | 127.0.0.1:5432 (nunca público), limites: 3 GB RAM; 485 MB de dados | `ss -ltnp`, `du` |
| **API pública** | `api.fronteiraai.com` → Caddy → Kong (127.0.0.1:8000); respondeu **401** (sem chave) na Mission 05.11 — saudável | `curl`, Caddyfile |
| **TLS/ACME** | Caddy v2.11.4 em `*:80`/`*:443`, emissão automática, `admin off` (hardening) | `ss`, `/etc/caddy/Caddyfile` |
| **Studio** | 127.0.0.1:3000 (loopback + Basic Auth via proxy) | `ss`, compose |
| **Backup** | `paraguai-backup.timer` **active** (3 dias, 03:30 UTC, retenção 10) | `systemctl list-timers` |
| **Monitoramento** | `paraguai-healthcheck.timer` **active** (horário) + wrapper privilegiado de status | `systemctl`, timers |
| **Storage de imagens** | 1,1 GB em `/srv/paraguai/storage`; `imgproxy` operacional | `du`, `docker ps` |
| **Git no host** | repo de infra em `/opt/paraguai`; `git 2.34.1`; Docker **29.7.2** + `docker compose` | `--version` |
| **Segurança** | PostgreSQL só em loopback; Kong/Studio só em loopback; só 22/80/443 expostos | `ss -ltnp` |

**Componentes `COMPARTILHADOS`** (usados pelo frontend na Vercel **e** já hospedados no VPS):
a API (`api.fronteiraai.com` → Kong → PostgREST → PostgreSQL), o Storage de imagens e o
`imgproxy`. O frontend consome esses três por HTTPS com a anon key — **nada disso precisa ser
reinstalado ou duplicado** (e não foi).

**`NÃO CONFIRMADO` / divergência que precisa de correção no registro da missão**: o container
**`dreamy_hodgkin` NÃO EXISTE mais** neste host (`docker inspect` → não encontrado; apenas 8
containers, todos do stack Supabase; `docker volume ls` só tem `supabase_db-config`). Ele já estava
ausente na Mission 05.4 (30/Set → 07/Out). **Não há o que preservar** — nenhuma ação minha o
removeu; registrar como resolvido.

---

## 2. O QUE FALTA MIGRAR (`AINDA DEPENDENTE DA VERCEL`)

| # | Componente | Situação hoje | O que a migração exige |
|---|---|---|---|
| **M1** | **Frontend Next.js 16.2.9** (SSR, Server Components, ISR, API Routes, Server Actions) | na Vercel, **suspenso** (402 `DEPLOYMENT_DISABLED`) desde 12/10 22:00 UTC | processo Node servindo `next` no VPS + proxy no Caddy |
| **M2** | **Domínios `www.fronteiraai.com` e `fronteiraai.com`** | apontam para a Vercel (Cloudflare em modo DNS-only) | registros A/AAAA passam a apontar para o VPS + bloco novo no Caddyfile + certificado novo |
| **M3** | **Gatilhos de cron da Vercel** (`vercel.json`: `connectors/sync` 06:00, `marketplace-operations/snapshot` 07:00, `canonical-catalog/outbox-maintenance` 03:00) + os de alta frequência via **GitHub Actions** (`exchange/refresh` */5; `market-pulse`, `buyer-alerts`, `merge-suggestions`, `connectors/sync` */15) | só a Vercel dispara os diários; os do Actions apontam para `CRON_APP_URL` | 3 systemd timers (diários) no VPS apontando para `127.0.0.1:<porta>/api/cron/*`; os do Actions passam a apontar para o domínio novo — **as rotas já são portáveis** (auth por `CRON_SECRET`, zero acoplamento à Vercel) |
| **M4** | **Variáveis de ambiente e segredos** (11 no `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `EXCHANGE_RATE_API_KEY`, `OPEN_EXCHANGE_RATES_APP_ID`, 3 IDs de analytics/SEO) | 5 delas existem **apenas** no escopo Production da Vercel (verificado na Mission 05.3); as de câmbio **não existem em lugar nenhum** (causa de `exchange_rates` vazia, Mission 05.4) | arquivo de ambiente no VPS (dono `root`, modo 0640, fora do Git — mesmo padrão de `/etc/paraguai/backup.env`) |
| **M5** | **Build e deploy** | `git push` → build na Vercel | build em container (multi-stage) + script de deploy (`git pull` + `docker build` + `compose up -d`) + unidade systemd de execução com restart automático |
| **M6** | **Otimização de imagens (`next/image`)** | otimizador de borda da Vercel | **`sharp` não é dependência do projeto** (`package.json` verificado) ⇒ no self-hosted o otimizador precisa de `sharp` no container **ou** roteamento para o **`imgproxy` que já roda no VPS** (reaproveitamento) |
| **M7** | **Cache ISR / data cache** | cache gerenciado pela Vercel | volume persistente para `.next/cache` (instância única ⇒ cache em disco é suficiente; **não** há multi-instância aqui) |
| **M8** | **Observabilidade de runtime** | Vercel Analytics/Logs | `journalctl` + o healthcheck já existente; sem Prometheus/Grafana (coerente com a decisão da Sprint 16) |

> Nada do Supabase, PostgreSQL, Kong, Auth, Storage, imgproxy, APIs ou crons existentes é tocado.

---

## 3. CAPACIDADE DISPONÍVEL DO VPS (medido em 14/10 15:00 UTC)

| Recurso | Total | Em uso | Disponível | Observação |
|---|---|---|---|---|
| **CPU** | **4 vCPU** | load average **0,83 / 0,91 / 0,90** (~22%) | ~3 vCPU ociosos | `nproc` |
| **RAM** | 7.432 MB | 1.412 MB | **5.567 MB disponíveis** (5.605 em buff/cache) | `free -m` |
| **Swap** | **4 GB** (`/swapfile`) | 1 MB | ~4 GB | `swapon` — existe swap (contraria suposição anterior) |
| **Disco** | 91 GB | 23 GB (26%) | **68 GB** | `df -h` |
| Limites dos containers | db 3 GB · storage 768 MB · rest/kong/studio 512 MB · auth 384 MB · meta/imgproxy 256 MB | soma de limites ≈ **6,1 GB** | — | `docker inspect` |

**Veredito de capacidade**: hospedar o frontend é **viável**, com folga de RAM e disco.

- **Runtime do frontend**: container Node (SSR) com teto sugerido de **768 MB–1 GB** — sobra RAM
  mesmo no pior caso (5,5 GB disponíveis).
- **Build**: o `next build` é o pico (tipicamente 1,5–2,5 GB). Cabe, mas deve rodar **com teto
  explícito** (`--memory 2g`) e em janela calma; o swap de 4 GB é a rede de segurança.
- **⚠️ Contenção de CPU é o risco real, não a RAM**: o VPS tem 4 vCPU **compartilhados com
  PostgreSQL/PostgREST**. A auditoria da Mission 05.12 mostrou que o frontend é **CPU-bound**
  (75% dos requests de CDN invocam função; 72 ms de CPU por invocação). Colocar SSR dinâmico no
  mesmo host do banco faz crawler e banco competirem pelos mesmos 4 núcleos. **Mitigação
  obrigatória**: ISR/cache nas rotas de consumo (P1 da Mission 05.12) **antes** ou junto do
  cutover; sem isso, a migração troca um problema de quota (Vercel) por um problema de contenção
  local.
- **`NÃO CONFIRMADO`**: desempenho sob carga real de crawler no VPS (não fiz teste de carga contra
  produção, por proibição explícita). Medição proposta no §6.

---

## 4. ALTERAÇÕES NECESSÁRIAS (configuração isolada **proposta**, não aplicada)

**Conflito de porta a resolver primeiro**: `supabase-studio` já ocupa **127.0.0.1:3000**. O
frontend deve subir em **127.0.0.1:3100** (ou o studio mudar de porta — fora do escopo).

### 4.1 `Dockerfile` (multi-stage, no repo do app) — proposto
```dockerfile
# builder: precisa de todos os arquivos do repo (o app tem imports em src/, services/, types/)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3100 HOSTNAME=0.0.0.0
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3100
CMD ["npm", "run", "start"]
```
> Requer `next.config.ts` com `output: "standalone"` (recomendado; reduz a imagem) **ou** manter
> `npm start` como acima. `sharp` continua pendente (M6) — sem ele, `next/image` degrada.

### 4.2 `infra/selfhosted/app/docker-compose.app.yml` (isolado, não mexe no stack Supabase)
```yaml
services:
  frondeiraai-web:
    build: ../../../            # raiz do repo do app
    container_name: paraguai-web
    restart: unless-stopped
    env_file: /etc/paraguai/app.env          # root:paraguai 0640, fora do Git
    ports:
      - "127.0.0.1:3100:3100"
    volumes:
      - /srv/paraguai/isr-cache:/app/.next/cache   # cache ISR persistente
    deploy:
      resources:
        limits:
          memory: 1G
```
> Arquivo **separado** do `docker-compose.override.yml` do stack Supabase: a migração não deve
> tocar no que já está saudável.

### 4.3 `Caddyfile` — bloco adicional (sem alterar o de `api.`)
```caddy
www.fronteiraai.com, fronteiraai.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3100
}
```

### 4.4 Timers systemd (substituem os crons da Vercel)
```ini
# paraguai-cron-daily.timer -> 03:00, 06:00, 07:00 UTC (3 units ou 1 unit com script)
[Timer]
OnCalendar=*-*-* 03:00:00 UTC    # canonical-catalog/outbox-maintenance
OnCalendar=*-*-* 06:00:00 UTC    # connectors/sync
OnCalendar=*-*-* 07:00:00 UTC    # marketplace-operations/snapshot
```
Executando `curl -sS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3100/api/cron/<rota>`
— exatamente os mesmos endpoints que a Vercel dispara hoje (contrato inalterado).

### 4.5 O que **não** muda
Supabase/PostgreSQL/Kong/Auth/Storage/imgproxy/backup/healthcheck, o bloco `api.fronteiraai.com`,
a porta 3000 do Studio, os secrets existentes e o banco.

---

## 5. RISCOS E DEPENDÊNCIAS

| Risco | Severidade | Mitigação |
|---|---|---|
| **Contenção CPU app × Postgres** no mesmo host de 4 vCPU | **Alta** | ISR/cache antes do cutover (P1/05.12); teto de CPU/memória no container; monitorar load e `57014` durante o cutover |
| **Pico de memória do `next build`** co-localizado com Postgres (limite 3 GB) | Média | build com teto de 2 GB, em janela calma; swap de 4 GB como rede |
| **`sharp` ausente** ⇒ `next/image` sem otimização | Média | adicionar `sharp` à imagem **ou** apontar o loader para o `imgproxy` já existente (decisão a aprovar) |
| **Cache ISR é local**: em cutover/rollback o cache começa frio ⇒ rajada de regenerações | Média | volume persistente + `revalidate` explícito; aceitar regeneração inicial em janela calma |
| **TLS/DNS**: emissão de certificado novo para `www`/apex depende do DNS já apontar para o VPS | Média (operacional) | ordem do cutover no §6 (DNS primeiro, Caddy emite em seguida); manter o registro antigo em TTL baixo para rollback |
| **Segredos passam a viver também no VPS** | Média | `root:paraguai 0640` fora do Git (padrão já usado em `/etc/paraguai/backup.env`); nunca versionar |
| **Cron: transferir 3 diários + 7 do Actions** | Baixa | rotas portáveis por desenho (`CRON_SECRET`); testar com `curl` local antes de desligar os gatilhos antigos |
| **Mission 04 não resolvida** (alterações locais em `app/sitemap.ts` etc.) | Baixa | não afeta a migração; apenas lembrar que o deploy do VPS usará `origin/main` |
| **Sem teste de carga** (proibido contra produção) | Média (validação) | medir pós-cutover com métricas reais (load, `57014`, TTFB) e rollback preparado |
| **`dreamy_hodgkin`** | Nenhuma | já não existe; nada a preservar (§1) |
| Teste local da config | Média (validação) | **Docker engine não está disponível na máquina de desenvolvimento** (verificado) e **Node não está instalado no VPS** ⇒ o Dockerfile/compose **não puderam ser executados localmente**; declaro esta limitação em vez de afirmar que "funciona" |

---

## 6. PLANO DE IMPLANTAÇÃO SEM PERDA DE DADOS

**Nenhum dado vive no frontend** — todo o estado está no PostgreSQL self-hosted, que **não é
tocado** por esta migração. Por construção, não há risco de perda de dados; o risco é de
**indisponibilidade** durante o cutover.

**Fase A — preparação (sem afetar produção)**
1. Criar `/srv/paraguai/isr-cache` e `/etc/paraguai/app.env` (0600/0640, fora do Git).
2. Construir a imagem **no VPS** (build com teto de 2 GB, janela calma) e subir o container em
   `127.0.0.1:3100` — **sem tocar no DNS**, acessível só por loopback.
3. Smoke local no próprio VPS: `curl -H "Host: localhost" http://127.0.0.1:3100/` (200),
   `/products`, `/search`, `/product/<slug>`, `/api/cron/exchange/refresh` com o segredo.
4. Criar os timers diários e testar cada rota por `curl` (sem desativar os da Vercel ainda).

**Fase B — cutover de domínio (reversível)**
5. Adicionar o bloco do Caddy para `www`/apex **apontando para 3100** e recarregar o Caddy
   (`systemctl restart caddy` — o reload está neutralizado por hardening). Nada muda para o
   usuário ainda, porque o DNS não aponta para cá.
6. Baixar o TTL do DNS e **trocar os registros** de `www`/apex para o IP do VPS. Verificar emissão
   do certificado e `curl -I https://www.fronteiraai.com/`.
7. Validar: home, listagem, busca, página de produto (com e sem oferta pública), loja, sitemap,
   robots, redirecionamento 308 de `/store/:slug`, e o **caminho de escrita** (analytics/favoritos)
   contra a API self-hosted.
8. Repontar `CRON_APP_URL` (GitHub Actions) para o domínio novo e manter os 3 timers locais.

**Fase C — rollback (a qualquer momento)**
9. Reverter os registros DNS para a Vercel (ainda existente: o deployment antigo segue lá, hoje
   desabilitado por quota) **ou** reverter o Caddy para não servir o app. Como nada no banco mudou,
   o rollback é só de roteamento e leva minutos.

**Fase D — medição pós-cutover**
10. Acompanhar load do VPS, `57014`/`PGRST003`, TTFB e taxa de cache hit por 24–48 h; **só então**
    considerar a migração estável.

---

## 7. APROVAÇÕES NECESSÁRIAS

1. **Autorizar a migração complementar do frontend** (a Vercel está suspensa; sem isso o site
   continua fora do ar).
2. **Decidir o destino da Vercel**: manter o projeto (para rollback), desativar ou remover — e
   **não contratar Pro** (proibido nesta missão).
3. **Decidir M6** (imagens): adicionar `sharp` à imagem **ou** usar o `imgproxy` existente.
4. **Política de frescor/ISR** (P1 da Mission 05.12) — pré-requisito de capacidade (§3).
5. **Janela de cutover** de DNS e autorização explícita para alterar DNS/Caddy/Docker.
6. **Segredos no VPS**: aprovar a criação de `/etc/paraguai/app.env` (custódia root:paraguai).
7. **Mission 04**: definir o destino das alterações não commitadas antes de qualquer deploy.

---

## 8. GO / NO-GO

- **GO** para: o inventário, o diagnóstico de capacidade, a configuração proposta e a Fase A de
  preparação (container em loopback, sem DNS) — **mediante autorização**, porque mesmo a Fase A
  cria um serviço novo no VPS (proibido "iniciar novos serviços em produção" sem aprovação).
- **GO condicional** para o cutover: seguro **após** (a) autorização explícita, (b) decisão sobre
  `sharp`/imagens, (c) plano de frescor/ISR para conter a contenção de CPU, e (d) janela acordada.
- **NO-GO** para: executar qualquer parte agora, contratar Vercel Pro, ou duplicar Supabase/Postgres/
  Kong/Auth/Storage/APIs/crons — nada disso é necessário e nada disso foi tocado.
- **Bloqueio declarado**: o Dockerfile/compose **não foram executados nem testados** (sem Docker
  engine na máquina de desenvolvimento; sem Node no VPS) — a configuração é uma **proposta
  verificada por leitura**, não um artefato testado. Não afirmo que funciona; afirmo o que verifiquei.
