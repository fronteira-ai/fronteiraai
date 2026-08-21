# Baselines Sprint 3C — arquivados (SUPERADOS)

Estes dois arquivos foram tentativas da Sprint 3A/3B/3C de tornar o banco
reproduzível **antes** do inventário real do Supabase Cloud (Sprint 38C-R):

- `00000000000000_baseline_core_catalog.sql` — cria as 5 tabelas core a
  partir de `types/*.ts` e dos seeds, com nulabilidade "permissiva por falta
  de evidência" (o Cloud estava bloqueado por quota na época).
- `00000000000001_baseline_legacy_trail.sql` — replay literal de
  `database/migrations/0001–0017`, incluindo a 0001 ("SUPERADA — NÃO
  APLICAR") e as matviews 0003/0005 que **nunca existiram no Cloud**.

## Por que foram superados

O catálogo real do Cloud (Sprint 38C-R/38D) provou divergências:

- `stores` no Cloud tem `website`/`opening_hours` (não `website_url`/
  `business_hours`), 26 colunas (não 24), `created_at timestamp` NULL.
- O Cloud tem **0 views e 0 matviews** (0003/0005 nunca aplicadas).
- O Cloud tem `favorites` (órfã, sem DDL em migrations) e a policy
  `Public read stores` — ausentes nos dois baselines.
- O replay carregaria o `DELETE FROM offers` da 0011 (não entra em baseline).

O baseline canônico (Sprint 38D, aprovado): `CLOUD_SCHEMA == REBUILT_SCHEMA`
com `SEMANTIC_DIFF=0`, SHA `04801957…`.

## Status

- **NÃO executar** estes arquivos em nenhum banco.
- Preservados somente para auditoria histórica.
- Removidos de `supabase/migrations/` para evitar colisão de versão
  (`00000000000000`) com o baseline canônico.
- Autoridade atual: `supabase/migrations/00000000000000_cloud_baseline.sql`
  (ver `supabase/migrations/BASELINE_MANIFEST.md` e
  `docs/database/CLOUD_BASELINE.md`).
