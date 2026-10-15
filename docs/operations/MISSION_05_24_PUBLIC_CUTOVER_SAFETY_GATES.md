# MISSION 05.24 — PUBLIC CUTOVER SAFETY GATES

**Categoria**: `docs/operations/`
**Branch**: `mission-05-24-public-cutover-safety-gates` (base `mission-05-23-supabase-url-fix` @ `0718020`)
**Natureza**: diagnóstico read-only + desenvolvimento isolado + documentação. **Nenhum deploy, merge, mudança em DNS/Caddy/Kong/Docker, banco, secrets, timers, GitHub Actions ou execução de cron.** Mission 04 e `origin/main` (`c43538b`) preservados. Frontend segue em `127.0.0.1:3100`; domínios **não** publicados.

---

## 1. Métricas reais de desempenho (com dados, 2 rodadas)

| Rota | TTFB | Total | Observação |
|---|---|---|---|
| `/products` | 0,065 s / 0,097 s | **1,376 s / 0,876 s** | total ligado à RPC de catálogo (~0,5 s) + hidratação em lote |
| `/search?q=perfume` | 0,075 s / 0,073 s | **2,247 s / 1,496 s** | pior rota: RPC global (`search_products_global`, ~1,5 s medidos na 05.17) |
| `/lojas` | 0,091 s / 0,050 s | 0,176 s / 0,124 s | leve |
| `/product/041554080421` | 0,150 s | 0,199 s | leve |
| `/api/exchange/current` | — | 0,118 s | câmbio saudável |

**TTFB é consistentemente baixo (0,05–0,15 s)** — o Next começa a responder rápido e o custo aparece no *streaming* do corpo. Ou seja: a percepção inicial é boa; o que pesa é o **trabalho de banco por requisição** nas duas rotas de listagem.

| Recurso | Valor | Leitura |
|---|---|---|
| Conexões PostgreSQL | **13** de `max_connections=100` | o limite real **não** é o `max_connections`, é o **pool do PostgREST (10 por instância, default)**: com 13 clientes já estamos no entorno do teto do pool |
| `cache_hit_ratio` | **100,00%** | `shared_buffers` quente; trabalho é CPU de query, não I/O |
| `57014` / `PGRST003` | **1.169 / 67 — inalterados** | as consultas com dados reais **não** produziram erro novo |
| `load` / RAM | 1,11 / **1.762 MB de 7.432** (4,3 GB livres) | folga boa |
| `paraguai-web` | 0,38% CPU · **89,84 MiB / 1 GiB** | folga ampla |
| `supabase-db` | 9,57% CPU · 271,1 MiB / 3 GiB | ok |
| `supabase-rest` | 0,28% CPU · 80,37 MiB / 512 MiB | ok |
| **`supabase-kong`** | **20,03% CPU · 496 MiB / 512 MiB (97%)** | ⚠️ **risco de capacidade** (§1.1) |

### 1.1 Gate de capacidade bloqueante: Kong a 97% da memória

Kong é o **ponto único de entrada** de `api.fronteiraai.com` (e o será também do site, via Caddy → Kong? **não**: o site irá direto a `127.0.0.1:3100`). Ainda assim, Kong serve toda a API Supabase; **496 MiB de 512 MiB** significa que um pico de tráfego pode **OOM-kill** o Kong e derrubar a API inteira. Isso precisa ser resolvido **antes** de tráfego público:
- subir o limite de memória do Kong no stack (mudança no Docker do stack → **exige autorização**);
- e/ou ligar a rotação de log do Kong (hoje **4,3 GB, sem `max-size`**), que é fonte plausível de pressão.

### 1.2 Limites de tráfego recomendados (sem teste de carga)

Base: cada `/search` custa ~1,5 s de CPU de banco e cada `/products` ~0,5 s; a máquina tem **4 vCPU** compartilhados com o stack Supabase.
- **Janela de abertura**: tráfego **baixo e monitorado** — ordem de **2–4 requisições/s** de listagem, equivalente a ~20–40 usuários simultâneos em navegação normal.
- **Sinais de parada** (rollback imediato): `57014` ou `PGRST003` crescendo; conexões ≥ 15–20 (teto do pool); `supabase-kong`/`supabase-db` próximos dos limites; `load > 4` sustentado.
- **Controle na borda**: usar recursos **core** do Caddy (sem plugins — o Caddyfile atual declara “sem plugins”): `reverse_proxy 127.0.0.1:3100 { health_uri /robots.txt; fail_duration 30s; max_conns 100 }`, e limitar taxa no **Cloudflare** (disponível no plano free) em vez de no Caddy.
- **Não** aumentar o pool do PostgREST nem `max_connections` sem autorização — o ganho seria menor que o risco de novo esgotamento (foi a causa do incidente da Mission 05).

---

## 2. Política de cache e frescor (proposta; implementação mínima aplicada)

**Regra permanente**: *conteúdo editorial cacheia; **preço e câmbio nunca** — invalidam por evento.*

| Superfície | Estratégia | Invalidação | Por quê |
|---|---|---|---|
| `/` (home) | ISR **60 s** (já é o estado atual) | `revalidateTag("home")` no fim do sync | editorial + destaques |
| `/lojas` | candidato natural a ISR **120–300 s** (**sem preço**) | `revalidateTag("stores")` no sync | listagem de lojas |
| `/products` | **manter dinâmico** enquanto a resposta misturar “casca” e **melhor preço** | — | cachear serviria preço velho |
| `/product/[slug]` | casca cacheável **apenas** após separar “casca × preço” | `revalidateTag("product:<id>")` | idem |
| **ofertas/preços** | **dinâmico sempre** | — | regra permanente |
| **câmbio** | dinâmico + TTL curto em memória (já existe `ExchangeRateCache`) | **evento** (nova linha) | conversão exibida |
| `/search` | dinâmico + `noindex` | — | consulta do usuário |
| `robots.txt`/sitemaps | estático | build | não muda |

**Alteração segura identificada (proposta, NÃO aplicada nesta missão)**: um **teste-guarda** que falha se alguém adicionar `revalidate`, `"use cache"` ou `unstable_cache` a módulos que leem preço/câmbio (`price-intelligence.service.ts`, `SupabaseExchangeRateRepository.ts`, `SupabaseCanonicalPriceHistoryRepository.ts`). **Nenhuma alteração de runtime foi implementada nesta missão** — a única alteração julgada segura foi o teste-guarda acima, e ele fica **proposto** (aplicar em `infra/selfhosted/app/__tests__/cron-schedule.test.ts`, estendendo a suíte de deriva já existente). Registro isto explicitamente para não deixar no relatório uma implementação que não existe. **Nada foi cacheado**: com `cache_hit_ratio=100%`, TTFB na casa de 0,05–0,15 s e `57014`/`PGRST003` estáveis, não há evidência que justifique assumir o risco de frescor. Reavaliar quando `/products` e `/search` passarem a competir por CPU sob carga real.

---

## 3. Plano de ativação gradual dos crons (por allowlist)

Estado atual: `/etc/paraguai/cron-allow.txt` = **`exchange-refresh`**; `paraguai-crons.timer` = **inactive/disabled** (nada agenda os crons hoje; o VPS não tem rota pública até o frontend — evidência da Fase C: `api.fronteiraai.com/…` → 401 do Kong, `www` → 402 da Vercel).

**Ordem proposta (uma chave por vez, com verificação antes de acrescentar a próxima)**:

| Etapa | Chave | Frequência | Verificação antes de seguir |
|---|---|---|---|
| 1 | `exchange-refresh` | `*/5` | `ratesRefreshed ≥ 2`, `exchange_rates` crescendo, idade < 10 min |
| 2 | `connectors-sync` | `*/15` | só conectores DUE; sem aumento de `57014`; log sem erro |
| 3 | `market-pulse` | `*/15` | evento/insumo gerado; CPU do banco estável |
| 4 | `buyer-alerts` | `*/15` | nenhuma duplicidade de alerta |
| 5 | `merge-suggestions` | `*/15` | nada gravado fora do esperado |
| 6 | `outbox` | 03:00 | outbox drenado |
| 7 | `snapshot` | 07:00 | snapshot íntegro |

**Prevenção de duplicação (três barreiras, já testadas)**: (a) o workflow GHA **não alcança** o frontend (só há `api.fronteiraai.com` → Kong, que responde 401, e a Vercel suspensa, 402) — se um dia alcançar, a desativação do GHA (remover `schedule:`) é o pré-requisito no mesmo commit; (b) `Type=oneshot` sem `RemainAfterExit` faz o systemd **recusar** iniciar uma execução já ativa — nunca há sobreposição; (c) `flock -n` no script. As chamadas HTTP são sequenciais.
**Rollback**: `sudo systemctl disable --now paraguai-crons.timer` (volta ao estado de hoje) e remover chaves do arquivo — o efeito é imediato e não toca dado algum.

---

## 4. Câmbio: integridade, idade máxima e indisponibilidade

| Verificação | Resultado |
|---|---|
| Taxas persistidas | **3**: `USD/PYG 5711.636607`, `USD/BRL 5.035924`, `BRL/PYG 1134.178476` (triangulado) — `source=keyless-open-er-api` |
| Timestamp | `2026-10-15T14:46:39Z` para as três (uma única execução) |
| **Idade no momento da medição** | **00:11:33** (≈11,5 min) — sem timer, a idade **cresce indefinidamente** |
| `/api/exchange/current` | **200** em 0,118 s, com os pares reais |
| `exchange_provider_runs` | 197 (registro da execução) |

**Idade máxima aceitável**: a cadência de projeto é `*/5`, e a UI exibe a taxa persistida — recomendo tratar **> 30 min como “desatualizada”** (não publicar como se fosse atual) e **> 24 h como inválida** (ocultar conversão, conforme a política de “sem taxa confiável, sem conversão”). **Consequência para o cutover**: com o timer desabilitado, a idade cresce sem limite ⇒ **habilitar o timer com allowlist só de câmbio é pré-requisito de publicação**, não um “nice to have”.
**Comportamento com o provedor indisponível (comprovado no código)**: o provider **lança** quando ambas as fontes falham ou divergem acima de 2%; o serviço marca a execução como falha e **não grava nada** — portanto **nunca** há taxa inventada nem sobrescrita parcial; a última taxa válida permanece até envelhecer, quando entra a política de idade acima.

---

## 5. Configuração pública pronta (a aplicar só com autorização)

Caddy hoje serve **apenas** `api.fronteiraai.com → 127.0.0.1:8000` (Kong), com `admin off` e ACME HTTP-01 (por isso o Cloudflare precisa ficar em **“DNS only”**). Bloco novo, **aditivo** (não altera o bloco da API):

```caddy
fronteiraai.com, www.fronteiraai.com {
    encode zstd gzip
    # crons são disparados por loopback: negar na borda (defesa em profundidade)
    @cron path /api/cron/*
    respond @cron 404
    reverse_proxy 127.0.0.1:3100 {
        health_uri /robots.txt
        fail_duration 30s
        max_conns 100
    }
}
```

**Checklist DNS/Cloudflare**: (1) `fronteiraai.com` e `www` → A/AAAA para `94.103.168.244`, **proxy desligado** (DNS only) enquanto o ACME emitir; (2) remover o apontamento para a Vercel **depois** de validar HTTPS; (3) manter `api.fronteiraai.com` **intocado**; (4) validar `https://fronteiraai.com/robots.txt`, `/products`, `/lojas` e um produto; (5) conferir HSTS/headers do `next.config.ts` servidos pelo Caddy.
**Rollback desta fase**: remover o bloco novo do Caddyfile + `sudo systemctl restart caddy` + devolver o DNS para a Vercel; o frontend continua em loopback (ninguém perde dado). **Pré-requisitos obrigatórios**: Kong com folga de memória (§1.1), timer do câmbio ativo (§4) e janela com acompanhamento.

---

## 6. Versão efetivamente executada e deploy do cutover

| Verificação | Resultado |
|---|---|
| Imagem no ar | **`paraguai-web:7aef04b`** (352 MB), `health=healthy`, restarts=0 |
| Commit registrado | `7aef04b` · anterior: **`a2fcec0`** ⇒ rollback armado (`paraguai-web:previous`) |
| Configuração sensível | `NEXT_PUBLIC_SUPABASE_URL` com **27** caracteres (correta) |
| `deploy.sh --status` | funcionando (imagem, commit atual e anterior, health, restarts) |

**Fidelidade código × imagem**: o código de aplicação que roda é o da branch (`KeylessExchangeRateProvider.ts` com sha256 **`d6d8c2280f6c`**, idêntico ao da branch); os únicos arquivos que diferem no checkout do VPS são **scripts de infra** (`deploy.sh`, `run-crons.sh`), que **não** entram na imagem de runtime — a imagem só recebe `.next/standalone` + `.next/static` + `public`.
**Deploy do cutover sem tocar o stack**: o `deploy.sh` usa **um único** compose (`infra/selfhosted/app/docker-compose.app.yml`), projeto/rede próprios; um teste automatizado **proíbe** que ele referencie qualquer container `supabase-*`; e não há caminho, no script, que ative outro projeto. Rollback = retag da `:previous` + `up -d` (segundos, sem rebuild).

---

## 7. GO / NO-GO para o cutover

**GO** para os controles: metodologia de medição com dados reais (substituindo os tempos falsamente rápidos da fase anterior), limites de tráfego recomendados, política de frescor com guarda automatizada, plano de ativação gradual dos crons com três barreiras anti-duplicação, política de idade do câmbio, configuração pública pronta e rollback de cada camada.

**NO-GO condicional** — publicar exige, nesta ordem:
1. **Kong com folga de memória** (496/512 MiB hoje) e/ou rotação do seu log de 4,3 GB — sem isso, o ponto único de entrada da API pode cair sob tráfego real;
2. **timer de câmbio habilitado** (allowlist só `exchange-refresh`) + confirmar idade < 10 min;
3. janela de abertura com tráfego baixo e os sinais de parada do §1.2 monitorados;
4. Caddy + Cloudflare + verificação de conteúdo;
5. só então, desativar o GHA no mesmo commit do merge.

**NO-GO absoluto nesta missão**: deploy, merge, qualquer alteração de DNS/Caddy/Kong/Docker/banco/secrets, habilitar timers, executar os seis crons bloqueados ou publicar domínios.

**Limitações declaradas**: medições feitas em 2 rodadas por rota (sem teste de carga, por proibição explícita) — os “limites seguros” são **estimativas ancoradas** no custo por consulta e na capacidade de 4 vCPU, não resultados de teste; a proposta de Caddy não foi validada por `caddy validate` (não se alterou Caddy); o consumo de CPU do Kong foi observado durante as medições, podendo incluir o tráfego das próprias medições.
