# CLOUD_DATA_MIGRATION — Sprint 38F

> Migração controlada de dados Supabase Cloud → self-hosted.
> **Zero downtime**: Cloud permaneceu produção e fonte de verdade durante toda a Sprint.
> **Sem cutover**: a Vercel continuou apontando para o Cloud.
> Status: **CONCLUÍDA** — `DATA_DIFF=0`, `RESTORED_DATA_DIFF=0`.

## Resultado (resumo executivo)

| Prova | Resultado |
|---|---|
| Schema (Cloud × self-hosted) | `SEMANTIC_DIFF=0` (SHA `04801957…`, 16/16 categorias) |
| Dados — fingerprint (70 tabelas: 68 public + auth.users + auth.identities) | **70/70 IDÊNTICO** (row count + hash canônico) |
| Dados — hash por coluna (auth) | 44/44 IDÊNTICO |
| Integridade referencial | 104 FKs, **0 violações** (real, descartável, Cloud-referência) |
| Restore do backup pós-migração | `RESTORE VERIFICADO` (105 tabelas, 586.810 linhas) |
| Fingerprint self-hosted × restaurado | **70/70 IDÊNTICO** |
| Drift live (T0→T1) | **0** (Cloud T0 == T1) |
| Storage | 24.328 objetos (~729 MB) no bucket `catalog` — **plano, cópia adiada** (ver §8) |

## 1. Snapshot strategy

- **Ferramenta**: `pg_dump --data-only -Fc --no-owner --no-privileges` via pooler com `PGPASSFILE` (senha nunca em argv).
- **Consistência**: snapshot transacional único (REPEATABLE READ) — `T0 = 2026-08-21T17:36:15Z`.
- **Artefato**: `cloud-data.dump`, 60.325.745 bytes, `sha256=323177117a175b89b53c728f8905838caeec5347bd0028189a8dfe523fe1ed4c`, 103 entradas `TABLE DATA`.
- **Guards**: `--no-owner --no-privileges`; dump **não versionado**, mantido em `/root/cloud-data-migration/` (root-only) e **removido** ao final.

## 2. Ordem de importação (self-hosted real)

1. `auth.users` + `auth.identities` (data-only, `--disable-triggers`) — **primeiro**: as FKs de public referenciam `auth.users`.
2. `public` (data-only, `--disable-triggers`, `--single-transaction`, `--exit-on-error`) — 59s, 0 erros.
3. `NOTIFY pgrst, 'reload schema'`; API validada (ver §7).

`--disable-triggers` é **temporário** (sessão de import) e **não altera schema**; a integridade é provada por scan explícito de FKs pós-import (MATCH SIMPLE: linhas com FK-NULL são válidas e excluídas do scan).

## 3. Fingerprint (DATA_HASH)

- **Método**: por tabela, `md5(string_agg(md5(to_jsonb(t)::text) ORDER BY hash))` — `to_jsonb` canoniza a ordem das chaves (independe da ordem das colunas), distingue NULL de `''`, e o agregado ordenado por hash é imune à ordem física das linhas. Tabelas sem PK: todas as 70 têm PK (68 public + auth) — estratégia de hash por conteúdo cobre qualquer caso.
- **Ferramentas**: `scripts/fingerprint-data.sql` (70 linhas `schema.tabela|linhas|md5`), `scripts/fk-integrity-scan.sql` (104 FKs), `scripts/fixture-auth-full.sql` (stub auth 35 colunas, TEST FIXTURE).
- **Comparação**: diff canônico dos outputs gerados pela MESMA função em Cloud e alvo.

## 4. Dados migrados (T0)

- ~810k linhas reais nas 68 tabelas public; destaques: `products` 52.589, `offers` 52.630, `price_history` 72.413, `canonical_products` 32.134, `market_changes` 143.707, `product_identity_match_log` 76.442, `connector_url_snapshots` 49.759.
- `auth.users` 2, `auth.identities` 2 (35 colunas, estrutura idêntica Cloud × self-hosted GoTrue).
- 0 sequences/identities (UUIDs) — verificado pós-import.
- **Não importado**: `auth.sessions`/refresh tokens (ligados ao JWT secret do Cloud — usuários re-logam no cutover), `supabase_migrations` (tracking não é dado), storage.objects (ver §8).

## 5. Auth strategy

- Audit metadata-only (counts) antes; **nenhum conteúdo sensível** (email/telefone/tokens/hashes) impresso ou versionado.
- Import: apenas `auth.users` + `auth.identities` (2+2 linhas), com `--disable-triggers` (evita que `handle_new_user` pré-crie `profiles` antes do import de public).
- `confirmed_at` (users) e `email` (identities) são colunas **GENERATED** no GoTrue — o dump as exclui; o target as computa (validado: col-hash 44/44 inclui os gerados).
- Validação: counts 2/2, col-hash idêntico, sem reset de senha, sem usuário fake.

## 6. Data diff (Cloud × self-hosted)

- `ROW_COUNTS` 70/70 iguais; `DATA_HASH` 70/70 iguais; `COL_HASH` auth 44/44.
- FK scan: `FK_TOTAL=104 FK_VIOLATIONS=0` (real, descartável e Cloud-referência — mesmo método, mesma semântica).

## 7. API / RLS (com dados reais)

- Interno (Kong 127.0.0.1:8000): `brands` 200, 964 linhas (`0-963/*`); `products`/`offers` 200; `connectors` 200 `[]` (service-only, sem vazamento).
- **Externo `https://api.fronteiraai.com/rest/v1/brands` → 200 com dados** (Content-Range `0-4/*`).
- RLS: INSERT anon → 401/42501 (bloqueado); leituras públicas OK.

## 8. Storage

- Inventário (metadata-only): bucket `catalog` (público), **24.328 objetos, 764.870.722 bytes (~729 MB)**; `storage.objects` owner NULL (uploads antigos/service).
- **Decisão**: a cópia dos objetos **NÃO** foi executada nesta Sprint — copiar `storage.objects` não copia os arquivos; exige as credenciais S3 do Cloud (indisponíveis neste host) ou janela de cópia via API. Como a Vercel continua apontando para o Cloud, as imagens seguem servidas por lá.
- **Plano (cutover sprint)**: rclone S3→S3 ou Storage API (download público + upload com service role do self-hosted), com verificação `objects_count` + `bytes` + amostra de hashes. Self-hosted: `STORAGE_DATA=0` (documentado no backup pós).

## 9. Rollback

- Cloud **intacto** (T0==T1, verificado por fingerprint) — fonte de verdade preservada.
- Backups nomeados/imutáveis: `pre-data-migration-20260821T170000Z` e `post-data-migration-20260821T184000Z` em `/backups/paraguai/`, ambos com `RESTORE VERIFICADO`, checksums e réplica R2.
- Rollback do self-hosted = restaurar o backup pré ou reimportar; nada depende de alteração de Cloud/Vercel.

## 10. Drift pós-snapshot (T0→T1)

- T1 = 2026-08-21T18:37:11Z. Fingerprint do Cloud re-executado: **T0 == T1 (sem drift live)** — o snapshot é o estado atual; o delta do cutover futuro será medido com o MESMO fingerprint.

## 11. Backups

| Backup | Tabelas | Bytes | SHA (dump) | Restore-verify |
|---|---|---|---|---|
| `pre-data-migration-20260821T170000Z` | 36 | 175.871 | — | ✅ VERIFICADO |
| `post-data-migration-20260821T184000Z` | 104 | 57.071.155 | `adb7f644…` | ✅ VERIFICADO (105 tab, 586.810 linhas) |

- Restore pós validado também em descartável bare `postgres:17.6` (`--no-owner --no-privileges`, 5 erros de extensão de plataforma esperados): **fingerprint 70/70 idêntico ao self-hosted**, FKs 104/0.

## 12. Próximo cutover (Sprint futura — NÃO executado)

1. FREEZE declarado (janela curta) → medir DELTA com o mesmo fingerprint.
2. Sincronizar delta (somente tabelas com drift) + cópia do Storage (rclone/API, §8).
3. Trocar `NEXT_PUBLIC_SUPABASE_URL` na Vercel → `https://api.fronteiraai.com`.
4. Validar ponta a ponta (login, catálogo, imagens); rollback = reverter env da Vercel (Cloud intacto).
5. Decisões pendentes do proprietário: 1312/0809 (permanecem congeladas), auth.sessions (re-login), limpeza do tracking do Cloud.

## Segurança

- Nenhuma credencial/PII em git, docs ou logs deste processo; fingerprints são hashes.
- `cloud.pgpass` mantido (root:root 600, tmpfs) para o próximo gate; dump temporário removido; containers descartáveis destruídos.
