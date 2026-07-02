-- ============================================================
-- Verification — 0023 (Merchant Connectors + Scheduler + Discovery)
-- supabase/migrations/20260701120100_merchant_entitlements_discovery.sql
-- Never executed automatically.
-- ============================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'stores' AND column_name IN ('discovered_at', 'discovery_connector_key');

SELECT indexname FROM pg_indexes
WHERE tablename = 'stores' AND indexname = 'idx_stores_discovered_at';
