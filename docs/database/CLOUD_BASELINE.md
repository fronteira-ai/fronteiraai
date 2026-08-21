# Baseline Canônico do Schema — Supabase Cloud → Reproduzível

> Sprint 38D — prova de convergência: `CLOUD_SCHEMA == BASELINE_CANÔNICO == REBUILD_DESCARTÁVEL`.
> Autoridade: **catálogo real do Supabase Cloud no ponto de corte (2026-08-21)**.
> Sem migração de dados; sem troca da aplicação para o self-hosted.

## Por que o histórico/replay foi abandonado

O esquema nasceu no Supabase Cloud antes da disciplina completa de migrations: as 5 tabelas core
(`stores`, `brands`, `categories`, `products`, `offers`) foram criadas à mão e nunca tiveram
`CREATE TABLE` versionado. A trilha legada (`database/migrations/0001–0017`) foi aplicada à mão no
SQL Editor e o Supabase CLI não a conhece. Um baseline "replay" (baseline mínimo + reaplicar o
histórico) **produziria um schema que nunca existiu no Cloud**:

- `0001` (marcada "SUPERADA — NÃO APLICAR") adiciona `stores.website_url` e `stores.business_hours`
  — o Cloud real tem `website` e `opening_hours` (comprovado por `information_schema.columns`).
- `0003`/`0005` criam as matviews `product_price_summary`/`store_ranking_summary` — o Cloud real tem
  **0 views e 0 matviews**.
- O replay não criaria `favorites` (órfã do Cloud) nem a policy `Public read stores`.
- O replay carregaria o `DELETE FROM offers` da 0011 (operacionalmente incorreto num rebuild).

Decisão (Estratégia A, aprovada pelo proprietário): **baseline canônico = estado real do Cloud** +
somente migrations posteriores ao corte.

## Por que o catálogo do Cloud é a autoridade

O migration tracking do Cloud (`supabase_migrations.schema_migrations`, 20 versões registradas)
**não é autoridade absoluta**:

| Caso | Tracking | Objetos no Cloud | Conclusão |
|---|---|---|---|
| 20 migrations V2 (0112→2213) | registradas | presentes | eficazes |
| `20260713120000` (buyer_identity) | **registrada** | **ausentes** (`buyers`, rate-limits; `handle_new_user` legado) | registrada-mas-ineficaz — arquivo tinha SQL inválido (SQLSTATE 42601) |
| `20260723120000` / `20260724120000` / `20260725090000` | **não registradas** | presentes (`knowledge_history`, `canonical_suggestion_outbox`, `canonical_bootstrap_checkpoint`) | aplicadas manualmente, sem tracking |
| `20260809120000` (search_products_catalog) | não registrada | função **ausente** | nunca aplicada |

Ou seja: tracking divergiu do catálogo nos dois sentidos. O baseline parte do **catálogo real no
corte** (68 tabelas, 226 índices, 50 policies, 2 funções, 0 views, 0 matviews, 0 sequences).

## Objetos absorvidos sem origem histórica no Git

- **`favorites`** — 4 colunas (`id uuid PK DEFAULT gen_random_uuid()`, `profile_id uuid`,
  `product_id uuid`, `created_at timestamp`). Origem: `ABSORBED_FROM_PRODUCTION_SCHEMA`.
- **Policy `Public read stores`** — `FOR SELECT TO public USING(true)` em `stores`.
- **`offers_product_store_unique`** (UNIQUE product_id, store_id) — efeito da 0011 no Cloud; o
  `DELETE` histórico da 0011 **não** entra no baseline.

## Dependência de plataforma (auth.users)

`public.handle_new_user()` (SECURITY DEFINER, `SET search_path TO 'public'`) e o trigger
`on_auth_user_created` (em `auth.users`) são lógica ParaguAI sobre schema de plataforma. O baseline
(`pg_dump --schema=public`) carrega a função mas **não** o trigger; este é reproduzido pela
migration pós-bootstrap `20260821120000_post_bootstrap_auth_trigger.sql` (aplicar após o GoTrue).
O baseline **não cria** `auth.users` nem as roles `anon`/`authenticated`/`service_role` — elas vêm
da plataforma. No ambiente descartável, uma **fixture estrutural mínima** (test fixture, nunca parte
do baseline) provê `auth.users` + roles para validar FKs/policies/trigger.

## Migrations pós-baseline (não aplicadas nesta Sprint)

- `20260713120000_buyer_identity.sql` — corrigida na Sprint 3C (bloco `DO` guardado no lugar do
  `ADD CONSTRAINT IF NOT EXISTS` inválido). **Decisão do proprietário**: não aplicar agora.
- `20260809120000_search_products_catalog.sql` — função nova; **não aplicar agora**.

## Processo de verificação de convergência

1. `scripts/audit-cloud-schema.sh` — snapshot METADATA-ONLY do Cloud (read-only, sem linhas de
   negócio; 1 linha = 1 objeto; campos de texto normalizados; SHA256 da representação).
2. `scripts/build-canonical-baseline.sh` — sanitiza o `pg_dump --schema-only --no-owner
   --no-privileges --schema=public` em `supabase/migrations/00000000000000_cloud_baseline.sql`
   (remove cabeçalho/SETs/artefatos; guardas contra dados/ACLs/credenciais).
3. Aplicar em **PostgreSQL 17 descartável** (container `paraguai-baseline-verify`, sem volumes,
   sem portas públicas, sem tocar `/srv/paraguai/postgres`).
4. `scripts/compare-schema-catalogs.sh` — diff objeto a objeto Cloud × Rebuild;
   **SEMANTIC_DIFF=0** exigido; extensões são informativas (plataforma).
5. Destruir o container, recriar, reaplicar → SHA do rebuild #1 == rebuild #2 (determinismo).

## Como criar um novo ambiente do zero (resumo)

1. Subir Supabase self-hosted (bootstrap da plataforma: GoTrue, roles, extensions).
2. Aplicar `00000000000000_cloud_baseline.sql` (schema `public` canônico).
3. Aplicar `20260821120000_post_bootstrap_auth_trigger.sql` (trigger em `auth.users`).
4. Aplicar migrations pós-baseline (buyer_identity corrigida, search_products_catalog) **após
   decisão do proprietário**.
5. Migração de dados em Sprint separada, com rollback garantido (Cloud ativo até equivalência).

Nenhuma credencial, senha ou token é referenciado neste documento nem nos scripts.
