-- ============================================================
-- 0023 — Merchant Connectors + Scheduler + Discovery (Release 1.7 — Wave 2)
-- Status: PRONTO PARA EXECUÇÃO
-- ============================================================
--
-- Esta migration cobre apenas o Wave 2:
-- 1. stores — colunas de proveniência para Discovery. Nenhuma coluna de
--    ownership é adicionada aqui — ownership continua exclusivamente via
--    merchant_stores (ver docs/architecture/DOMAIN_MODEL.md). Uma "loja não
--    reivindicada" já é expressável hoje, com zero mudança de schema: é
--    simplesmente uma linha em `stores` sem nenhuma linha correspondente em
--    `merchant_stores`.
-- 2. import_logs passa a ser considerada SUPERADA a partir deste Wave —
--    nenhum código escreve mais nela; connector_sync_runs (já existente
--    desde a migration 0022) é a única fonte de verdade. Não é removida
--    aqui (sem ferramenta de DDL neste projeto — ver ADR-017/018).
--
-- APÓS APLICAR, execute as SELECTs de verificação ao final deste arquivo.
-- ============================================================

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS discovered_at timestamptz,
  ADD COLUMN IF NOT EXISTS discovery_connector_key text;

CREATE INDEX IF NOT EXISTS idx_stores_discovered_at ON stores (discovered_at)
  WHERE discovered_at IS NOT NULL;

-- ──────────────────────────────────────────────────────────
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- ──────────────────────────────────────────────────────────

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'stores' AND column_name IN ('discovered_at', 'discovery_connector_key');

SELECT indexname FROM pg_indexes WHERE tablename = 'stores' AND indexname = 'idx_stores_discovered_at';
