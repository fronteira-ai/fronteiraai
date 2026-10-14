# MISSION 05.19 — FINAL CUTOVER PREPARATION

**Categoria**: `docs/operations/`
**Branch**: `mission-05-19-final-cutover` (de `mission-05-18-vps-production-readiness` @ `7181e34`)
**Preservação**: `origin/main` = `c43538b`; Missions 05.14–05.18 preservadas; Mission 04 intacta (5 arquivos, nenhum tocado).
**Escopo executado**: implementação **na branch**. Nada foi executado no VPS além de leitura; nenhuma taxa gravada no banco; nenhum secret criado; nenhum timer instalado; nenhum deploy/merge. Chamadas externas de validação foram feitas **da máquina de desenvolvimento**, nunca da produção.
**Nota de escopo**: o enunciado foi truncado no item 4 ("Cache: implementar apenas…"). Interpretei-o como *implementar o mínimo que protege o banco sem nunca servir preço/câmbio velho* — a decisão e a evidência estão em §4, com a razão explícita de não haver o que implementar hoje.

---

## 1. CÂMBIO — provider sem chave, com validação cruzada (implementado)

### 1.1 Fontes testadas (da máquina de dev, 14/10/2026 — nenhuma chamada a partir do VPS)

| Fonte | Sem chave | HTTP | USD→BRL | USD→PYG | Veredito |
|---|---|---|---|---|---|
| `api.frankfurter.app` (ECB) | sim | 200 (1.383 ms) | 5,0242 | **ausente** | **Descartada**: o ECB não publica PYG |
| `open.er-api.com/v6/latest/USD` | sim | 200 (**208 ms**) | 5,015062 | **5710,951674** | **Primária** (PYG + metadados `time_last_update_utc`/`time_next_update_utc`) |
| `cdn.jsdelivr.net/.../currency-api@latest/v1/currencies/usd.json` | sim | 200 (**103 ms**) | 5,02743305 | 5715,14457105 | **Secundária** (taxas sob `usd.*`) |
| `latest.currency-api.pages.dev` (espelho) | sim | 200 (309 ms) | 5,02743305 | 5715,14457105 | **Espelho** da secundária (valores idênticos) |

**Divergência medida entre as duas fontes independentes**: **0,073% (PYG)** e **0,246% (BRL)** — ou seja, elas concordam dentro de ~0,25%.

### 1.2 O que foi implementado

`src/domains/exchange/providers/KeylessExchangeRateProvider.ts` + registro em `bootstrap.ts` (1 linha):

- **`priority = 3`** — por último de propósito: sem nenhuma chave configurada, os providers 1 e 2 (`exchangerate-api`, `open-exchange-rates`) falham no `refresh()` e o **failover já existente** cai neste. Resultado: câmbio funcional **sem nenhuma configuração nova** — não é preciso criar credencial. Se um dia uma chave for definida, o provider pago volta a ter precedência **sem alterar código**.
- **Sanidade por faixa**: `USD_PYG ∈ [4000, 12000]`, `USD_BRL ∈ [3, 12]`. Resposta fora da faixa é **descartada como resposta ruim**, não tratada como taxa (pega o caso clássico de erro de escala de 100× ou HTML de portal cativo parseado).
- **Validação cruzada**: as duas fontes são consultadas em paralelo; se ambas respondem e **divergem mais de 2%** (8× o ruído real medido), o provider **lança erro** e **nada é publicado** — o serviço marca a indisponibilidade e a conversão continua oculta, em vez de exibir um número errado.
- **Falha fechada**: se nenhuma fonte responder, lança (não devolve valor aproximado, não inventa taxa, não grava nada).
- **Custo/latência**: 208 ms (primária) e 103 ms (secundária) em paralelo ⇒ ~210 ms por ciclo. Zero credencial, zero estado.

### 1.3 Validação

`src/domains/exchange/__tests__/KeylessExchangeRateProvider.test.ts` — 10 casos, **sem rede** (`fetchJson` mockado): fontes concordando; primária fora (failover); CDN primário fora (espelho); ambas fora (falha fechada); faixa de sanidade (57,1 rejeitado); divergência de +22% rejeitada; **divergência real de 0,073% aceita**; resposta malformada rejeitada; helpers puros.

### 1.4 O que **não** foi feito (e por quê)

Nenhuma taxa foi **gravada** no PostgreSQL (a missão proíbe e não há caminho de escrita autorizado) e nenhuma conversão passou a ser exibida. Para ativar: disparar `exchange/refresh` **uma vez** com `CRON_SECRET` → `ExchangeRateService` usa o provider novo, grava as linhas e o site passa a converter com dado verificável. Antes disso, a decisão de **produto** segue pendente: com `exchange_rates` vazio, exibir ou não a conversão (transparência × estimativa).

---

## 2. CRONS — plano corrigido, sem duplicação e sem simultaneidade

### 2.1 Bug real encontrado e corrigido

A versão da 05.18 comparava `date -u +%M` (que devolve **dois dígitos**: `"00"`, `"05"`) com padrões sem zero à esquerda (`case "$MIN" in 0|5|10|…)`). Consequência: **os minutos 00 e 05 nunca casavam** e o refresh de câmbio — a rota mais sensível a frescor — era **silenciosamente pulado 2×/hora**. Corrigido para aritmética numérica (`MIN=$((10#$(date -u +%M)))`) com `% 5` / `% 15` e comparações inteiras para as horas. O teste de deriva agora **proíbe** a volta do padrão antigo.

### 2.2 Frequências preservadas (original → novo plano)

| Endpoint | Original | Plano self-hosted |
|---|---|---|
| `exchange/refresh` | `*/5` (GHA) | `MIN % 5 == 0` ✅ |
| `realtime-commerce/market-pulse` | `*/15` (GHA) | `MIN % 15 == 0` ✅ |
| `realtime-commerce/buyer-alerts` | `*/15` (GHA) | `MIN % 15 == 0` ✅ |
| `canonical-catalog/merge-suggestions` | `*/15` (GHA) | `MIN % 15 == 0` ✅ |
| `connectors/sync` | `*/15` (GHA) **e** 06:00 (vercel.json) | `MIN % 15 == 0` ✅ (mantida a frequência **maior**; a rota só roda conectores DUE, então é idempotente e não duplica trabalho) |
| `canonical-catalog/outbox-maintenance` | 03:00 (vercel.json) | `HOUR == 3 && MIN == 0` ✅ |
| `marketplace-operations/snapshot` | 07:00 (vercel.json) | `HOUR == 7 && MIN == 0` ✅ |

### 2.3 Sem execuções duplicadas nem simultâneas (duas barreiras independentes)

1. **systemd**: o unit é `Type=oneshot` **sem** `RemainAfterExit` — o systemd **recusa** iniciar uma unit já ativa, então se uma execução ultrapassar os 5 min do timer o disparo seguinte é **descartado, nunca sobreposto**. (O teste verifica as duas propriedades.)
2. **`flock -n`** no script: protege também execuções manuais concorrentes e sai em silêncio se já houver uma em curso.
3. **Chamadas HTTP sequenciais** (`call` aguarda cada resposta), nunca em paralelo — sem rajada contra o PostgREST.
4. Nova opção **`dry-run`**: imprime exatamente o que faria **sem chamar nada** (usar no ensaio do cutover) — verificada por teste.

### 2.4 Desativação coordenada dos agendadores antigos (preparada)

- **`vercel.json`**: o array `crons` foi **removido** (arquivo agora `{}`). Efeito operacional **hoje: nenhum** — a conta Vercel está suspensa (402), esses disparos já não ocorrem. O ganho é não recriar duplicação quando o site voltar a subir em outro lugar. (Garantido por teste.)
- **`.github/workflows/high-frequency-crons.yml`**: **desligar no dia do cutover** (`schedule:` removido, mantendo `workflow_dispatch`), na mesma janela em que o `paraguai-crons.timer` é habilitado. Deixei o workflow **intocado** de propósito: ele é a rede de segurança até o timer estar comprovado em produção, e alterá-lo agora apagaria a última via de disparo existente.
- **Ordem obrigatória**: (1) `CRON_SECRET` no `app.env` → (2) teste `run-crons.sh all` manual → (3) `dry-run` conferindo a grade → (4) instalar/enable do timer → (5) observar 1 h de `journalctl -u paraguai-crons` → (6) desligar o workflow. **Nunca** os dois agendadores ativos ao mesmo tempo (com exceção de `connectors/sync`, cuja repetição é inócua).

### 2.5 Dívida de documentação corrigida no radar

`docs/engineering/CRON_INFRASTRUCTURE.md` (2026-07-06) ainda descreve **5 rotas** e "2 diárias no vercel.json". Hoje são **7 rotas** e o `vercel.json` tinha 3. A atualização do doc entra junto com o cutover (o teste de deriva passa a ser a fonte de verdade executável).

---

## 3. DEPLOY — auditoria, correções e testes

### 3.1 Problemas encontrados na auditoria do `deploy.sh` (todos corrigidos)

| # | Problema | Correção |
|---|---|---|
| 1 | **Checkout sujo só avisava** — a imagem publicada não corresponderia ao sha registrado, quebrando a rastreabilidade | Agora **aborta**, exigindo `--force` (explícito, para ensaio) |
| 2 | Nenhuma validação do compose antes do build | `compose config --quiet` **antes** de gastar 4–6 min de build e um restart |
| 3 | `--rollback` chamava `docker compose` **sem** `--env-file` (inconsistente com o resto) e **não reescrevia** o sha registrado — `.deployed-commit` passava a mentir | Usa o helper `compose()` e restaura o sha anterior de `.deployed-commit.previous` |
| 4 | Sucesso e interrupção podiam ser indistinguíveis no fim da execução | Mensagem final explícita (`DEPLOY CONCLUÍDO` / `ROLLBACK CONCLUÍDO`) |
| 5 | `--status` não mostrava a versão anterior | Mostra imagem no ar, commit atual e commit anterior |

### 3.2 O que já estava correto (verificado)

Toca **apenas** `paraguai-web` — o stack Supabase tem projeto/rede próprios e **nenhum** nome de container do stack aparece no script (o teste verifica isso por regex). Versão identificável (tag `paraguai-web:<sha>` + `:previous` + `.deployed-commit`). Rollback **sem rebuild** (retag + `up -d`) com os mesmos gates. Gates `health → smoke → warm-up` (o warm-up elimina o cold start de ~4 s medido na 05.17). Segredos: o script **não** lê nem ecoa segredo algum — eles ficam em `/etc/paraguai/app.env` (0600) consumido pelo `env_file` e pelo build secret.

### 3.3 Testes automatizados adicionados

`infra/selfhosted/app/__tests__/cron-schedule.test.ts` (coletado pelo Jest via `testMatch: **/__tests__/**/*.test.ts`) — **12 verificações** de infraestrutura, que antes não existiam: os 7 endpoints (contagem, unicidade, `requireCronSecret` + `GET`), nenhum endpoint órfão em relação ao plano, frequências preservadas por grupo, proibição do bug de zero à esquerda, `flock` + `oneshot` sem `RemainAfterExit`, `OnCalendar=*:0/5`, `vercel.json` sem crons, existência do `dry-run`, e as garantias do `deploy.sh` (recusa de checkout sujo, `--force`, `config --quiet`, `--rollback`, ausência de referência ao stack Supabase).

---

## 4. CACHE — decisão: implementar o mínimo provado, que hoje é **não cachear**

O item 4 do enunciado chegou truncado ("implementar apenas…"). Interpretando como *"implementar apenas o mínimo necessário para proteger o banco"*, a resposta honesta, com os números que já tenho, é que **não há cache a implementar agora** — e explicito por quê, em vez de introduzir risco:

| Fato medido (Missions 05.17/05.19) | Consequência |
|---|---|
| Os 7 endpoints de cron estão autenticados, mas o **tráfego de leitura** é o custo | é o ponto de atenção real |
| RPC de catálogo (`search_products_catalog`) = **0,52–0,58 s** de PostgreSQL+PostgREST — e ela é **portadora de preço** | cachear = servir preço velho ⇒ **proibido** pela regra permanente |
| `/products` a quente: TTFB **0,06–0,10 s**, **abaixo** do piso da RPC | a página **já não** reexecuta a RPC em cache hit ⇒ não há custo recorrente provado a eliminar |
| Leituras sem preço (`stores` = 11 linhas, categorias, marcas) | custo desprezível; cachear não protege nada de relevante |
| Leituras de preço (`offers`, `price_history`, `exchange_rates`) | **devem** permanecer dinâmicas, invalidadas por evento |

**Portanto**: (a) **nada foi alterado** em código de cache — nem `revalidate`, nem `use cache`, nem `unstable_cache` (cuja API mudou no Next 16.2.9; qualquer trabalho aqui exige antes ler `node_modules/next/dist/docs/08-caching.md` e `09-revalidating.md`); (b) o que **foi** implementado é a barreira que impede a regressão futura: o teste de deriva + as regras registradas. **Gatilho objetivo para revisitar**: se `pg_stat_statements` mostrar a RPC de catálogo acima de ~20 chamadas/minuto em regime (hoje, com o site fora do ar, o valor é irrelevante) **ou** quando a listagem de `/products` for separada em "casca" (cacheável) e "melhor preço" (dinâmico) — aí sim o cache protege o banco sem violar frescor de preço.

---

## 5. GO / NO-GO

**GO** — os bloqueios da 05.18 que eram código foram resolvidos: câmbio passa a funcionar **sem chave** com validação cruzada e falha fechada (testado, 10 casos); o plano de cron foi **corrigido de um bug real**, preserva as 7 frequências, não permite sobreposição (systemd + `flock`, verificado por teste) e a desativação coordenada está preparada; o `deploy.sh` foi auditado, com 5 defeitos corrigidos e agora coberto por teste; o cache está decidido com base em medição, não em suposição.
**GO CONDICIONAL para o cutover** — faltam ações humanas/operacionais, não código: (1) definir a política de exibição de conversão (§1.4); (2) criar `CRON_SECRET` e custodiar em `/etc/paraguai/app.env` 0600; (3) ensaiar `deploy.sh --status` → `--dry-run` dos crons → deploy supervisionado; (4) habilitar o timer e **depois** desligar o workflow GHA; (5) Caddy/DNS + regra negando `/api/cron/*` na borda; (6) rotação do log do Kong (4,3 GB, sem `max-size`).
**NO-GO** nesta missão para: gravar taxas no banco, publicar conversões, criar secrets, instalar timers, rodar crons, alterar Caddy/DNS/Docker, aplicar cache, deploy ou merge. **Nada fora desta branch foi alterado.**

**Limitações declaradas**: as chamadas às fontes de câmbio foram feitas da máquina de desenvolvimento (nunca da produção) e refletem o instante da coleta; a disponibilidade contínua dos provedores sem chave não pode ser garantida por contrato (é exatamente por isso que a falha é fechada e há duas fontes + espelho); `deploy.sh` continua **não executado** (sem Docker na máquina de dev) — a primeira execução deve ser um ensaio; o teste de deriva valida invariantes declarativos (contagem, autenticação, frequências, flags), não o comportamento em tempo de execução do systemd.
