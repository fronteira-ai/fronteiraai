-- ============================================================
-- Verification — 0021 (Growth Engine: Recommendation History)
-- Never executed automatically. Paste into the Supabase SQL Editor by hand
-- to confirm the migration applied as expected.
-- ============================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'merchant_growth_history'
  AND schemaname = 'public';

SELECT indexname FROM pg_indexes
WHERE tablename = 'merchant_growth_history'
ORDER BY indexname;
