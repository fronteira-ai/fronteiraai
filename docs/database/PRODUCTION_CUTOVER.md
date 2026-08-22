# PRODUCTION_CUTOVER — Sprint 38G

> Cutover controlado e reversível do Supabase Cloud para o self-hosted.
> **SELFHOSTED = PRIMARY** · **CLOUD = ROLLBACK SOURCE** (mantido intacto, período de observação).
> Status: **CONCLUÍDO 🟢** — cutover executado e validado.

## Timeline

| Marco | Timestamp (UTC) |
|---|---|
| T0 (snapshot 38F) | 2026-08-21 17:36:15 |
| T_FREEZE (FREEZE_MODE=LOGICAL) | 2026-08-22 20:20:53 |
| T_CUTOVER (env Vercel) | 2026-08-22 19:14:55 |
| Deploy production | 2026-08-22 ~19:17 (Ready in 2m) |

## Gates pré-cutover (todos verdes)

- **SCHEMA_DIFF=0**: `SEMANTIC_DIFF=0` (SHA `04801957…`) reconfirmado (Cloud × self-hosted).
- **DATA_DIFF=0**: fingerprint canônico 70/70 idêntico (Cloud == self-hosted) — **DRIFT=0** desde T0 (sem escritas live: `buyer_sessions` máx. 14:59/21, `health_snapshots` 07:33/21, `buyer_events` 17:30/20 — todos anteriores a T0).
- **STORAGE_DIFF=0**: 24.328 objetos / 764.870.722 bytes / paths idênticos (diff vazio) / mime `image/webp`.
- **API GREEN**: brands 964, products/offers/stores/canonical 200; service-only `[]`; anon INSERT → 401.
- **AUTH GREEN**: GoTrue health 200; login com credencial inválida → `400 invalid_credentials` (pipeline verifica hashes migrados); settings 200.

## Delta final

Re-executado o fingerprint completo com o MESMO método da 38F (`md5(string_agg(md5(to_jsonb(t)::text) ORDER BY hash))`): **DRIFT=0 em todas as 70 tabelas** — nada a sincronizar (FASE 3 da 38G não executou alterações).

## Storage

- Origem: bucket público `catalog` do Cloud (24.328 objetos, ~729 MB) — download via URL pública (anônima; throttling ~6-8 req/s por IP → cópia paralela P=64, ~50 min).
- Destino: bucket `catalog` (público) criado no self-hosted via Storage API (service role, Kong loopback).
- Mecanismo: 1 objeto = GET público Cloud → POST `x-upsert` self-hosted (content-type preservado); 16 falhas transitórias de download → retry; **resultado final: 24.328/24.328, bytes e paths idênticos ao Cloud**.
- Cache-control: `no-cache` (idêntico ao Cloud).
- Ferramenta: `scripts/copy-one.sh` (sprint-local, não versionado) + `scripts/storage-check.sql`.

## Cutover Vercel

- Env (production) alteradas — **3 variáveis** (únicas relacionadas a Supabase; `CRON_SECRET` intocada):
  - `NEXT_PUBLIC_SUPABASE_URL` → `https://api.fronteiraai.com`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → chave anon do self-hosted (len 169, verificada via API)
  - `SUPABASE_SERVICE_ROLE_KEY` → chave service do self-hosted (len 180, verificada via API)
- Método: API REST da Vercel (`/v9/projects/{id}/env` com `teamId`) — a CLI `vercel env add` deste ambiente gravou valores vazios (bug); a API foi usada com valores via arquivos (nunca em argv/relatório). Verificação pós: `GET .../env/{id}?decrypt=true` (valores decodificados, apenas comprimentos impressos).
- Deploy: worktree limpo de `main@227caf3` (mesmo código da produção anterior — a única variável é o backend) → `vercel deploy --prod` → **Ready in 2m**, aliased `https://www.fronteiraai.com`.

## Validação pós-cutover

- Homepage: HTTP 200, título correto, 203 KB.
- **Bundles JS: `api.fronteiraai.com` presente; `acairzpzsklctaqjsukw.supabase.co` AUSENTE (0 ocorrências em 12 chunks)** — env inlineado corretamente, sem resíduo Cloud.
- API pública: `api.fronteiraai.com/rest/v1/brands` 200 com dados; storage público 200 (primeiro e último objeto); auth health 200.
- RLS: leituras públicas OK; service-only `[]`; escrita anon 401.

## Auth

- `auth.users` 2, `auth.identities` 2 migradas na 38F. `auth.sessions` NÃO migradas → **USERS WILL REQUIRE RELOGIN** após o cutover (refresh tokens antigos inválidos por design — sem tentativa de migrá-los).
- Login real não testável sem a senha do proprietário (nenhuma senha foi resetada; nenhum usuário criado). Pipeline validado pelo teste negativo (400 invalid_credentials).

## Rollback (pronto, não executado)

- **Rollback = reverter as 3 env da Vercel para os valores do Cloud + redeploy** (os valores do Cloud estão no `.env.local` do repositório — caminho documentado, não impressos). Cloud permanece íntegro como fonte de rollback; nenhuma dependência de alteração de banco.

## Backups

| Backup | Conteúdo | Restore-verify |
|---|---|---|
| `pre-data-migration-20260821T170000Z` | 36 tabelas | ✅ |
| `post-data-migration-20260821T184000Z` | 104 tabelas, 586.810 linhas | ✅ |
| `post-cutover-20260822T194000Z` | 104 tabelas (59,7 MB, sha `676c2baf…`) + storage 24.328 obj/764.870.722 B → R2 | ✅ (FASE 20) |

## Segurança

- Nenhum secret/PII em git, docs, logs ou bundles; comprimentos de chave apenas.
- `cloud.pgpass` mantido em tmpfs root:root 600 para o período de observação/rollback (removível — senha no gerenciador do proprietário; decisão do próximo gate).
- Arquivos temporários locais (valores de env) e worktree de deploy removidos após o uso.

## Estado final

- **SELFHOSTED = PRIMARY** (API `api.fronteiraai.com`, app `www.fronteiraai.com`).
- **CLOUD = ROLLBACK SOURCE** — intacto, sem desligamento/redução/remoção de credenciais.
- 1312/0809 continuam congeladas (não aplicadas). Migration tracking do Cloud não reparado.
- Próxima fase (não antecipada): observação/estabilização → decommission controlado do Cloud.
