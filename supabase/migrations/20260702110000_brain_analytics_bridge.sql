-- ============================================================
-- Brain Analytics Bridge (Release 1.8 — Program 0, Wave 0)
-- Status: APPLIED
-- Rollback: Possible — DROP COLUMN brain_synced_at, brain_sync_error;
--   DROP INDEX buyer_events_unsynced_merchant_idx. No data loss beyond the
--   sync bookkeeping itself; buyer_events rows and merchant_trust_events
--   rows already written are untouched by a rollback of this migration.
-- Depends on: 20260702090000_analytics_platform.sql (buyer_events must
--   exist), 0014_trust_foundation.sql (merchant_trust_events must exist)
-- ============================================================
--
-- Cria / altera:
-- 1. buyer_events.brain_synced_at — marks the moment a merchant-attributable
--    buyer_events row was successfully turned into a merchant_trust_events
--    row by BuyerEventBrainBridgeService. NULL = not yet processed (or not
--    eligible — buyer_events.merchant_id IS NULL, most rows, since most
--    buyer behavior has no merchant context: search, category/brand
--    browsing, product views not attributable to one store).
-- 2. buyer_events.brain_sync_error — set (and brain_synced_at left NULL)
--    when the bridge attempted and failed, e.g. Brain quality validation
--    rejected the event. Lets the bridge be re-run safely without silently
--    losing failures — the traceability the CTO mandate requires.
-- 3. Partial index over the exact query the bridge issues.
--
-- PRINCÍPIO:
-- The bridge only ever processes a row once brain_synced_at IS NULL, and
-- sets it in the same request that performs the Brain insert — this is the
-- entire idempotency mechanism. No new queue, no cron, no polling: the
-- bridge runs synchronously inside EventPlatformService.processBatch(),
-- immediately after the buyer_events insert that created the row.
--
-- Verificação: database/verification/brain_analytics_bridge_verify.sql
-- ============================================================

ALTER TABLE buyer_events
  ADD COLUMN IF NOT EXISTS brain_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS brain_sync_error text;

CREATE INDEX IF NOT EXISTS buyer_events_unsynced_merchant_idx
  ON buyer_events (merchant_id)
  WHERE merchant_id IS NOT NULL AND brain_synced_at IS NULL;
