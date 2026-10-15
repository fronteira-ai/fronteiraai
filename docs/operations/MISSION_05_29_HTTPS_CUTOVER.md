# MISSION 05.29 — HTTPS CUTOVER

**Categoria**: `docs/operations/`
**Branch**: `mission-05-29-https-cutover` (base `mission-05-28-caddy-pre-cutover` @ `8bac0a0`)

## RESULTADO: **CUTOVER PÚBLICO EXECUTADO COM SUCESSO**

`fronteiraai.com` e `www.fronteiraai.com` estão no ar pelo VPS Fluence, com **HTTPS válido (Let's Encrypt)**, conteúdo real, `/api/cron/*` negado na borda e o cron local funcionando. `api.fronteiraai.com` preservada. **Nenhum erro novo no PostgreSQL.** Aqui está o que foi feito, com evidência.

**Proibido — respeitado**: DNS, GitHub Actions, banco, Supabase, secrets, timers, outros containers e `main` **não** foram tocados. Mission 04 preservada; `origin/main` = `c43538b`.

---

## 1. DNS público confirmado (item 1) ✅

| Host | Resolve para |
|---|---|
| `fronteiraai.com` | **94.103.168.244** |
| `www.fronteiraai.com` | **94.103.168.244** |
| `api.fronteiraai.com` | **94.103.168.244** |

## 2–4. Backup, Fase 2 e validação ✅

- Backup: **`/etc/caddy/Caddyfile.bak-05.29`** (modo 644, 2793 bytes) **antes** da alteração.
- Linha 51: `http://fronteiraai.com, http://www.fronteiraai.com {` → **`fronteiraai.com, www.fronteiraai.com {`** (Fase 2 exatamente como documentada na 05.28).
- `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` → **exit=0**; `systemctl restart caddy` → **`active`**.

## 5. Certificados e HTTPS válido (item 5) ✅

```
t+10s certificados obtidos: 2   (apex + www; o da api já existia e não é reemitido)

fronteiraai.com       http=200 tls=0  issuer=C=US, O=Let's Encrypt, CN=YE2  notAfter=Jan 13 2027
www.fronteiraai.com   http=200 tls=0  issuer=Let's Encrypt                   notAfter=Jan 13 2027
api.fronteiraai.com   http=401 tls=0  issuer=Let's Encrypt                   notAfter=Jan 13 2027
```

`tls=0` = verificação de cadeia passou (sem `-k`); emissão em **<10 s** via ACME HTTP-01 (o Cloudflare estava em DNS only, como pré-requisito). **O HTTPS público agora está validado** — a ressalva das Missões 05.27/05.28 está fechada por evidência, não por suposição.

## 6. Conteúdo real por HTTPS (item 6) ✅

| Rota (via `https://fronteiraai.com`) | HTTP | Tempo |
|---|---|---|
| `/` | **200** | 0,218 s |
| `/lojas` | **200** | 0,354 s |
| `/products` | **200** | 1,194 s |
| `/search?q=perfume` | **200** | 1,814 s |
| `/api/exchange/current` | **200** | 0,231 s |
| `/product/041554080421` (via `www`) | **200** | — |

Conteúdo: **9** links de loja + `cellshop` em `/lojas`; página de produto com **preços reais** (`03.958`, `12.634`, `35.874`); câmbio com valores. Não é “apenas 200”: são dados reais.

## 7. Cron: bloqueio externo × timer local (item 7) ✅

| Chamada | Resultado |
|---|---|
| `https://fronteiraai.com/api/cron/exchange/refresh` | **404** (negado na borda) |
| `https://www.fronteiraai.com/api/cron/exchange/refresh` | **404** |
| Timer local | **vivo** — idade da taxa de câmbio **00:03:12** (segue atualizando por loopback) |

## 8. Integridade (item 8) ✅

**9 containers `healthy`** · `PGRST003` **67 → 67** e `57014` **1.169 → 1.169** — **nenhum erro novo** apesar do tráfego real · conexões **13** · RAM 1.830 MB usados / **5.114 disponíveis** · Kong **456,1 MiB / 768 MiB (60%)**, `paraguai-web` **146,4 MiB / 1 GiB**.

---

## 9. Observações de tráfego REAL (primeiros minutos) — leitura honesta

O log do Caddy mostra **clientes externos reais** já navegando (`103.4.250.92`, Chrome/macOS) em `/lojas/new-zone`, `/product/xiaomi-cel-redmi-note-14s-667-ds-lte-12512gb-67w-black`, `/products?sort=savings&page=2`, `/lojas/topdek` — ou seja, o cutover está recebendo tráfego de produção.

**Sinal a acompanhar (não é falha, é o risco previsto)**: há avisos `aborting with incomplete response` com `"error":"reading: context canceled"` em requisições de **0,42 s a 5,07 s**. `context canceled` significa que **o navegador do usuário desistiu** antes da resposta terminar — coerente com páginas de produto/loja levando vários segundos. Combinado com **`load average` 3,81** (4 vCPU) e **Kong a 39,33% de CPU**, é exatamente o cenário que a Mission 05.24 §1.2 previu: **já há usuários reais abandonando páginas lentas**.

**Prioridade operacional imediata** (fora do escopo desta missão, que é de cutover):
1. Aplicar a política de frescor/cache da 05.24 §2 para as rotas de listagem e produto (o custo por consulta é o que produz os 1–5 s).
2. Monitorar `load`, CPU/memória do Kong, conexões e `57014`/`PGRST003` na janela de abertura, com os sinais de parada da 05.24.
3. Se o Kong voltar a subir de forma sustentada (>70% do limite), reiniciar (~5 s) em janela de baixo tráfego.

## 10. Rollback (preparado, **não** necessário)

| Camada | Reverter |
|---|---|
| Caddy | `sudo cp -a /etc/caddy/Caddyfile.bak-05.29 /etc/caddy/Caddyfile && sudo systemctl restart caddy` (volta a Fase 1, HTTP-only) |
| DNS | devolver `@`/`www`/`api` aos valores anteriores (Vercel nos hosts públicos) — **exige o CEO/Cloudflare** |
| Frontend | `paraguai-web:previous` preservado ⇒ `deploy.sh --rollback` |
| Supabase/dados | intocados em toda a série |

## 11. GO / NO-GO

**GO — cutover concluído e validado.** Todos os critérios foram atendidos: ambos os domínios servindo o frontend pelo VPS com **HTTPS válido**; conteúdo **real** (lojas, produtos, ofertas com preços, busca, câmbio); `/api/cron/*` **inacessível externamente**; `api.fronteiraai.com` **funcionando sem alteração** (401 = alcançável com apikey); apenas `exchange-refresh` autorizado no timer (allowlist intacta); 9 containers saudáveis; **sem crescimento de erros PostgreSQL**; Kong com margem (60% do limite).

**Ressalva de desempenho** (não bloqueia o GO, mas é a prioridade nº 1 agora): com tráfego real, `load` chegou a 3,81 em 4 vCPU e há abandono de requisições lentas (0,4–5,1 s). A próxima missão deve tratar frescor/cache e monitoramento da janela — o risco de degradação sob carga é **real e já observado**, não hipotético.

**NO-GO nesta missão** para: alterar DNS, GitHub Actions, banco, Supabase, secrets, timers, outros containers ou `main`.

**Limitações declaradas**: a contagem de “certificados obtidos” foi 2 (o da `api` já existia) e li a validade por `openssl s_client`+`x509` — não inspecionei a cadeia completa manualmente; as medições de conteúdo foram por curl (não por navegador real, embora o log prove que navegadores reais estão acessando); o `load` 3,81 inclui o tráfego real **e** os meus testes simultâneos.
