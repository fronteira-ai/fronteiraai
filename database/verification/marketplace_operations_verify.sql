-- ============================================================
-- Verification — Marketplace Operations Platform (Release 1.8 — Program 0 — Wave 1)
-- Never executed automatically. Paste into the Supabase SQL Editor by hand
-- to confirm the migration applied as expected.
-- ============================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('marketplace_health_snapshots', 'marketplace_alerts')
  AND schemaname = 'public';

SELECT indexname, tablename FROM pg_indexes
WHERE tablename IN ('marketplace_health_snapshots', 'marketplace_alerts')
ORDER BY tablename, indexname;

-- Confirms the UNIQUE(snapshot_date) constraint exists (idempotent daily upsert).
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'marketplace_health_snapshots'::regclass
  AND contype = 'u';
