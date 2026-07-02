-- ============================================================
-- Health Check — Indexes
-- ============================================================

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Unused indexes (idx_scan = 0) — candidates for removal, but confirm
-- against real traffic before dropping (a low-traffic table looks "unused"
-- even when its index is load-bearing for an occasional heavy query).
SELECT relname AS tablename, indexrelname AS indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
