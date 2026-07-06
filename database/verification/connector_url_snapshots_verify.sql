-- ============================================================
-- Verificação — connector_url_snapshots (Release 1.8 — Program B — Wave 2)
-- Never executed automatically. Paste into the Supabase SQL Editor by hand
-- to confirm the migration applied as expected.
-- ============================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'connector_url_snapshots'
  AND schemaname = 'public';

-- Expect zero rows — service_role-only, no public policy (same pattern as
-- connector_sync_runs/market_changes).
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'connector_url_snapshots';

SELECT indexname, tablename FROM pg_indexes
WHERE tablename = 'connector_url_snapshots'
ORDER BY indexname;

-- Confirms the upsert-by-(connector_id, url) invariant holds — should
-- always return zero rows.
SELECT connector_id, url, count(*)
FROM connector_url_snapshots
GROUP BY connector_id, url
HAVING count(*) > 1;
