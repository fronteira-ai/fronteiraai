-- ============================================================
-- Verification — Exchange Intelligence Platform (Release 1.8 — Program A — Wave 1)
-- Never executed automatically. Paste into the Supabase SQL Editor by hand
-- to confirm the migration applied as expected.
-- ============================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('exchange_rates', 'exchange_provider_runs', 'exchange_conversion_log')
  AND schemaname = 'public';

-- Expect zero rows — these tables are service_role-only, no public policy
-- (same pattern as canonical_products/marketplace_alerts).
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('exchange_rates', 'exchange_provider_runs', 'exchange_conversion_log');

SELECT indexname, tablename FROM pg_indexes
WHERE tablename IN ('exchange_rates', 'exchange_provider_runs', 'exchange_conversion_log')
ORDER BY tablename, indexname;
