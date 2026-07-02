# database/migrations/ — Historical Record (Frozen)

This directory holds migrations `0001` through `0021`, all already applied to production by hand in the Supabase SQL Editor, before the **Database Migration System V2** (see `docs/engineering/DATABASE_ENGINEERING.md`).

## What changed and what didn't

- **`0001`-`0017`**: untouched. Frozen historical record — do not edit.
- **`0018`-`0021`**: edited in place (not moved) as part of the V2 rollout. Editing them does **not** touch production — they were already applied with their old content; this is a repo-hygiene fix only:
  - Their embedded verification queries (which used the invalid `information_schema.tables.row_security` column) were extracted into `database/verification/00NN_verify.sql`, corrected to use `pg_tables.rowsecurity`.
  - `0018` additionally gained `DROP POLICY IF EXISTS` guards before its `CREATE POLICY` statements, making it safe to replay from scratch (e.g. when bootstrapping a new environment) — the same class of bug that forced `0017_hotfix_trust_experience.sql` to work around a non-idempotent `0016`.

## Where new migrations live

**From `0022` onward, migrations live in `supabase/migrations/`**, authored via `supabase migration new <name>` and applied via `supabase db push` (Supabase CLI), never copy-pasted into the SQL Editor. See `docs/engineering/DATABASE_ENGINEERING.md` for the full standard, and `database/templates/MIGRATION_TEMPLATE.sql` for the required format.

`0022`, `0023`, `0024` (Connector Platform, Merchant Connectors/Scheduler/Discovery, Product Identity) were never applied to production under their old `database/migrations/` names — they were moved, not duplicated, into `supabase/migrations/20260701120000_connector_platform.sql`, `20260701120100_merchant_entitlements_discovery.sql`, `20260701120200_product_identity.sql`.

Historical docs (`CHANGELOG.md`, `PROJECT_STATUS.md`, `RELEASE_1_7_*` execution plans) that reference the old `database/migrations/0022_...sql` path are left as-is — they're a record of what was true when written, not a live index.
