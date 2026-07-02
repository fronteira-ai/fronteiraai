-- ============================================================
-- Verification — 0020 (Catalog Intelligence: Per-Product Health Snapshots)
-- Never executed automatically. Paste into the Supabase SQL Editor by hand
-- to confirm the migration applied as expected.
-- ============================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'merchant_catalog_snapshots'
  AND schemaname = 'public';

SELECT indexname FROM pg_indexes
WHERE tablename = 'merchant_catalog_snapshots'
ORDER BY indexname;
