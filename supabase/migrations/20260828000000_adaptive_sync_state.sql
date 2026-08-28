-- ============================================================
-- Adaptive Sync Engine — sync_state por connector.
-- Sprint "Realtime Commerce Sync V1" (continuada market freshness).
-- ADITIVO / NÃO destrutivo: adiciona UMA coluna jsonb com default '{}';
-- nada existente alterado; rollback trivial (DROP COLUMN). Retrocompat:
-- conectores atuais continuam funcionando (frequência legada em
-- connectors.config.syncFrequencyHours segue respeitada).
-- ============================================================

ALTER TABLE public.connectors
  ADD COLUMN IF NOT EXISTS sync_state jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.connectors.sync_state IS
  'Estado de scheduling/freshness do Adaptive Sync Engine { next_sync_at, '
  'tier, consecutive_failures, health_status, last_sync_at, last_success_at, '
  'last_failure_at, last_price_change_at, last_stock_change_at, '
  'sync_frequency_min, backoff_minute }. Frequência preferida aqui; cai para '
  'connectors.config.syncFrequencyHours (retrocompat).';
