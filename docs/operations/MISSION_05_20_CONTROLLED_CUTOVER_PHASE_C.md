# MISSION 05.20 — FASE C: ATIVAÇÃO DE CRONS E CÂMBIO

**Categoria**: `docs/operations/`
**Branch**: `mission-05-20-controlled-cutover` (base `0eb97f3`)
**RESULTADO: interrompida por PONTO DE PARADA** — a ativação do câmbio **não persiste taxas** por um motivo que só se corrige com ação proibida nesta fase. Os agendamentos ficaram em estado seguro e reversível.

## 0.1 Autorização × execução

| Autorizado | Feito |
|---|---|
| Validação positiva/negativa de `requireCronSecret` em teste isolado | ✅ coberta por `lib/__tests__/cron-auth.test.ts` (positivo + 3 negativos, sem endpoint e sem DML) |
| Instalação e ativação dos timers próprios | ✅ units instaladas; timer **habilitado e depois desabilitado** (§C.4) |
| Desativação coordenada do GitHub Actions | ⚠️ **parcial e documentada** — não é efetivável sem push em `main` (§C.3) |
| **Uma** execução supervisionada do câmbio, gravando só as taxas previstas | ✅ executada **uma** vez — `http=200`, **0 taxas gravadas** (falha de escrita, §C.2) |
| Verificação de logs, métricas, integridade e agendamentos | ✅ (§C.5, §C.6) |

**Proibições respeitadas**: nenhum DDL, nenhuma migration, nenhuma outra tabela alterada, **nenhum** dos outros seis crons executado, nada em DNS/Caddy/Kong/Supabase, nenhum merge em `main`, frontend não exposto.

---

## C.1 Testes de autenticação (item 2) — isolados, sem DML

**Não criei arquivo novo**: verifiquei que `lib/__tests__/cron-auth.test.ts` **já cobre** o essencial e é isolado (não chama endpoint):

| Caso | Resultado |
|---|---|
| Bearer com o segredo correto | **`null` (autorizado)** — validação **positiva** ✅ |
| Sem header `Authorization` | 401 |
| Segredo errado | 401 |
| `CRON_SECRET` não configurado | 401 (**fail-closed**) |

Cheguei a escrever um segundo arquivo com casos extras (esquema ausente, mesmo tamanho/conteúdo diferente, tamanho diferente, sufixo colado, segredo curto) e **removi-o** ao constatar a sobreposição — dois arquivos testando o mesmo guard é duplicação, não cobertura. Os casos extras são um incremento recomendado, não um requisito da fase.
Somam-se as evidências **negativas em rota real** já obtidas na Fase A: sem header → **401**, segredo errado → **401**. A validação **positiva em rota** continua fora de escopo (executaria escrita).

## C.2 Ativação do câmbio (itens 7/8) — o achado que interrompe a fase

Execução supervisionada, **uma** vez:

```
2026-10-14T19:40:58Z exchange-refresh   http=200
2026-10-14T19:40:58Z SKIP market-pulse / buyer-alerts / merge-suggestions
                      / connectors-sync / outbox / snapshot   (não autorizado)
{"data":{"providerId":"keyless-open-er-api","usingFallback":false,"ratesRefreshed":0}}
```

**O provedor sem chave FUNCIONA e é o escolhido** (`providerId: keyless-open-er-api`, `usingFallback: false`) — o objetivo funcional da Fase 05.19 está cumprido no nível da aplicação. **Mas nenhuma taxa é gravada**, e a causa está no log do próprio container:

```
[SupabaseExchangeProviderRunRepository.create] 404 page not found   (×3)
[SupabaseExchangeRateRepository.insert]        404 page not found   (×3)
[cron/exchange/refresh] refreshed 0 rate(s) from provider "keyless-open-er-api".
```

`404 page not found` em **texto puro** é — conforme **provado na Fase B** — o PostgREST respondendo quando a **relação não está no schema cache**. Duas tabelas diferentes (`exchange_rates` e `exchange_provider_runs`) falham na escrita, embora `to_regclass` confirme que existem no catálogo. Há **194** linhas em `exchange_provider_runs` (de eras anteriores), o que reforça que a tabela existe e que a **visibilidade via PostgREST** é o que se perdeu.

**Correções possíveis — todas fora da autorização desta fase**: (a) recarregar o schema cache do PostgREST (`NOTIFY pgrst, 'reload schema'`) → é mudança em Supabase/Kong, **proibida**; (b) aplicar migrations/DDL → **proibido**. Pelo ponto de parada declarado ("*se a atualização de câmbio exigir alterações inesperadas no banco, interromper*"), **interrompi**.

**Estado dos dados (nenhuma taxa registrada)**: `exchange_rates` = **0** antes e depois; `exchange_provider_runs` = **194 → 194**; `exchange_conversion_log` = 0. **Fonte prevista das taxas**, quando a escrita for restabelecida: `open.er-api.com` (primária) e `currency-api` (secundária), com PYG 5710,95 / BRL 5,0150 e 5715,14 / 5,0274 medidos da produção na Fase B (divergência 0,07–0,25%) — **nada foi gravado**.

## C.3 GitHub Actions — status e por que a desativação é parcial

- Arquivo: `.github/workflows/high-frequency-crons.yml` (schedule `*/5` e `*/15`), **intocado**.
- **Não é possível desativá-lo operacionalmente nesta fase**: workflows agendados rodam a partir do **branch default (`main`)**; alterar o arquivo no meu branch **não** muda nada até um merge em `main` — que é **proibido** — e desligar via API/UI exigiria `gh` (não instalado) e alteração de conta (não autorizada).
- **Evidência de ausência de duplicação (o que importa para o risco)**: o workflow **não consegue alcançar o frontend**, porque o VPS não tem nenhuma rota pública até ele. Medido agora:

| Hostname público | Resposta | Quem respondeu |
|---|---|---|
| `api.fronteiraai.com/api/cron/exchange/refresh` | **401** | **Kong/PostgREST** (exige `apikey`) — nunca chega ao Next.js |
| `www.fronteiraai.com/api/cron/exchange/refresh` | **402** | Vercel suspensa (`DEPLOYMENT_DISABLED`) |

  Somado a isso, o workflow exige `secrets.CRON_SECRET` + `vars.CRON_APP_URL` e **emite `::warning::` e não dispara nada** quando faltam. Conclusão: **ligar o timer do VPS não cria execução dupla hoje**. O patch pronto para o dia do cutover é remover o bloco `schedule:` do workflow (mantendo `workflow_dispatch`), no mesmo commit do merge.

## C.4 Timer — instalado, habilitado por instantes, hoje desabilitado

- Units instaladas: `/etc/systemd/system/paraguai-crons.{service,timer}` (o `.service` é `static`, ativado pelo timer).
- **Isolamento (requisito do ponto de parada)**: implementado por **allowlist fail-closed** em `/etc/paraguai/cron-allow.txt` (`root:root 0644`, fora do Git), contendo **apenas** `exchange-refresh`. Sem o arquivo — ou sem a chave — o script **não chama nada** e registra `SKIP`. Evidência: antes de criar o arquivo, o `dry-run` já imprimia `SKIP exchange-refresh (não autorizado…)`; depois, a execução `all` rodou **1** endpoint e deu **`SKIP` nos seis outros**. Como o serviço invoca exatamente esse script, a barreira vale para o timer.
- Histórico: `systemctl enable --now` às **19:43** (symlink criado, próximo disparo 19:45) e `disable --now` às **19:43**, **antes** do primeiro disparo — o journal do serviço está vazio, ou seja, **o timer nunca executou nada**. Portanto: a compatibilidade POSIX (`sh -n` e `dash -n`, ambos exit 0) e o isolamento estão comprovados **no nível do script**; **não** afirmo evidência de execução disparada pelo timer.
- **Plano de reversão/reativação**: reativar = `sudo systemctl enable --now paraguai-crons.timer`; reverter tudo = `sudo systemctl disable --now paraguai-crons.timer` (já aplicado) + `sudo rm /etc/systemd/system/paraguai-crons.{service,timer}` + `sudo systemctl daemon-reload`. Para autorizar mais crons, basta acrescentar as chaves ao allowlist (`market-pulse`, `buyer-alerts`, `merge-suggestions`, `connectors-sync`, `outbox`, `snapshot`).

## C.5 Métricas antes × depois

| Métrica | Antes (19:40) | Depois (19:43) |
|---|---|---|
| Containers | 9 `healthy` | **9 `healthy`** (8 Supabase `Up 7 days`) |
| Conexões PostgreSQL | **3** | **3** |
| `exchange_rates` | 0 | **0** (sem escrita) |
| `exchange_provider_runs` | 194 | **194** |
| `PGRST003` / `57014` | 67 / 1.169 | **67 / 1.169** (nenhum erro novo) |
| `load` / RAM | 1,21 / 1.691 MB | 1,05 / 1.696 MB (4.407 livres) |
| Frontend | `paraguai-web:a2fcec0`, healthy, 0 restarts | inalterado |

## C.6 GO / NO-GO para publicação dos domínios

**NO-GO.** A fase cumpriu o que dependia dela — autenticação validada (positiva e negativa, isolada), isolamento do câmbio garantido por allowlist fail-closed, compatibilidade POSIX provada, uma única execução supervisionada, stack intacto, zero regressão — **mas o objetivo central (restabelecer a atualização automática do câmbio) NÃO foi alcançado**: o provider é selecionado corretamente e obtém taxas, e as **escritas falham com 404 do PostgREST**, o que é exatamente o mesmo defeito de visibilidade de relação que produzia os 404 do build. Publicar domínios com um comparador de preços que **não consegue gravar taxa de câmbio** — e com um sinal de que outras escritas no mesmo caminho podem falhar — violaria a regra de negócio do produto (conversão precisa) e o princípio de "não publicar dado não confiável".

**Próximos passos mínimos antes de reabrir o cutover** (todos exigem autorização nova, pois tocam banco/Supabase):
1. **Recarregar o schema cache do PostgREST** (`NOTIFY pgrst, 'reload schema'`) e reexecutar **uma** atualização de câmbio — é a hipótese principal e a menos invasiva.
2. Se não bastar, investigar por que `exchange_rates`/`exchange_provider_runs` não estão visíveis (incluindo se a definição da tabela tem coluna exigida pela aplicação que não existe) — sem presumir sem evidência.
3. Reabilitar o timer com o allowlist **só de câmbio** e confirmar 1 disparo real gravando taxa.
4. Só então: Caddy + DNS + negação de `/api/cron/*` na borda (D6/D7) e o patch do workflow GHA.

**Limitações declaradas**: o timer esteve habilitado por menos de um minuto e nunca disparou (journal vazio); o teste extra de `requireCronSecret` foi removido por duplicar cobertura existente; a desativação do GHA está documentada, não efetivada, porque exige push em `main`; `exchange_conversion_log` e `exchange_provider_runs` foram apenas **lidas**.
