-- ============================================================
-- Verification — Real-Time Commerce Engine (Release 1.8 — Program A — Wave 2)
-- Never executed automatically. Paste into the Supabase SQL Editor by hand
-- to confirm the migration applied as expected.
-- ============================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('market_changes', 'market_pulse_snapshots', 'buyer_alert_candidates')
  AND schemaname = 'public';

-- Expect zero rows — these tables are service_role-only, no public policy
-- (same pattern as exchange_rates/marketplace_alerts).
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('market_changes', 'market_pulse_snapshots', 'buyer_alert_candidates');

SELECT indexname, tablename FROM pg_indexes
WHERE tablename IN ('market_changes', 'market_pulse_snapshots', 'buyer_alert_candidates')
ORDER BY tablename, indexname;

-- Confirms market_changes is append-only in practice: total rows should only
-- ever grow between two runs of this query, never shrink or have its
-- earliest detected_at move forward.
SELECT count(*) AS total_changes, min(detected_at) AS earliest, max(detected_at) AS latest
FROM market_changes;

-- Confirms rate limiting is enforced at the database level, not just in
-- application code — should return zero rows (the unique index on
-- rate_limit_key makes a duplicate impossible).
SELECT rate_limit_key, count(*)
FROM buyer_alert_candidates
GROUP BY rate_limit_key
HAVING count(*) > 1;

-- Confirms market_pulse_snapshots stays one row per day (upsert-by-date).
SELECT snapshot_date, count(*)
FROM market_pulse_snapshots
GROUP BY snapshot_date
HAVING count(*) > 1;
