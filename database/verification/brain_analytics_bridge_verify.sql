-- ============================================================
-- Verification — Brain Analytics Bridge (Release 1.8, Program 0 Wave 0)
-- Never executed automatically. Paste into the Supabase SQL Editor by hand
-- to confirm the migration applied as expected.
-- ============================================================

-- Columns exist.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'buyer_events'
  AND column_name IN ('brain_synced_at', 'brain_sync_error')
ORDER BY column_name;

-- Index exists.
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename = 'buyer_events'
  AND indexname = 'buyer_events_unsynced_merchant_idx';

-- Bridge health: how many merchant-attributable events are synced vs.
-- pending vs. errored, right now.
SELECT
  count(*) FILTER (WHERE merchant_id IS NOT NULL AND brain_synced_at IS NOT NULL) AS synced,
  count(*) FILTER (WHERE merchant_id IS NOT NULL AND brain_synced_at IS NULL AND brain_sync_error IS NULL) AS pending,
  count(*) FILTER (WHERE merchant_id IS NOT NULL AND brain_sync_error IS NOT NULL) AS errored,
  count(*) FILTER (WHERE merchant_id IS NULL) AS not_merchant_attributable
FROM buyer_events;
