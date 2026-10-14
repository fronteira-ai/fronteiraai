# MISSION 05.20 — CONTROLLED PRODUCTION CUTOVER (FASE A)

**Categoria**: `docs/operations/`
**Branch**: `mission-05-20-controlled-cutover` (de `mission-05-19-final-cutover` @ `b3ff347`)
**Estado**: **Fase A executada; execução PARADA ao final dela, aguardando autorização** — o enunciado recebido está truncado no item A.5, e não há autorização explícita para as fases seguintes.

## 0.1 Regras respeitadas

| Regra | Situação |
|---|---|
| Preservar os 8 containers Supabase, PostgreSQL, Kong, Auth, Storage, backups e `/opt/paraguai` | ✅ 9 containers `healthy` antes e depois; `/opt/paraguai` intacto |
| Não executar DDL/DML nem migrations | ✅ `exchange_rates` = **0 linhas** antes e depois; nenhum comando de escrita |
| Não alterar `origin/main` sem autorização | ✅ `origin/main` = `c43538b` |
| Não imprimir/versionar/expor secrets | ✅ `CRON_SECRET` gerado no host e **nunca impresso** (verificação só por contagem de bytes); `/etc/paraguai/app.env` segue `600 root:root` e fora do Git |
| Não iniciar crons antes de validar autenticação e agendamentos | ✅ nenhum cron iniciado; nenhum timer instalado; validação **negativa** feita (§A.3b) |
| Não executar testes de carga contra produção | ✅ nenhum |
| Parar e pedir autorização em bloqueio não previsto | ✅ **para os itens cuja instrução não chegou** (§0.2 e §F.1) |

## 0.2 Bloqueio declarado (motivo da parada)

O enunciado chegou truncado em **"Fase A — item 5: Execut…"**. Não tenho autorização textual para: habilitar crons/instalar timers, construir e publicar a nova imagem, ou mexer em Caddy/DNS para publicar `fronteiraai.com`/`www`. Pela própria regra da missão ("parar e solicitar autorização diante de qualquer bloqueio não previsto"), **não avancei para nenhuma dessas ações**. O que segue está integralmente dentro do que o texto autoriza.

---

## A.1 Baseline (antes de qualquer alteração)

| Métrica | Valor medido (14/10 17:54 UTC) |
|---|---|
| Containers | **9 `healthy`** — `paraguai-web` (Up ~1 h) + os 8 Supabase (Up 7 days) |
| `load average` / RAM / disco | **1,39 / 1,04 / 0,96** · **1.629 MB usados** de 7.432 (4.457 disponíveis) · 26 GB de 91 GB (28%) |
| PostgreSQL | conexões **3** · `xact_commit` **11.129.702** |
| Erros acumulados | `PGRST003` **67** · `57014` **1.169** (inalterados desde 05.16/05.17 — sem novo sinal de contenção) |
| Consumo dos containers | `paraguai-web` **80,18 MiB / 1 GiB, 0,00% CPU** · `supabase-db` **264,2 MiB / 3 GiB, 0,01%** |
| Exposição pública | Caddy continua servindo **apenas** `api.fronteiraai.com → 127.0.0.1:8000`; **nenhum bloco para o site** ⇒ `fronteiraai.com`/`www` **não** estão no ar por este VPS |

## A.2 Artefatos da 05.19 — **bloqueio encontrado e resolvido**

**Achado**: `/opt/paraguai-app` continha a árvore de `dcbc03c` (05.15/05.16). **`deploy.sh`, `run-crons.sh` e o provider sem chave estavam AUSENTES no VPS** — os artefatos da 05.19 existiam apenas no Git.

**Ação**: transferência do estado de `b3ff347` por `git archive` (só o commit — nenhum arquivo não commitado, nenhum `.env.local`, apenas os dois `.example` rastreados) + extração em `/opt/paraguai-app` (1.787 arquivos).

**Verificação no VPS**: `deploy.sh`, `run-crons.sh`, `paraguai-crons.timer` e `KeylessExchangeRateProvider.ts` presentes; `sh -n` OK nos dois scripts; **`run-crons.sh dry-run` executado de verdade** (sem chamada HTTP) imprimindo a grade do plano.

### A.2.1 BUG CRÍTICO ENCONTRADO PELA PRÓPRIA VERIFICAÇÃO (e corrigido)

A primeira execução real do `dry-run` no VPS falhou:

```
run-crons.sh: 66: arithmetic expression: expecting EOF: "10#55"
```

**Causa**: a correção que eu havia feito na 05.19 usava `$((10#$(date -u +%M)))`, sintaxe **exclusiva do bash**. O VPS roda **dash** em `/bin/sh` — e `$((08))` também não serve, porque em POSIX zero à esquerda é **octal** (08/09 seriam erro). Consequência em produção: **nenhum cron rodaria**.
**Correção (POSIX)**: remoção textual do zero (`MIN=${MIN#0}`, `HOUR=${HOUR#0}`) + aritmética modular sobre valor já sem zero.
**Lição registrada no teste**: `bash -n` local **não** prova portabilidade de shell — o teste de deriva agora **proíbe** `10#` e exige a forma `MIN=${MIN#0}`. Foi exatamente para isso que a Fase A.2 existe.

## A.3 Ambiente seguro do frontend — `CRON_SECRET` criado

- Gerado no host com `openssl rand -hex 32` (**256 bits**, 64 hex) e gravado **apenas** em `/etc/paraguai/app.env`, que permanece **`600 root:root`** (6 linhas).
- O valor **não foi impresso** em nenhum momento; a verificação foi por contagem de bytes (65 = 64 hex + newline) e por **contagem de ocorrências** da chave, nunca pelo conteúdo.
- Nenhum secret foi versionado, copiado para o repositório ou enviado a terceiros.

### A.3b Validação de autenticação (negativa, sem efeitos colaterais)

| Chamada | Resultado |
|---|---|
| `GET /api/cron/exchange/refresh` sem header | **401** |
| `GET /api/cron/exchange/refresh` com segredo errado | **401** |

O guard `requireCronSecret()` está **fechando** corretamente. **A validação positiva (200 com o segredo real) NÃO foi executada** — e por um motivo de escopo: **todos** os 7 endpoints realizam trabalho de escrita (o próprio `exchange/refresh` insere linhas em `exchange_rates`), o que colide com a regra "não executar DML" desta missão. **Isso exige autorização explícita** e é o primeiro item pendente de §F.1.

## A.4 Política de conversão — ocultar conversão sem taxa válida

**Verificado no contrato de código**: `src/domains/exchange/types/MoneyPresentation.ts` documenta que a string de taxa ("1 USD = R$ 5,42") é **`null` quando não há taxa a exibir** — ou seja, a política pedida **já é o comportamento projetado**, e não existe taxa de fallback inventada no código.
**Estado real dos dados**: `exchange_rates` = **0 linhas**; `paraguai-web` responde **200** na home, em `/products`, `/lojas` e `/product/<slug>` (medido nas Missões 05.16/05.17), ou seja, a ausência de taxa **degrada** em vez de quebrar; `/api/exchange/current` responde 200 com lista vazia.
**Limitação declarada**: confirmei o contrato e o comportamento HTTP; **não** fiz inspeção visual em navegador para provar que nenhuma conversão é renderizada (seria um passo de verificação de UI, fora do read-only estrito que adotei).
**Fonte de câmbio alcançável a partir da produção** (somente leitura, sem credencial): `docker exec paraguai-web wget -q -O - https://open.er-api.com/v6/latest/USD` devolveu `{"result":"success","provider":"https://www.exchangerate-api.com",…}` ⇒ a fonte sem chave implementada na 05.19 é acessível **do próprio VPS**.

## A.5 `deploy.sh --status` (verificação não destrutiva)

Executado no VPS: apenas `docker inspect`/`docker images` — **não** constrói, **não** sobe, **não** derruba nada. (Resultado registrado no commit desta missão.)

---

## F.1 PENDÊNCIAS QUE EXIGEM AUTORIZAÇÃO EXPLÍCITA

| # | Ação | Por que precisa de autorização |
|---|---|---|
| **D1** | **Validação positiva do cron** (200 com o segredo) | implica **execução de escrita** (inserção de taxa / sync) — colide com "não executar DML" |
| **D2** | **Popular `exchange_rates`** | é DML; e falta a decisão de produto sobre exibir conversão (§A.4) |
| **D3** | **Construir/publicar a nova imagem** (com o provider sem chave) | exige `deploy.sh` real: build de 3–6 min + **restart do container** (autorizado nas Missões 05.16–05.19, **não** neste texto) |
| **D4** | **Instalar/habilitar `paraguai-crons.timer`** | "não iniciar crons antes de validar autenticação e agendamentos" — falta a etapa D1 |
| **D5** | **Desligar o workflow GHA** `high-frequency-crons.yml` | deve ocorrer na mesma janela de D4 |
| **D6** | **Publicar `fronteiraai.com` / `www.fronteiraai.com`** | exige bloco novo no Caddyfile + apontamento de DNS (Cloudflare, "DNS only" por causa do ACME HTTP-01) — **é o cutover propriamente dito**, não autorizado no texto recebido |
| **D7** | **Regra de borda negando `/api/cron/*`** | parte de D6 (defesa em profundidade; os crons são disparados por loopback) |
| **D8** | Rotação do log do Kong (4,3 GB, sem `max-size`) | recomendado antes de tráfego real |

## F.2 GO / NO-GO

**Fase A: CONCLUÍDA** — baseline registrado; artefatos da 05.19 transferidos e **executados de verdade** no VPS, o que expôs e corrigiu um bug que teria impedido **todo** o agendamento (`10#` em dash); `CRON_SECRET` criado com custódia correta e sem exposição; autenticação validada como *fail-closed*; política de conversão confirmada como "sem taxa ⇒ sem conversão"; stack Supabase e `/opt/paraguai` intactos; `origin/main` inalterado.
**NO-GO** para qualquer ação das fases seguintes enquanto D1–D7 não estiverem explicitamente autorizadas — em especial o cutover de DNS/Caddy (D6), que é irreversível do ponto de vista do usuário e deve ser a última coisa a acontecer, depois de D3–D5 verificados.

**Limitações declaradas**: (1) o enunciado está truncado; nada além do texto visível foi autorizado; (2) a validação de cron é negativa por força da regra de não-DML; (3) a política de conversão foi confirmada no contrato e no comportamento HTTP, não por inspeção visual; (4) `deploy.sh` foi executado apenas em modo `--status` (o caminho de build/restart permanece não exercitado em produção).
