# MISSION 05.21 — POSTGREST SCHEMA CACHE RECOVERY

**Categoria**: `docs/operations/`
**Branch**: `mission-05-21-postgrest-cache-recovery` (base `mission-05-20-controlled-cutover` @ `b5092c7`)
**RESULTADO: PONTO DE PARADA ACIONADO** — o 404 **persiste**, mas **não é cache**. A recarga autorizada foi executada (uma única vez), não mudou nada, e as duas hipóteses alternativas foram **refutadas por evidência**. Apresento o diagnóstico; nada foi gravado e nenhuma regressão ocorreu.

## 0.1 Autorização × execução

| Autorizado | Feito |
|---|---|
| Diagnóstico read-only de relações e permissões | ✅ (§C.2) |
| **Uma única** recarga via `NOTIFY pgrst, 'reload schema'` após o baseline | ✅ executada **uma** vez (`exit=0`) |
| Verificar se o PostgREST reconhece as tabelas | ✅ (**já reconhecia — antes e depois**) |
| **Uma única** atualização supervisionada do câmbio se as verificações passassem | ✅ executada **uma** vez; **0 taxas gravadas** (§C.5) |
| Verificar logs, métricas e integridade | ✅ (§C.6) |

**Proibido — respeitado**: nenhum DDL, nenhuma migration, nenhuma criação/exclusão de tabela, **nenhuma alteração de permissões**, **nenhum** reinício de container, nada em DNS/Caddy/Kong, **nenhum** dos outros crons (allowlist), nenhum merge/deploy, **timer não habilitado**, domínios não publicados.

---

## C.1 Baseline (antes de qualquer intervenção)

| Métrica | Valor |
|---|---|
| Containers | **9 `healthy`** (8 Supabase `Up 7 days`, `paraguai-web` Up 17 h) |
| Conexões PostgreSQL | **3** |
| `exchange_rates` / `exchange_provider_runs` | **0** / **194** |
| `PGRST003` / `57014` | **67** / **1.169** |

## C.2 Schema, permissões e visibilidade (read-only)

| Verificação | Resultado |
|---|---|
| `relkind` / RLS | `exchange_rates` e `exchange_provider_runs`: tabela (`r`) com **RLS habilitada** |
| Colunas de `exchange_rates` | `id, pair, rate, source, captured_at` — **compatíveis** com o que o repositório lê/escreve |
| Colunas de `exchange_provider_runs` | `id, provider_id, status, response_time_ms, error_message, attempted_at` (⚠️ **não existe `started_at`** — foi o erro da minha primeira consulta na Fase C) |
| GRANTs em `exchange_rates` | `anon`, `authenticated`, `service_role`, `postgres` — **todos com INSERT/SELECT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES** ⇒ **permissão não é o problema** |
| OIDs (proxy de ordem de criação) | `exchange_provider_runs 17664` · `exchange_rates 17672` · `offers 18018` · `stores 18117` ⇒ as tabelas de câmbio são **mais antigas** que as claramente visíveis, refutando "criadas depois do snapshot do cache" |

## C.3 Resposta EXATA do PostgREST **antes** da intervenção

```
stores                   http=200
exchange_rates           http=200     ← já acessível
exchange_provider_runs   http=200     ← já acessível
paths no schema cache: 71
spec contem exchange_rates           1
spec contem exchange_provider_runs   1
```

**O schema cache do PostgREST já conhecia as duas tabelas.** A hipótese registrada na Fase C ("a relação não está no schema cache") está, portanto, **refutada**.

## C.4 A recarga autorizada (uma única vez) e seu efeito

```
docker exec supabase-db psql -U postgres -X -q -c "NOTIFY pgrst, 'reload schema';"   → exit=0
DEPOIS: stores 200 · exchange_rates 200 · exchange_provider_runs 200
        paths no schema cache: 71 (idêntico)
        spec contem exchange_rates 1 · exchange_provider_runs 1 (idêntico)
```

Nada mudou — como esperado, já que não havia defasagem. Conforme o ponto de parada ("*se o problema não for de cache, não insistir na recarga*"), **não** houve segunda recarga.

## C.5 Atualização supervisionada do câmbio (executada porque o caminho de leitura respondeu 200)

```
2026-10-15T12:03:05Z exchange-refresh   http=200
2026-10-15T12:03:05Z SKIP market-pulse / buyer-alerts / merge-suggestions
                      / connectors-sync / outbox / snapshot   (allowlist: só câmbio)
--- taxas persistidas ---
total rates=0 runs=194
/api/exchange/current -> {"data":[]}
```

O endpoint volta **200**, o provedor sem chave é o escolhido (comprovado na Fase C: `providerId: keyless-open-er-api`, `usingFallback: false`), a allowlist isolou os seis crons **perfeitamente** — e **nenhuma taxa foi gravada**: `exchange_rates` segue **0** e `exchange_provider_runs` segue **194**. A escrita continua falhando com o `404 page not found` em texto puro registrado no log do container.

## C.6 Hipóteses refutadas e o que permanece (sem presumir)

| Hipótese | Status | Evidência que refuta |
|---|---|---|
| Cache de schema desatualizado | ❌ **refutada** | `http=200` e presença no spec **antes** da recarga; nada mudou depois; OIDs mais antigos que tabelas visíveis |
| Permissão/GRANT ausente | ❌ refutada | `anon`/`authenticated`/`service_role`/`postgres` com INSERT/SELECT/… |
| Tabela inexistente | ❌ refutada | `relkind = r` e `to_regclass` ok nas Missões 05.17–05.20 |
| Cliente do app em schema diferente de `public` | ❌ **refutada** | `lib/exchange-factory.ts` injeta o cliente e o repositório usa `.from("exchange_rates")`; a **única** ocorrência de `.schema(` no código é um script de sanidade em `pg_catalog` — nada de `Accept-Profile`/`Content-Profile` no caminho da aplicação |
| Defasagem de migration/coluna exigida pela aplicação | ⚠️ **não verificada** | as colunas existem e batem com o payload (`pair, rate, source`); falta inspecionar as **políticas de RLS** (minha consulta a `pg_policies` foi cortada na saída antes das linhas) |

**O que permanece sem explicação comprovada**: a *escrita* falha com `404 page not found` enquanto a *leitura* com a chave de serviço responde 200 no mesmo recurso. A diferença material entre o meu probe e a requisição do app é o **método (GET vs POST) e possivelmente a chave/role** do cliente injetado. **Não afirmo** qual dos dois é, e **não** presumo RLS sem ver as políticas.

**Próximo probe decisivo (read-only, ~30 s, ainda não executado para respeitar o ponto de parada)**:
1. `POST /rest/v1/exchange_rates` com a **service_role** → se 201, o caminho está bom e o problema é o **role do cliente do app**; se 404, é resolução de path no método POST.
2. O mesmo `POST` com a **anon** → distingue RLS/role (esperado 401/403 se for RLS; 404 mantém a outra linha de investigação).
3. `SELECT policyname, cmd, roles FROM pg_policies WHERE tablename IN ('exchange_rates','exchange_provider_runs')` — leitura que faltou.
⚠️ Passo 1 grava uma linha em `exchange_rates`; só executar com autorização explícita (ou usando `Prefer: return=minimal` com um `POST` seguido de `DELETE` do próprio registro, também sujeito a autorização).

## C.7 Integridade após a intervenção

| Métrica | Antes | Depois |
|---|---|---|
| Containers | 9 `healthy` | **9 `healthy`** |
| Conexões | 3 | **4** (transitório dos meus probes; `PGRST003`/`57014` inalterados) |
| `PGRST003` / `57014` | 67 / 1.169 | **67 / 1.169** |
| `exchange_rates` / `runs` | 0 / 194 | **0 / 194** |
| Erros novos / reinícios | — | **nenhum**; nenhum container reiniciado |

## C.8 GO / NO-GO

**NO-GO para o cutover.** A recarga autorizada **não era** a correção: o cache nunca esteve defasado. Restam, com evidência, apenas **uma** linha de investigação plausível (método POST/role do cliente) e **uma** lacuna de leitura (políticas de RLS) — ambas endereçáveis com o probe do §C.6, que exige autorização porque pode gravar uma linha.

**O que esta missão entrega de sólido**: elimina a hipótese que orientava o plano (cache) com evidência antes/depois, elimina GRANT e schema-do-cliente, confirma novamente o isolamento do câmbio por allowlist e a integridade do stack, e reduz o problema a um único probe de 30 segundos em vez de um caminho de investigação aberto. Um comparador de preços **não** deve ser publicado sem conversão confiável, e essa condição permanece não atendida.

**Limitações declaradas**: a consulta às políticas de RLS foi truncada na saída e **não** foi repetida; o `NOTIFY` foi executado uma única vez, embora o diagnóstico já apontasse que não havia defasagem (a autorização era explícita e a ação é idempotente e reversível por natureza); o timer permanece **desabilitado** e os domínios **não** foram publicados, conforme a missão.
