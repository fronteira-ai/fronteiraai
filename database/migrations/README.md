# database/migrations/ — Historical Record (Frozen)

This directory holds migrations `0001` through `0017`, confirmed applied to production by hand in the Supabase SQL Editor, before the **Database Migration System V2** (see `docs/engineering/DATABASE_ENGINEERING.md`).

## Correction (2026-07-02, Release 1.8 — Sprint 0.1 Critical Readiness Fixes)

An earlier version of this README claimed `0018`-`0021` "were already applied with their old content" and that editing them for the V2 rollout was repo-hygiene only. **That was wrong.** A live check against the production database on 2026-07-02 (`information_schema.tables`) found that `buyer_events`, `buyer_sessions`, `merchant_analytics_daily` (`0018`), `merchant_decision_actions` (`0019`), `merchant_catalog_snapshots` (`0020`), and `merchant_growth_history` (`0021`) **did not exist in production** — despite Release 1.6 being documented everywhere as fully delivered ("Merchant OS complete") with all five Epics certified. The gap went undetected because the test suites for these Epics mock the Supabase client; nothing re-verified against the real database after the code was written. This is also the root cause of a separately-discovered finding (Release 1.8 Sprint Zero) that `hooks/useAnalytics.ts` was never wired into any page — there was never a live table for it to write to.

**Resolution**: `0018`-`0021` were moved (not left in place, not duplicated) into `supabase/migrations/` as `20260702090000_analytics_platform.sql` through `20260702090300_growth_engine.sql`, and applied via `supabase db push` on 2026-07-02. All 6 tables confirmed to exist in production immediately after. See `docs/product/releases/RELEASE_1_8_SPRINT_01_REPORT.md` for the full investigation and evidence.

## What this means for `0001`-`0017`

They remain frozen and presumed applied — but that presumption was exactly what was wrong about `0018`-`0021` for over two weeks of subsequent work (all of Release 1.7 was built and certified without anyone re-checking this). No live re-verification of `0001`-`0017` was performed as part of this fix (out of scope for Sprint 0.1) — if similar doubt ever arises about an earlier migration, `information_schema.tables` is the authoritative, fast way to check; don't assume from documentation alone.

## Where new migrations live

**From `0022` onward (including the `0018`-`0021` recovered by this fix), migrations live in `supabase/migrations/`**, authored via `supabase migration new <name>` and applied via `supabase db push` (Supabase CLI), never copy-pasted into the SQL Editor. See `docs/engineering/DATABASE_ENGINEERING.md` for the full standard, and `database/templates/MIGRATION_TEMPLATE.sql` for the required format.

Historical docs (`CHANGELOG.md`, `PROJECT_STATUS.md`, `RELEASE_1_7_*`/`RELEASE_1_8_*` execution plans/reports) that reference old `database/migrations/00NN_...sql` paths for migrations that have since moved are left as-is — they're a record of what was true when written, not a live index.
