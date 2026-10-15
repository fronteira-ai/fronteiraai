# MISSION 05.30 — POST-LAUNCH PERFORMANCE & STABILITY

**Categoria**: `docs/operations/`
**Branch**: `mission-05-30-post-launch-stability` (base `mission-05-29-https-cutover` @ `45fef31`)
**RESULTADO: gargalo identificado com números de produção; otimizações preparadas; **nada foi alterado em produção**.** Deploy/merge/DDL/DML/DNS/Caddy/Kong/Supabase/timers/GHA/secrets/manual-cron: **nada disso foi tocado** (regras da missão). Mission 04 preservada; `origin/main` = `c43538b`.

---

## 1. Latência real (site público, 2 rodadas)

| Rota | Medição |
|---|---|
| `/` | 0,233 s / 0,276 s |
| `/lojas` | 0,330 s / 0,402 s |
| **`/products`** | **1,102 s / 1,159 s** |
| **`/search?q=perfume`** | **1,820 s / 1,439 s** |
| `/product/041554080421` | 0,394 s |
| Log do Caddy (6 h) | **0 respostas 5xx** · **22 `context canceled`** (abandono pelo navegador) |

## 2. Causa comprovada dos gargalos (`pg_stat_statements`)

| # | Consulta | Chamadas | Média | Total acumulado |
|---|---|---|---|---|
| 1 | `WITH pgrst_source AS (… "public"."price_history" …)` | **334.402** | **571,5 ms** | **191.103 s** |
| 2 | idem (outra forma) | **169.637** | **687,3 ms** | **116.590 s** |
| 3 | idem (outra forma) | 133.998 | 444,6 ms | 59.574 s |
| 4 | `pgrst_call` (wrapper PostgREST) | 18.820 | 727,7 ms | 13.696 s |
| 5 | **`SELECT count(*) FROM search_products_catalog(...)`** | **4** | **903.194,1 ms** | **3.613 s** |

**Diagnóstico**: (a) **`price_history` é o gargalo dominante** — ~638 mil chamadas a 444–687 ms, **≈367 mil segundos** de tempo de banco; é a mesma patologia documentada na Mission 05 (50,55 h → 85,5 h) e que a Missão 05.6 tratou **apenas nos callers que ela tocou** — agora, com tráfego real, os demais callers aparecem. (b) **`count(*)` sobre a RPC de catálogo leva 903 s por chamada** (15 min!) — e roda sob `service_role`, cujo `statement_timeout` é **ilimitado** (medido: `anon=3s`, `authenticated=8s`, `service_role` sem limite), ou seja, **nada interrompe** essa consulta; ela é a explicação mecânica de páginas que levam segundos e de clientes que abandonam.

Contexto de capacidade: conexões **13** de `max_connections=100` (o teto real é o **pool de 10** do PostgREST), `load` **2,34**, `PGRST003` **67** e `57014` **1.169** (estáveis), 9 containers `healthy`.

## 3. Otimizações — **apenas as que preservam frescor** (propostas; **nenhuma aplicada em runtime**)

Critério de aceitação: *"nenhuma possibilidade de apresentar preços ou câmbio incorretos por cache"*. Por isso **não** propus cache de nada que carregue preço/câmbio, e **nenhuma** alteração de runtime foi feita nesta missão (candidatas exigem revisão de código + deploy controlado, que é proibido aqui).

| # | Otimização (segura quanto a frescor) | Ganho esperado | Risco |
|---|---|---|---|
| O1 | **Eliminar `count(*)` na paginação do catálogo** (`services/product.service.ts`) — usar `hasNext` (buscar `p_limit+1` linhas e descartar a última) em vez de contar | remove a consulta de **903 s** e o custo do COUNT sobre 52.674 produtos | baixo: muda só a forma de paginar; `count` não é dado de preço |
| O2 | **Eliminar a RPC duplicada** na página vazia (o código refaz a chamada com `p_limit:1, p_offset:0`) | −1 round-trip por requisição de catálogo vazia | baixo: mesma semântica, um caminho a menos |
| O3 | **Migrar os callers restantes de `price_history` para o padrão offers-first** da Missão 05.6 (offers por `product_id`, depois `price_history` por `offer_id`) | ataca os **367 mil s** acumulados | baixo: padrão já validado em 05.6 (0,25–0,75 ms) |
| O4 | **Estreitar o SELECT dos embeds** (`price_history` trazendo só `price_usd, recorded_at`) | reduz buffers/rede por chamada | baixo |
| O5 | `createServerCache`/`unstable_cache` em leituras **sem preço** (`/lojas`, facetas) | pequeno (essas rotas já estão em 0,33–0,40 s) | médio: exige ler `node_modules/next/dist/docs/08-caching.md` antes (API mudou no Next 16.2.9) |

**Ordem recomendada**: O1 → O2 → O3 → O4 (todas de forma de consulta, **zero** risco de frescor), com O5 só depois e apenas em rotas sem preço.

**Plano de validação antes/depois (ambiente controlado)**: medir `pg_stat_statements` (chamadas/min e tempo total das 3 formas de `price_history` + o `count(*)`) e os tempos de `/products` e `/search` **antes**, aplicar a mudança em branch, medir **depois** no ambiente local/de staging, e só então considerar deploy. Critério de sucesso: `count(*)` **ausente** do topo e tempo total de `price_history` caindo de ordem de grandeza.

## 4. Kong — vigilância preventiva (item 4, **sem reiniciar**)

Tendência medida: **233 MiB** (após a recriação da 05.25) → 356 MiB (4 h) → 437 MiB → **447,5 MiB / 768 MiB (58%)** em ~7 h de uptime. Consumo é **memória anônima real** (97% no cgroup, medido na 05.25), não cache de arquivo; o risco é **OOM-kill** do ponto único de entrada da API.

**Artefato criado (não instalado)**: `infra/selfhosted/app/kgong-alert.sh` — lê `memory.current`/`memory.stat` do cgroup e **alerta** em 70% (ATENÇÃO) e 85% (CRÍTICO), com `--json` para monitoramento; **não reinicia nada**. Instalação sugerida (fora desta missão, pois timers são proibidos aqui): acrescentar como `ExecStartPre` ao timer de healthcheck existente, ou rodar via cron próprio — com o texto de ação incluindo o comando de reinício em janela baixa (~5 s).

## 5. Navegação e respostas incompletas (item 5)

- **22 `context canceled`** em 6 h no log do Caddy — o navegador entrega o cancelamento antes de a resposta terminar (consequência dos tempos de 1–5 s do §2, **não** um erro do app).
- **0 respostas 5xx** no Caddy e apenas **2** ocorrências de `Error` nas últimas 60 linhas do log do frontend ⇒ o app está **estável**; o problema é latência, não exceção.
- **Mobile**: não há evidência nos logs de tratamento diferenciado; o `User-Agent` predominante nos acessos reais é desktop (Chrome/macOS). Teste em dispositivos reais **não** foi executado (fora do escopo read-only) — fica como pendência de verificação humana.

## 6. Patch isolado dos agendamentos antigos (item 6)

`infra/selfhosted/app/github-actions/remove-cron-schedules.patch` — diff **isolado** que remove apenas `schedule: - cron "*/5"` e `"*/15"` de `.github/workflows/high-frequency-crons.yml`, **preservando `workflow_dispatch`** e todos os demais workflows (`database.yml` intocado).

**Aplicação (mãos humanas, no branch default)**:
```bash
git checkout main && git pull
git apply infra/selfhosted/app/github-actions/remove-cron-schedules.patch
git commit -am "ci: remove high-frequency cron schedules (moved to VPS timer)"
git push origin main
```
**Por que patch e não edição em branch**: agendamentos do GitHub Actions só existem a partir do **branch default**; alterar o arquivo em branch isolada **não desativa nada** (regra explícita da Mission 05.27). Enquanto isso, não há risco de execução dupla: `api.fronteiraai.com/api/cron/exchange/refresh` responde **404** (negado na borda) e o workflow exige `CRON_SECRET`/`CRON_APP_URL`.

## 7. Rollback

| Item | Rollback |
|---|---|
| Esta missão | **nada foi aplicado em produção** — não há o que reverter |
| Patch do workflow | `git revert <sha>` no `main` (restaura os dois `schedule:`) |
| O1–O4 (quando aplicadas) | são mudanças de forma de consulta: revert do commit + `deploy.sh --rollback` para a imagem anterior (`paraguai-web:previous` está preservado) |
| `kgong-alert.sh` (quando instalado) | remover o `ExecStartPre`/cron e o arquivo; telemetria pura, sem estado |
| Kong (se um dia o alerta disparar) | reinício em janela baixa: `docker compose -f …/docker-compose.yml -f …/docker-compose.kong-stab.yml up -d --no-deps kong` (~5 s) |

## 8. GO / NO-GO para deploy controlado

**NO-GO para deploy imediato — e o motivo não é latência.** As otimizações **estão preparadas e fundamentadas** (O1–O4 atacam exatamente as consultas medidas), mas: (a) são alterações de **código de consulta** que exigem revisão, testes e um deploy controlado — explicitamente **proibido** nesta missão; (b) a validação antes/depois precisa de ambiente controlado, que aqui é o local, não produção.

**Sequência recomendada para a próxima missão (deploy controlado)**:
1. Implementar **O1 + O2** (count/hasNext + remoção da RPC duplicada) com testes de paginação — o `count(*)` de 903 s é o alvo de maior retorno e menor risco.
2. Implementar **O3 + O4** (callers restantes de `price_history`).
3. Rodar `npm run lint`, `tsc --noEmit`, suíte completa e medir antes/depois.
4. Deploy com `deploy.sh` (build versionado + gates + warm-up) **em janela de baixo tráfego**, monitorando `57014`, conexões, Kong e `load` — e rollback pronto.
5. Aplicar o patch do workflow **no mesmo momento**, para não manter dois agendadores.

**GO** para o **diagnóstico** e para os artefatos desta branch (patch do workflow + vigilância do Kong), que podem ser usados imediatamente sem risco.

**NO-GO** nesta missão para: deploy, merge em `main`, DDL/DML, DNS/Caddy/Kong/Supabase/timers/GHA/secrets e execução manual de crons.

**Limitações declaradas**: medições de latência por `curl` (2 rodadas por rota, sem teste de carga agressivo, conforme proibição); a análise de mobile é por evidência de log, **não** por teste em dispositivo; não abri o código de `product.service.ts` linha a linha para escrever as diffs exatas de O1/O2 (fiz a proposta com base no comportamento medido e na documentação interna das Missões 05.6/05.14) — a implementação exige a leitura do módulo antes de editar; as três formas de `price_history` no `pg_stat_statements` são identificadas pelo texto normalizado, sem rastrear cada caller.
