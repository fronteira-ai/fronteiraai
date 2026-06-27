-- Migration 0013: Fix profiles.role constraint to allow 'merchant'
-- Idempotent — safe to run multiple times.
--
-- Context: Migration 0012 includes this same ALTER TABLE, but in some environments
-- the constraint was not updated (e.g., if 0012 was applied partially or the
-- ALTER TABLE ran before the table existed). This migration ensures the constraint
-- is correct independently.
--
-- Note: requireMerchant() no longer relies on profiles.role (uses merchant record
-- directly), so this is a belt-and-suspenders fix for data integrity.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'operator', 'merchant'));

-- Update any existing merchants whose role was not updated
UPDATE profiles
SET role = 'merchant'
WHERE id IN (SELECT user_id FROM merchants)
  AND role != 'merchant'
  AND role != 'admin';

-- Verify
SELECT role, count(*) FROM profiles GROUP BY role ORDER BY role;
