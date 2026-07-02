-- ============================================================
-- Verification — 0022 (Connector Platform Framework)
-- supabase/migrations/20260701120000_connector_platform.sql
-- Never executed automatically. Paste into the Supabase SQL Editor by hand,
-- or run via `npm run db:verify` for the file list, to confirm the
-- migration applied as expected.
-- ============================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('connectors', 'connector_sync_runs')
  AND schemaname = 'public'
ORDER BY tablename;

SELECT indexname FROM pg_indexes
WHERE tablename IN ('connectors', 'connector_sync_runs')
ORDER BY indexname;
