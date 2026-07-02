-- ============================================================
-- Verification — 0026 (Merchant Acquisition & Ownership Platform)
-- supabase/migrations/20260701120400_merchant_ownership.sql
-- Never executed automatically.
-- ============================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('store_claims', 'merchant_delegates', 'merchant_upgrade_leads')
  AND schemaname = 'public'
ORDER BY tablename;

SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('store_claims', 'merchant_delegates', 'merchant_upgrade_leads')
ORDER BY tablename, indexname;

SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'store_claims'
ORDER BY policyname;

-- Confirm the new verification_type/catalog entry exists:
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'merchant_verifications_verification_type_check';

SELECT label, category, requires_evidence FROM verification_types WHERE label = 'Reivindicação de Loja';

-- Spot-check after a real claim is submitted:
-- SELECT id, merchant_id, store_id, status, automated_confidence, signal_breakdown
-- FROM store_claims
-- ORDER BY created_at DESC
-- LIMIT 10;
