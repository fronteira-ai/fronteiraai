-- ============================================================
-- Verification — 0018 (Analytics Platform: Event Store + Sessions + Merchant Daily)
-- Never executed automatically. Paste into the Supabase SQL Editor by hand
-- to confirm the migration applied as expected.
-- ============================================================

-- RLS status (ETAPA 1 fix: pg_tables.rowsecurity, NOT
-- information_schema.tables.row_security — that column does not exist).
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('buyer_events', 'buyer_sessions', 'merchant_analytics_daily')
  AND schemaname = 'public'
ORDER BY tablename;

-- Indexes.
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('buyer_events', 'buyer_sessions', 'merchant_analytics_daily')
ORDER BY tablename, indexname;

-- Policies (expect buyer_events_insert, buyer_sessions_insert, buyer_sessions_update).
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('buyer_events', 'buyer_sessions', 'merchant_analytics_daily')
ORDER BY tablename, policyname;

-- Manual smoke test: POST /api/analytics/events, then confirm a row exists.
