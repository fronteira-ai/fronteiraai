-- ============================================================
-- Verification — 0025 (Canonical Catalog & Compare Foundation)
-- supabase/migrations/20260701120300_canonical_catalog.sql
-- Never executed automatically.
-- ============================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('canonical_products', 'merge_candidates')
  AND schemaname = 'public'
ORDER BY tablename;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'offers' AND column_name = 'canonical_product_id';

SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('canonical_products', 'merge_candidates', 'offers')
  AND indexname LIKE '%canonical%'
ORDER BY tablename, indexname;

-- Bootstrap sanity check (run AFTER scripts/canonical-catalog-bootstrap.ts --execute):
-- every product should have exactly one canonical product, and the counts
-- should match 1:1.
-- SELECT
--   (SELECT count(*) FROM products) AS product_count,
--   (SELECT count(*) FROM canonical_products) AS canonical_product_count,
--   (SELECT count(*) FROM offers WHERE canonical_product_id IS NULL) AS unlinked_offers;

-- Merge candidates seeded by the bootstrap, if any:
-- SELECT source_canonical_product_id, target_canonical_product_id, confidence, status
-- FROM merge_candidates
-- ORDER BY confidence DESC
-- LIMIT 20;
