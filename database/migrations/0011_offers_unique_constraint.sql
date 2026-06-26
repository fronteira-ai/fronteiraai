-- Migration 0011: UNIQUE constraint em offers(product_id, store_id)
-- Necessária para que o CatalogWriter possa fazer upsert via
-- ON CONFLICT (product_id, store_id).

-- Remove duplicatas eventuais antes de criar o constraint, mantendo
-- o registro mais recente por par (product_id, store_id).
DELETE FROM offers
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY product_id, store_id
             ORDER BY updated_at DESC NULLS LAST, created_at DESC
           ) AS rn
    FROM offers
  ) sub
  WHERE rn > 1
);

ALTER TABLE offers
  ADD CONSTRAINT offers_product_store_unique UNIQUE (product_id, store_id);

-- Verify
SELECT conname FROM pg_constraint
WHERE conrelid = 'offers'::regclass AND contype = 'u';
