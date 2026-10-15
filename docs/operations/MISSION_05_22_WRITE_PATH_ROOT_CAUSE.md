# MISSION 05.22 — POSTGREST WRITE PATH ROOT CAUSE

**Categoria**: `docs/operations/`
**Branch**: `mission-05-22-write-path-root-cause` (base `mission-05-21-postgrest-cache-recovery` @ `c36fdca`)
**RESULTADO: CAUSA COMPROVADA.** O PostgREST, o cache, o Kong e o RLS estão **saudáveis**. O problema é **um único valor de configuração errado** em `/etc/paraguai/app.env`, introduzido por **mim** na Fase A desta série. Nada foi alterado em produção nesta missão.

## 0.1 Autorização — cumprida integralmente

Autorizado: diagnóstico read-only, inspeção de logs/configurações, testes HTTP **sem efeitos de escrita**. Não autorizado (e **não executado**): POST com payload persistível, DML, DDL, alterações de RLS/Kong/PostgREST/Docker/banco/secrets, deploy, merge, crons, DNS. O único POST feito carregava **array vazio** (`[]`), que não grava linha alguma (comprovado: `http=201` e `exchange_rates` seguiu com **0** linhas).

---

## 1. Evidência da camada responsável pelo 404

O corpo do erro da aplicação é **texto puro**:

```
404 page not found\n
```

Isso **não é** resposta do PostgREST (que responde JSON com `code`/`proxy-status`, como comprovei nos probes: `PGRST125`, `PGRST202`, `42501`) nem do Kong (JSON `no Route matched`) nem do Caddy (`404 Not Found`). Texto puro `404 page not found` com nova linha é o `http.NotFound` do **Go** — e o único serviço Go na rota é o **GoTrue (`supabase-auth`)**.

## 2. Comparação GET × POST (mesmo endpoint, sem escrita)

| Requisição (via `https://api.fronteiraai.com`) | HTTP | Corpo |
|---|---|---|
| `GET /rest/v1/exchange_rates?select=pair&limit=1` | **200** | `[]` (tabela vazia e **acessível**) |
| `GET /rest/v1//exchange_rates` (barra dupla) | **200** | `[]` |
| `GET /rest/v1/exchange_rates/` (barra final) | **404** | **JSON** `PGRST125 Invalid path specified in request` |
| `POST /rest/v1/exchange_rates` com **`[]`** (zero DML) | **201** | vazio (rotas de POST **funcionam**) |
| `POST /rest/v1/exchange_rates` com `anon` e payload incompleto | **401** | **JSON** `42501 new row violates row-level security` |
| `OPTIONS /rest/v1/exchange_rates` | **200** | métodos roteados |
| **`GET /rest/v1/rest/v1/exchange_rates?select=pair&limit=1`** | **404** | **`{"code":"PGRST125"…}`** (JSON — **não** é o corpo do app) |
| **`GET /rest/v1/rest/v1/stores?select=id&limit=1`** | **404** | JSON `PGRST125` |

**Conclusão**: POST está roteado, o recurso existe e é acessível, e **nenhuma** variante testada produz o texto puro do app. O 404 do app vem de **outra camada com outro caminho**.

## 3. Papel efetivo do cliente e o valor da URL (a prova)

```
NEXT_PUBLIC_SUPABASE_URL: comprimento=35  prefixo=https://  ultimos8=/auth/v1
```

`https://api.fronteiraai.com` tem **27** caracteres; o valor medido tem **35** — a diferença de 8 é exatamente **`/auth/v1`**. Ou seja:

```
NEXT_PUBLIC_SUPABASE_URL = https://api.fronteiraai.com/auth/v1     ← GoTrue, não PostgREST
```

- `lib/supabase.ts` (cliente anon) usa `env.NEXT_PUBLIC_SUPABASE_URL`;
- `lib/supabase/service.ts` (cliente de **service_role**, o usado pela rota de câmbio via `getSupabaseServiceClient()`) usa **a mesma** variável (`process.env.NEXT_PUBLIC_SUPABASE_URL`) + `SUPABASE_SERVICE_ROLE_KEY`.

⇒ Todo cliente da aplicação faz requisições para **`https://api.fronteiraai.com/auth/v1/rest/v1/<tabela>`** → o Kong roteia o prefixo `/auth/v1` para o **GoTrue** → o GoTrue não conhece esse caminho e responde **`404 page not found`** (texto puro, Go) ✓ **explica exatamente o corpo observado**.

## 4. O cliente usa `service_role`? Sim — e isso está comprovado

`POST` com **service_role** do array vazio → **201**; `POST` com **anon** → **401 `42501`**. O service_role **não** é barrado por RLS, e é o cliente que a rota de câmbio injeta. Portanto o role **não** é o problema.

## 5. Políticas RLS (a lacuna da 05.21, fechada)

| Tabela | RLS | Políticas |
|---|---|---|
| `exchange_rates` | habilitada | **0** |
| `exchange_provider_runs` | habilitada | **0** |

Com RLS ligada e **nenhuma política**, o papel `anon` é **negado por padrão** (o 401/`42501` medido). Isso é irrelevante para as escritas da aplicação (que usam `service_role`, que ignora RLS), mas é um achado que fica registrado: **as tabelas de câmbio só são graváveis pelo service_role** — coerente com o desenho, e um risco se algum dia o anon precisar escrever.

## 6. Roteamento de métodos (Kong/Caddy — auditado, não modificado)

Kong usa `/opt/supabase-stack/docker/volumes/api/kong.yml` (rotas por prefixo, com `strip_path: true` nos serviços de auth). **Nenhuma restrição de método** explica os sintomas: o `POST` direto em `/rest/v1/...` retorna 201. O papel do Kong aqui é apenas **rotear por prefixo**, e é isso que faz `/auth/v1/*` ir para o GoTrue.

## 7. Causa comprovada

> **`NEXT_PUBLIC_SUPABASE_URL` está com o sufixo `/auth/v1`**, apontando para o GoTrue em vez da raiz da API. Como **todos** os clientes Supabase da aplicação derivam dessa variável, **leitura e escrita** vão para `/auth/v1/rest/v1/...` e recebem o 404 de texto puro do GoTrue. O banco, o PostgREST, o cache de schema, os GRANTs, o Kong e a RLS estão **íntegros**.

**Como isso passou pelos testes das fases anteriores (autocrítica registrada)**: em 05.16/A eu populei `app.env` com `NEXT_PUBLIC_SUPABASE_URL=$(grep '^API_EXTERNAL_URL' /opt/supabase-stack/docker/.env)` — e no `.env` do Supabase self-hosted **`API_EXTERNAL_URL` é a URL externa do GoTrue** (`.../auth/v1`), não a raiz da API. Verifiquei apenas o **esquema** (`https://`) e a **presença** da chave, nunca a forma completa do valor. Pior: os smoke tests das fases B/C validavam **HTTP 200**, e as páginas **degradam graciosamente para vazio** — 200 sem dados ✓. Foi por isso que "tudo passava" enquanto nada funcionava; os únicos sinais eram os `404 page not found` no log, que eu atribuí (erroneamente, nas Missões 05.17/05.20/05.21) a relação ausente no PostgREST. **A atribuição anterior está retratada.**

**O que NÃO é causa** (tudo refutado com evidência): cache de schema do PostgREST; GRANTs; tabela inexistente; RLS nas escritas (usa service_role); schema do cliente (`public`); roteamento de método no Kong; e — confirmado agora — o corpo do erro **não** é produzido pelo PostgREST.

## 8. Correção mínima proposta

1. **Uma linha**, em `/etc/paraguai/app.env` (`root:root 0600`, já existe): trocar
   `NEXT_PUBLIC_SUPABASE_URL=https://api.fronteiraai.com/auth/v1`
   por `NEXT_PUBLIC_SUPABASE_URL=https://api.fronteiraai.com`.
   *(O valor correto é derivável do próprio host: a raiz de `api.fronteiraai.com`; mais robusto: `API_EXTERNAL_URL` com o sufixo `/auth/v1` removido.)*
2. **Rebuild da imagem** — obrigatório: `NEXT_PUBLIC_*` é **inlined no bundle do cliente em tempo de build**. Sem rebuild, o servidor passa a acertar (lê a env em runtime) mas os bundles do cliente continuam com a URL errada ⇒ **correção parcial e enviesada**. Caminho: `sudo /opt/paraguai-app/infra/selfhosted/app/deploy.sh` (build ~4 min + restart + gates + warm-up), seguido de **verificação de CONTEÚDO**, não de status.
3. **Critério de aceitação (corrige a falha metodológica)**: não basta 200 — exigir que `/lojas` liste lojas reais, que `/product/<slug>` mostre ofertas, que a resposta do cron de câmbio traga `ratesRefreshed ≥ 2` e que `exchange_rates` fique **> 0**, com `/api/exchange/current` devolvendo `usdPyg`/`usdBrl`.

**Riscos da correção**: (a) exige restart do container (não autorizado nesta missão); (b) com a URL certa o app volta a fazer **tráfego real ao PostgREST** — o perfil de carga pré-cutover retorna, e a proteção de banco/cache da 05.17 volta a ser relevante; (c) o build roda com o ambiente de `app.env` — o valor errado **também** afetava o prerender (foi por isso que as páginas ficaram vazias e rápidas), então a correção muda a natureza do build (mais dados, mais lento); (d) nenhum risco para dados: a mudança é de configuração de URL.

## 9. GO / NO-GO

**GO** para a intervenção **específica** desta correção, em missão própria, com escopo declarado:
1. corrigir **uma** variável em `/etc/paraguai/app.env` (sem criar nem expor segredo);
2. `deploy.sh` (build + restart supervisionado do **apenas** `paraguai-web`);
3. verificação de **conteúdo** (o critério do §8.3), métricas e integridade dos 9 containers;
4. só então reavaliar a atualização de câmbio (que deve passar a persistir).

**NO-GO** para: publicar domínios, habilitar timers, ou qualquer alteração em Caddy/DNS/Kong/PostgREST/RLS/banco — nenhuma delas é necessária: **o defeito não está na infraestrutura, está em uma variável de ambiente que eu mesmo configurei**.

**Limitações declaradas**: não executei a correção (não autorizado) nem qualquer POST com payload persistível; não reli o `sanitizeEnvVar` de `lib/supabase/service.ts` (não é necessário: a variável é a mesma nas duas pontas); o valor da variável foi verificado por **comprimento e sufixo**, sem imprimir o valor integral; a auditoria do Kong foi por leitura do `kong.yml` e por comportamento observado, sem alterar configuração.
