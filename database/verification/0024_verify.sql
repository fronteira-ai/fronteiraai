-- ============================================================
-- Verification — 0024 (Product Identity Engine — Shadow Mode)
-- supabase/migrations/20260701120200_product_identity.sql
-- Never executed automatically.
-- ============================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'product_identity_match_log'
  AND schemaname = 'public';

SELECT indexname FROM pg_indexes
WHERE tablename = 'product_identity_match_log'
ORDER BY indexname;

-- Spot-check a sample row's explainability shape after the first real sync:
-- SELECT algorithm_version, confidence_score, tier, matched_attributes,
--        mismatched_attributes, penalties, final_decision, explainability_reason
-- FROM product_identity_match_log
-- ORDER BY created_at DESC
-- LIMIT 5;
