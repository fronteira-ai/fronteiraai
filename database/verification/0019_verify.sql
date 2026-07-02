-- ============================================================
-- Verification — 0019 (Merchant Decision Engine: Action Center)
-- Never executed automatically. Paste into the Supabase SQL Editor by hand
-- to confirm the migration applied as expected.
-- ============================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'merchant_decision_actions'
  AND schemaname = 'public';

SELECT indexname FROM pg_indexes
WHERE tablename = 'merchant_decision_actions'
ORDER BY indexname;
