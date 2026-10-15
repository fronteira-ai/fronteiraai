# MISSION 05.28 — CADDY PRE-CUTOVER

**Categoria**: `docs/operations/`
**Branch**: `mission-05-28-caddy-pre-cutover` (base `mission-05-27-public-cutover` @ `0464440`)
**RESULTADO: BLOCO INSTALADO E VALIDADO.** Caddy serve os dois hosts públicos **em HTTP**, com conteúdo real confirmado por Host; `api.fronteiraai.com` preservada; `/api/cron/*` negado na borda sem afetar o cron local; 9 containers saudáveis; rollback pronto. **HTTPS público ainda NÃO é válido** (sem DNS apontando para cá, não há certificado) — declarado conforme a missão.

**Autorizado e feito**: backup da config (1), validar+instalar o bloco da 05.27 sem `max_conns` (2), preservar a API (3), bloquear `/api/cron/*` externamente mantendo o cron local (4), testar por IP com Host (5), saúde+Kong (6), rollback (7).
**Não tocado**: Cloudflare DNS, GitHub Actions, banco, Supabase, secrets, timers, `main`. Mission 04 preservada; `origin/main` = `c43538b`.

---

## 1. Backup (item 1)

`/etc/caddy/Caddyfile.bak-05.28` — `modo=644`, **2024 bytes**, criado **antes** de qualquer alteração. Caddy: `v2.11.4`, serviço `active`.

## 2. Instalação (item 2) — com uma decisão de projeto deliberada

O bloco foi instalado na forma **HTTP-only** (`http://fronteiraai.com, http://www.fronteiraai.com`), e não como TLS. **Motivo**: o DNS confirmado pelo CEO mantém `@` e `www` como **CNAME → Vercel**; um bloco TLS agora faria o Caddy tentar **ACME HTTP-01** para nomes que não resolvem para esta máquina e **falhar em loop** — exatamente o risco que o comentário do próprio bloco da API neste Caddyfile evita (e que pode consumir rate-limit do Let's Encrypt). `max_conns` **não** foi usado (o build v2.11.4 o rejeita, achado da 05.27).

```
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile  → exit=0
systemctl restart caddy → caddy apos restart: active
```

O Caddyfile recebeu, **dentro do bloco**, a instrução da Fase 2: *“na troca do DNS, remover os dois `http://` e `systemctl restart caddy` ⇒ o Caddy emite os certificados automaticamente via ACME HTTP-01”*. Versão canônica do bloco versionada em `infra/selfhosted/app/caddy/fronteiraai.cutover.caddyfile`.

## 3. `api.fronteiraai.com` preservada (item 3) ✅

```
curl --resolve api.fronteiraai.com:443:127.0.0.1 https://api.fronteiraai.com/rest/v1/
  → 401    (idêntico ao baseline: alcançável, exige apikey)
```

## 4. Bloqueio externo sem afetar o cron local (item 4) ✅

| Chamada | Resultado |
|---|---|
| **externo** (`Host: fronteiraai.com`) `/api/cron/exchange/refresh` | **404** (negado na borda) |
| **loopback** `http://127.0.0.1:3100/api/cron/exchange/refresh` sem segredo | **401** (guard do app intacto) |
| **timer** (prova viva) — idade da taxa de câmbio | **00:04:53** — o `paraguai-crons.timer` **continuou disparando normalmente** durante e depois do restart do Caddy ✅ |

O timer chama `http://127.0.0.1:3100` (loopback) e **nunca** passa pelo Caddy ⇒ a negação de borda é compatível com o agendamento autenticado local, comprovado pelo cron real que rodou no intervalo.

## 5. Conteúdo real por `Host`, sem DNS público (item 5) ✅

| Requisição (via IP do VPS, `Host:` explícito) | Resultado |
|---|---|
| `Host: fronteiraai.com` → `/products` | **200** em 1,47 s · **12** links `/product/` · preços reais (`49.895`, `58.224`) |
| `Host: www.fronteiraai.com` → `/lojas` | **200** · **9** links `/lojas/` · `cellshop` presente |
| `Host: fronteiraai.com` → `/product/041554080421` | **200** · preços reais (`03.958`, `12.634`, `35.874`) |

Conteúdo real confirmado através da **borda do Caddy** (não apenas 200, e não apenas no loopback direto).

## 6. Saúde e Kong (item 6) ✅

**9 containers `healthy`** (paraguai-web Up 7 h; kong Up 6 h; 8 Supabase Up 8 days). Kong: **439,5 MiB / 768 MiB (57%)**, 1,57% CPU — estável em relação à medição anterior (437,1 MiB), portanto o trabalho no Caddy **não** alterou o quadro de memória; segue valendo a recomendação de monitorar durante a abertura.

## 7. Rollback (item 7) ✅ pronto e **não** necessário

```bash
sudo cp -a /etc/caddy/Caddyfile.bak-05.28 /etc/caddy/Caddyfile && sudo systemctl restart caddy
```
Reverte apenas o Caddy (segundos). Nada mais foi alterado: DNS, GitHub Actions, banco, Supabase, secrets e timers intocados.

## 8. GO / NO-GO para a troca do DNS

**GO para a troca de DNS** — com uma condição explícita: a Fase 2 (remover os `http://` e reiniciar o Caddy) deve ser executada **imediatamente após** o DNS apontar para o VPS, para que o certificado seja emitido e o HTTPS passe a valer. Antes disso, **HTTPS público NÃO está validado** — e eu **não** o considero validado: sem DNS apontando para cá não há como emitir certificado, e um teste de SNI aqui retornaria o certificado default do Caddy, o que não prova nada sobre produção.

**Sequência recomendada na janela (mãos humanas)**:
1. Trocar no Cloudflare os registros de `@` e `www` para apontar ao VPS (`94.103.168.244`), mantendo **`api` intocado** e o proxy **desligado** (DNS only) até o certificado emitir.
2. No VPS: remover os dois `http://` do bloco (`/etc/caddy/Caddyfile`), `caddy validate`, `systemctl restart caddy`; acompanhar `journalctl -u caddy -f` até a emissão do certificado.
3. Validar **HTTPS** nos dois hostnames com conteúdo real (repetir os testes do §5 via HTTPS) e confirmar `/api/cron/*` → 404 externo.
4. Monitorar `57014`/`PGRST003`, conexões, memória do Kong, load; rollback do §7 ao primeiro sinal (e devolver o DNS à Vercel, se necessário).

**NO-GO** nesta missão para: alterar DNS, GitHub Actions, banco, Supabase, secrets, timers ou `main` — nada disso foi tocado.

**Limitações declaradas**: a validação foi **HTTP por Host** (§5) — não houve teste de SNI/HTTPS público, que só é possível após a emissão do certificado (e a missão proíbe considerá-lo validado antes disso); o bloco ficou em Fase 1 (HTTP-only) por decisão explícita de evitar loop de ACME; não testei a rota autenticada do cron no loopback (executaria a lógica de escrita) — a verificação do cron foi feita **observando o timer real** (idade da taxa 00:04:53).
