# MISSION 05.14 — FLUENCE VPS: PREPARAÇÃO DO FRONTEND

**Categoria**: `docs/operations/`
**Branch**: `mission-05-14-frontend-preparation` (a partir de `origin/main` = `c43538b`)
**Escopo**: preparação **isolada**. Nenhum container iniciado no VPS, nenhum pacote instalado em
produção, nenhum Docker/Caddy/DNS/secrets/banco/cron alterado, nenhum merge, nenhum deploy.
Stack Supabase e Mission 04 preservados integralmente (verificado: os arquivos da Mission 04 seguem
byte-idênticos ao snapshot).

---

## 1. ARQUIVOS PREPARADOS

| Arquivo | O que é | Estado |
|---|---|---|
| `Dockerfile` (raiz) | imagem multi-stage Node 22 + `output: "standalone"`; usuário não-root; `PORT=3100`; healthcheck por `wget` em rota **estática**; sem pacotes extras | criado (não construído em produção) |
| `.dockerignore` (raiz) | **crítico de segurança**: sem ele, `COPY . .` gravaria `.env.local` e `.env.local.legacy-rollback` — com a `NEXT_PUBLIC_SUPABASE_ANON_KEY` e a **`SUPABASE_SERVICE_ROLE_KEY`** — dentro de uma camada da imagem | criado |
| `infra/selfhosted/app/docker-compose.app.yml` | compose **isolado** do stack Supabase: limites de CPU/RAM, `restart: unless-stopped`, healthcheck, cache ISR persistente, log com rotação, porta só em loopback | criado |
| `next.config.ts` (modificado) | `output: "standalone"` + `images.unoptimized` **ligado por variável de ambiente** (`SELF_HOSTED_IMAGES_UNOPTIMIZED`), ausente na Vercel ⇒ comportamento de produção inalterado | modificado |

O compose fica em `infra/selfhosted/app/` — **separado** do `docker-compose.override.yml` do stack
Supabase, porque a migração não deve tocar em nada que já está saudável.

---

## 2. COMPATIBILIDADE E RESULTADOS DOS TESTES

### 2.1 Auditoria de compatibilidade (tarefa 5 — por leitura de código, com evidência)

| Verificação | Resultado | Implicação |
|---|---|---|
| **Server Actions** (`"use server"`) | **nenhuma ocorrência** | não há dependência de infraestrutura da Vercel para ações; nenhuma chave de criptografia de ação a gerenciar |
| **APIs específicas da Vercel** | apenas 3 referências **informativas**: `VERCEL_ENV` num endpoint de health e `process.env.VERCEL === "1"` em `lib/env.ts` (só escolhe o texto da mensagem de erro) | zero acoplamento funcional |
| `@vercel/*` / `runtime = "edge"` / `waitUntil` / `after` | **nenhuma ocorrência** | o runtime Node do container cobre 100% das rotas |
| Rotas dinâmicas (SSR) | `/product/[slug]`, `/products`, `/search` são `ƒ` por natureza (dados) | funcionam em Node sem adaptação |
| ISR | `app/page.tsx` com `revalidate = 60`; `app/sitemap.ts` e `app/lojas/page.tsx` com `force-dynamic` | o cache ISR é **em disco** ⇒ exige o volume persistente (já no compose) |
| API Routes | 130+ rotas sob `app/api/**`, todas Node | sem adaptação |
| `next/image` | 9 arquivos usam; **`sharp` não é dependência** | sem `sharp`, o otimizador devolveria 500 ⇒ resolvido por `images.unoptimized` ligado por env (ver §5) |
| `cookies()`/`headers()` | 1 uso | baixo risco de forçar renderização dinâmica inesperada |
| Engines | `node >= 20.18.0` | Node 22 do estágio base satisfaz |
| Redis/Vercel KV/Blob/Edge Config | **nenhum uso** | cache e estado são locais (disco) — instância única, sem necessidade de cache compartilhado |
| **Migrations/seed no build** | o build **não** roda banco (verificado: `npm run build` = `next build`) | o container não precisa de acesso ao PostgreSQL no build |

### 2.2 Gates executados nesta branch

| Gate | Resultado |
|---|---|
| ESLint | ✅ **0 erros** (1 warning pré-existente em `scripts/comparison-forensics-audit.ts:19`) |
| TypeScript (`tsc --noEmit`) | ✅ PASS |
| Testes | ✅ **187/187 suítes · 1409/1409 testes** |
| Build Next.js | ✅ **exit code 0**, `Compiled successfully`, 150/150 páginas estáticas |
| **Artefato standalone** | ✅ **`.next/standalone/server.js` existe** e `.next/static` presente — é exatamente o que o `Dockerfile` copia |
| Build da imagem Docker | ⚠️ **NÃO executado** — não há Docker engine na máquina de desenvolvimento (verificado em missão anterior). Declaro a limitação; a Etapa A inclui o comando de build para rodar no VPS **após autorização** |

---

## 3. POLÍTICA DE CACHE RECOMENDADA (proposta — **não aplicada**; freshness de produção inalterada)

Regra-mãe: **nada de TTL arbitrário para preço/câmbio**. Onde há valor monetário, a invalidação é
**por evento** (fim do sync do conector / refresh de câmbio), não por tempo.

| Classe | Exemplos | Frescor proposto | Mecanismo | Por quê |
|---|---|---|---|---|
| **Institucional** | `/privacidade`, `/termos`, `/para-lojistas`, `/categorias` | 24 h | ISR | conteúdo muda raramente; hoje são dinâmicas e pagam SSR a cada hit |
| **Descoberta / catálogo** | `/products` (sem filtro), `/lojas` | **300 s** | ISR + `generateStaticParams` opcional | listagem muda com o sync; 5 min é imperceptível para o consumidor e corta a maior fatia de invocações |
| **Páginas de produto** | `/product/[slug]` | **300 s** + `revalidateTag` no fim do sync | ISR por rota + invalidação por evento | preço muda no sync, não a cada segundo; o evento de sync é o gatilho correto |
| **Preço exibido** | valores dentro de `/product/[slug]`, `/products` | **invalidado por evento** (tag do sync) | `revalidateTag('catalog')` disparado pelo sync | cumpre a regra da missão: sem TTL arbitrário para preço |
| **Câmbio** | `exchange_rates` lido por `/product/[slug]` e home | **60 s com invalidação por evento** do refresh | cache de dado + `revalidateTag('exchange')` | o refresh roda a cada 5 min; o TTL só limita o pior caso |
| **Busca** | `/search?q=…` | **dinâmico, sem cache** + `noindex` | SSR sob demanda | query strings infinitas; cachear seria inútil e o crawl deve ser desencorajado |
| **Filtros/paginação profundos** | `/products?category=…&page=12` | cache curto **ou** `noindex` | ISR 300 s / meta robots | é o padrão que o crawler percorre; sem controle, cada combinação é uma invocação |
| **Saúde/SEO técnico** | `/robots.txt`, sitemaps, `/api/*/health` | estático/ISR longo | `revalidate` alto | **o healthcheck do container usa `/robots.txt`** justamente para não tocar SSR/banco |

**Impacto esperado**: é a maior alavanca de **invocações** identificada na Mission 05.12 (75% dos
requests de CDN invocam função; só a home tem ISR hoje). **Não quantifico** a redução sem medição
após implantar — e a política precisa de aprovação porque toca frescor percebido.

---

## 4. RECURSOS ESTIMADOS

| Recurso | Estimativa | Base |
|---|---|---|
| RAM de runtime | **150–350 MB** típico, teto **1 GB** | tamanho da imagem + padrão Next standalone; teto folgado contra os 5,5 GB disponíveis |
| CPU | teto **2,0 cores** | 4 vCPU compartilhados com PostgreSQL; o teto evita que o SSR faminto de CPU esmague o banco (risco medido na 05.12) |
| Pico do **build** | **1,5–2,5 GB** (transitório) | build local levou ~12 s de compilação + 9 s de geração; o pico de memória do `next build` é a variável crítica ⇒ build com `--memory 2g`, em janela calma, com os 4 GB de swap como rede |
| Disco — imagem | ~**250–400 MB** | `node:22-alpine` + `.next/standalone` + estáticos (o `node_modules` mínimo do standalone é bem menor que o de desenvolvimento) |
| Disco — cache ISR | **100–500 MB** (cresce e estabiliza) | HTML+data de ~6 mil páginas de produto **se** forem cacheadas; hoje a produção é dinâmica, então este é o cenário-alvo, não o medido |
| Disco disponível | 68 GB | `df -h` (Mission 05.13) — folga larga |
| Transferência | não medida no VPS | a API e as imagens passam a sair pelo Caddy do VPS, sem franquia da Vercel |

---

## 5. DECISÃO DE IMAGENS: `sharp` × `imgproxy` (tarefa 4)

| Opção | Custo/risco |
|---|---|
| **A. Adicionar `sharp`** | +~30 MB na imagem, +dependência nativa (build por plataforma), **+CPU por imagem** nos 4 vCPU que o Postgres usa, +disco de cache de imagens (`.next/cache/images`) |
| **B. `images.unoptimized` ligado por env** (**implementado na branch**) | **zero CPU de imagem**, zero dependência nova, zero risco de 500 por falta de `sharp`. Perde-se redimensionamento/formato automático: as imagens saem na resolução original do Storage |
| **C. Custom loader → Supabase `/render/image` (imgproxy do stack)** | reaproveita a infra **que já roda e já é monitorada**, otimização fora do app (CPU no container do imgproxy, que tem teto próprio), mantém formatos/redimensionamento. Exige `loaderFile` (código novo) + passthrough para imagens **externas** (logos de loja fora do Storage não são proxáveis) + verificação visual das 9 telas |

**Recomendação de menor risco: B agora (já preparado), C como evolução aprovada à parte.**
Justificativa: B é reversível por uma variável de ambiente, não adiciona dependência nem CPU, e
remove um bloqueio de runtime (sem `sharp` as imagens devolveriam 500). C é tecnicamente melhor
(imagens menores = menos banda e melhor LCP), mas altera URLs de imagem em 9 telas e precisa de
validação visual — não é o que se quer no meio de uma recuperação de serviço. **A não é recomendada
enquanto a contenção de CPU app×banco for o risco principal do host.**

---

## 6. VARIÁVEIS DE AMBIENTE (sem segredos no Git)

Arquivo de destino **fora do repositório**: `/etc/paraguai/app.env` (`root:root 0600`, lido pelo
`env_file` do compose). O `.dockerignore` bloqueia `.env*` — segredo **nunca** entra em camada de
imagem. Template (valores reais preenchidos pelo proprietário no VPS):

```dotenv
# ── BUILD-TIME (o Dockerfile recebe como build args; vão "inlined" no bundle) ──
NEXT_PUBLIC_SUPABASE_URL=https://api.fronteiraai.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key self-hosted>
NEXT_PUBLIC_SITE_URL=https://www.fronteiraai.com

# ── RUNTIME ──
SUPABASE_SERVICE_ROLE_KEY=<service role self-hosted>     # ignora RLS: só no servidor
CRON_SECRET=<segredo compartilhado das rotas /api/cron/*>
EXCHANGE_RATE_API_KEY=<chave do provedor de câmbio>       # hoje AUSENTE também na Vercel (05.4)
OPEN_EXCHANGE_RATES_APP_ID=<failover opcional>

# ── Opcionais (analytics/SEO; vazios = recurso desligado) ──
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_CLARITY_PROJECT_ID=
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
NEXT_PUBLIC_BING_SITE_VERIFICATION=

# ── Ligado APENAS no VPS (muda next.config.ts: imagens sem otimizador) ──
SELF_HOSTED_IMAGES_UNOPTIMIZED=1
```
**Nenhum segredo foi criado, copiado ou versionado nesta missão.**

---

## 7. ETAPA A — COMANDOS EXATOS (para aprovação posterior; **não executados**)

```bash
# 0) Pré-requisitos (uma vez, como root) — cria apenas diretório e arquivo de ambiente VAZIO
sudo install -d -o root -g root -m 0755 /srv/paraguai/isr-cache
sudo install -m 0600 -o root -g root /dev/null /etc/paraguai/app.env
#    -> preencher /etc/paraguai/app.env com os valores do §6 (o proprietário preenche)

# 1) Código da branch preparada no VPS
cd /opt/paraguai && sudo git fetch origin && sudo git checkout mission-05-14-frontend-preparation

# 2) Build (janela calma; teto de memória explícito + swap como rede)
sudo docker compose --env-file /etc/paraguai/app.env \
  -f infra/selfhosted/app/docker-compose.app.yml build

# 3) Subir SOMENTE em loopback (nada muda para o usuário; DNS/Caddy intocados)
sudo docker compose --env-file /etc/paraguai/app.env \
  -f infra/selfhosted/app/docker-compose.app.yml up -d

# 4) Smoke local (sem DNS, sem Caddy)
for p in / /products "/search?q=perfume" /robots.txt /api/exchange/current; do
  printf "%-28s %s\n" "$p" "$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3100$p")"
done
curl -sS -o /dev/null -w 'cron=%{http_code}\n' \
  -H "Authorization: Bearer $(sudo grep -oP '^CRON_SECRET=\K.*' /etc/paraguai/app.env)" \
  http://127.0.0.1:3100/api/cron/exchange/refresh

# 5) Recursos e log (medir ANTES de qualquer cutover)
sudo docker stats --no-stream paraguai-web
sudo docker inspect paraguai-web --format '{{.State.Health.Status}} restarts={{.RestartCount}}'
sudo docker logs --tail 80 paraguai-web
uptime; free -m; sudo docker exec supabase-db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 6) Rollback da Etapa A (a qualquer momento, sem afetar nada existente)
sudo docker compose -f infra/selfhosted/app/docker-compose.app.yml down
```

**Monitoramento contínuo (proposto, não aplicado)**: incluir `paraguai-web` na lista fixa do wrapper
privilegiado `paraguai-container-status` (hoje monitora só o stack Supabase) e observar
`docker stats` + `journalctl -u docker`; alertar se `57014`/`PGRST003` crescerem durante a Etapa A
(sinal de contenção app×banco).
**Rollback da migração inteira**: `docker compose down` + reverter DNS/Caddy (Mission 05.13 §6).
Nenhum dado é afetado — o PostgreSQL não é tocado.

---

## 8. RISCOS PENDENTES

| Risco | Severidade | Mitigação preparada |
|---|---|---|
| **Contenção de CPU app×PostgreSQL** (4 vCPU) | **Alta** | teto `cpus: 2.0` + `memory: 1G`; política de cache (§3) como pré-requisito do cutover; medição obrigatória na Etapa A |
| Pico do `next build` competindo com o banco | Média | build com teto, janela calma, swap de 4 GB |
| Imagens sem otimização (opção B) | Média | reversível por variável; evolução C (imgproxy) documentada com trade-offs |
| Cache ISR frio no primeiro boot (rajada de regenerações) | Média | volume persistente; subir em loopback e aquecer antes do cutover |
| Segredos no build (`NEXT_PUBLIC_*`) vs runtime | Média | separação explícita no §6; `.dockerignore` bloqueia `.env*`; `--env-file` no build |
| `EXCHANGE_RATE_API_KEY` ausente (câmbio em fallback) | Média | preencher no `app.env` durante a Etapa A (resolve também o achado da Mission 05.4) |
| Ausência de teste real do container | Média | **declarada**: sem Docker engine local; o build da imagem é parte da Etapa A |
| Mission 04 não resolvida | Baixa | o deploy usa `origin/main`; nada aqui depende dela |
| `git checkout` da branch no `/opt/paraguai` do VPS | Baixa | é o repo de infra; conferir antes se contém trabalho local (não verificado nesta missão) |

---

## 9. GO / NO-GO

- **GO** para: os arquivos preparados (Dockerfile, `.dockerignore`, compose isolado, `next.config.ts`
  com standalone + imagens por env), a auditoria de compatibilidade, a política de cache proposta e
  os procedimentos da Etapa A — tudo **verificado por leitura** e pelos quatro gates locais.
- **GO condicional** para executar a Etapa A no VPS: exige (a) **autorização explícita** (criar
  container é proibido sem ela), (b) decisão de imagens (§5 — B já implementado; C opcional),
  (c) política de frescor/cache aprovada (§3) e (d) janela acordada. O cutover de DNS continua
  **NO-GO** até a Etapa A ser medida.
- **NO-GO** para: construir/subir o container agora, alterar Docker/Caddy/DNS, criar secrets,
  executar crons, mesclar ou fazer deploy — nada disso foi feito.
- **Limitação declarada**: o `Dockerfile` e o compose **não foram construídos nem executados**, por
  ausência de Docker engine na máquina de desenvolvimento. O que validei é o que sustenta o
  Dockerfile: build **exit 0**, artefato `.next/standalone/server.js` presente, `.next/static`
  presente, `npm ci` viável (`package-lock.json` presente), ausência de Server Actions/edge, e o
  runtime Node cobrindo todas as rotas. Não afirmo que "funciona"; afirmo o que verifiquei.
