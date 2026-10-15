# MISSION 05.27 — CONTROLLED PUBLIC CUTOVER

**Categoria**: `docs/operations/`
**Branch**: `mission-05-27-public-cutover` (base `mission-05-26-exchange-cron-activation` @ `c610218`)

## RESULTADO: PARADO NA PRÉ-CONDIÇÃO OBRIGATÓRIA — **sem acesso administrativo ao Cloudflare nem ao GitHub**.

A missão determina: *"Antes de executar qualquer mudança pública: verificar acesso administrativo ao Cloudflare e GitHub, estado do DNS, certificados, versão implantada e plano de rollback. **Se faltar acesso ou alguma condição de segurança, parar.**"* Falta acesso ⇒ **parei antes de qualquer mudança pública**. Nada em Caddy, DNS ou GitHub Actions foi alterado; o frontend continua **exclusivamente em loopback**; o Supabase e os 9 containers intactos; Mission 04 preservada; `origin/main` = `c43538b`; nenhum merge.

---

## 1. Baseline (item 1)

| Métrica | Valor |
|---|---|
| Containers | **9 `healthy`** (`paraguai-web` Up 7 h · `supabase-kong` Up 6 h · 8 Supabase Up 8 days) |
| Conexões PostgreSQL | **5** |
| `PGRST003` / `57014` | **67 / 1.169** |
| **Kong — memória** | **437,1 MiB / 768 MiB (57%)** — ver §5 |
| **Câmbio (idade)** | **00:04:47** — a atualização automática da Mission 05.26 está **funcionando sozinha**, com o timer `active` ✅ |
| Versão implantada | `paraguai-web:7aef04b` (351/352 MB, healthy, rollback armado) |

## 2. Verificação de acesso (a pré-condição que falhou)

| Verificação | Resultado |
|---|---|
| `gh` (CLI GitHub) | **AUSENTE** |
| `flarectl` / `cloudflared` | **AUSENTE** / **AUSENTE** |
| Credenciais Cloudflare/GitHub no ambiente (nomes) | **nenhuma** |
| No host `/etc/paraguai/*` | apenas **`rclone.conf`** (backup para Cloudflare **R2** — armazenamento, **não** DNS; e não é credencial de DNS) |
| `dig` | ausente (apenas `nslookup`) |

**Consequências objetivas**:
- **Item 6 é impossível**: não tenho como alterar registros DNS no Cloudflare; criar/derivar uma credencial de API para isso seria “criar secret” — fora da autorização.
- **Item 9 é impossível por regra da própria missão**: "*Não considerar uma alteração em branch isolada como desativação*". Desativar o `schedule:` do workflow exige **push em `main`** (explicitamente proibido sem autorização separada) ou acesso à API/UI do GitHub (**ausente**). Portanto **o agendamento antigo permanece ativo** — e a evidência de que isso **não** gera duplicação segue valendo: `api.fronteiraai.com/api/cron/exchange/refresh` → **401** (Kong/PostgREST, não alcança o app) e `www.fronteiraai.com/...` → **402** (Vercel suspensa) ⇒ o workflow não tem caminho até este frontend.

## 3. Estado do DNS (item 6, "antes" — read-only)

| Host | Resolve para | Veredito |
|---|---|---|
| `fronteiraai.com` | **64.29.17.1, 216.198.79.1** | **Vercel** (anycast) — precisa mudar para o VPS |
| `www.fronteiraai.com` | **64.29.17.65, 216.198.79.65** | **Vercel** — precisa mudar para o VPS |
| `api.fronteiraai.com` | **94.103.168.244** | ✅ correto (VPS) — **não tocar** |

**Sem conflito para a API** ✅. Para os hosts públicos, **cada um tem DOIS registros A** apontando para a Vercel — o operador precisa **substituir os dois** por `94.103.168.244`, e manter o Cloudflare em **“DNS only”** (proxy desligado) até o ACME HTTP-01 concluir, como documentado no próprio Caddyfile.

## 4. Configuração pública — **validada** (item 2) e correção da Mission 05.24

Executei `caddy validate --adapter caddyfile` no build em uso (**Caddy v2.11.4**) sobre três variantes:

| Variante | Resultado |
|---|---|
| v1 — `encode` + `@cron`/`respond 404` + `reverse_proxy 127.0.0.1:3100` | **exit=0 — VÁLIDA** ✅ |
| v2 — v1 + `health_uri /robots.txt` + `fail_duration 30s` | **exit=0 — VÁLIDA** ✅ |
| v3 — v2 + **`max_conns 100`** (a proposta da Mission 05.24 §5) | **exit=1** — `Error: adapting config using caddyfile: unrecognized subdirective max_conns` ❌ |

⇒ **A configuração que eu propus na 05.24 estava inválida** para este Caddy. O passo 2 desta missão existia exatamente para isso e **pegou o meu erro**. A versão corrigida e validada está versionada em `infra/selfhosted/app/caddy/fronteiraai.cutover.caddyfile` (bloco **aditivo**, sem `max_conns`, com `health_uri`/`fail_duration`, bloqueio de `/api/cron/*` com **404**).

## 5. Achado novo que afeta a janela de abertura: Kong em 57%

A memória do Kong subiu de **233 MiB** (após a recriação da 05.25) para **356 MiB** (4 h) e agora **437,1 MiB / 768 MiB (57%)**, com **1,54%** de CPU. Nas últimas medições ficou **estável** (436,8 → 437,1 MiB), ou seja o crescimento é **em degraus/rajadas, não linear** — não faço extrapolação. Ainda há margem, mas durante a abertura pública isso deve ser **monitorado**, e o reinício do Kong (≈5 s, `docker compose … up -d --no-deps kong`) é a válvula de segurança. **Cuidado em não trocar um risco por outro**: reiniciar o Kong no meio da abertura derruba a API por segundos.

## 6. `/api/cron/*` externo vs timer local (item 4) — compatibilidade verificada

O bloqueio na borda **não** afeta o timer: `run-crons.sh` usa `BASE=http://127.0.0.1:3100` (loopback) ✅ — o disparo autenticado do systemd nunca passa pelo Caddy. A negação com `404` (em vez de `403`) evita revelar a existência da rota.

## 7. Plano de rollback (nada a reverter, porque nada foi aplicado)

| Camada | Reverter |
|---|---|
| Caddy | remover o bloco novo do `/etc/caddy/Caddyfile` + `sudo systemctl restart caddy` (neste host o reload foi neutralizado por política) |
| DNS | devolver `fronteiraai.com` → **64.29.17.1, 216.198.79.1** e `www.fronteiraai.com` → **64.29.17.65, 216.198.79.65** (Vercel) |
| Kong | `sudo docker update --memory 512m --memory-swap 512m supabase-kong` ou recriar pelo override da 05.25 |
| Frontend | já está em loopback; um `paraguai-web:previous` está preservado ⇒ `deploy.sh --rollback` |
| Supabase / dados | **nunca** envolvidos: o cutover não toca banco, RLS, PostgREST ou os outros containers |

## 8. GO / NO-GO

**NO-GO — bloqueado por acesso, não por engenharia.** Todos os pré-requisitos técnicos estão satisfeitos e verificados (frontend validado com dados reais, taxa de câmbio automática funcionando, Kong com margem, PostgREST/Kong/RLS intocados, rollback de cada camada documentado, configuração de Caddy **validada**), mas **faltam os dois acessos administrativos** sem os quais a missão proíbe executar qualquer mudança pública.

**Handoff — o que exige mão humana (nesta ordem)**:
1. **GitHub**: no `main`, remover o bloco `schedule:` de `.github/workflows/high-frequency-crons.yml` (mantendo `workflow_dispatch`) — é o único mecanismo efetivo de desativação; a alteração em branch **não** conta.
2. **Cloudflare**: confirmar os registros atuais (§3) e, na janela combinada, substituir **os dois** A records de `fronteiraai.com` e de `www.fronteiraai.com` por **94.103.168.244**, mantendo **`api` intocado** e o proxy **desligado** até o certificado emitir.
3. **Caddy** (no VPS, com a config validada): acrescentar o bloco de `infra/selfhosted/app/caddy/fronteiraai.cutover.caddyfile` + `systemctl restart caddy`; validar antes com `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`.
4. **Verificação de conteúdo** por ambos os domínios (não apenas 200): lojas reais, página de produto com ofertas e preços, busca com correspondências, `/api/exchange/current` com valores e timestamp recentes, e `/api/cron/exchange/refresh` respondendo **404** de fora.
5. **Monitorar durante a abertura**: `57014`/`PGRST003`, conexões, memória do Kong (§5), load; rollback do §7 ao primeiro sinal.

**NO-GO absoluto nesta missão**: DDL, migrations, RLS/PostgREST/Kong, secrets, serviços Supabase, executar os seis crons bloqueados, merge em `main` sem autorização separada — e, por falta de acesso, **qualquer** mudança em DNS/Caddy/GitHub.

**Limitações declaradas**: não fiz nenhuma verificação de HTTPS por resolução direcionada ao VPS (passo 5) porque isso pressupõe a configuração pública aplicada — que está bloqueada; o `caddy validate` foi executado sobre um arquivo temporário (não sobre o Caddyfile em produção, que **não** foi alterado); não inspecionei os secrets/vars do GitHub (`gh` ausente) para confirmar o estado de `CRON_SECRET`/`CRON_APP_URL` do workflow — a evidência de que o GHA não alcança o app é comportamental (401 do Kong / 402 da Vercel), não configuracional.
