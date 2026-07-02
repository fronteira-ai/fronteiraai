-- ============================================================
-- Health Check — Extensions
-- ============================================================

SELECT extname, extversion
FROM pg_extension
ORDER BY extname;

-- Confirm the extensions this project actually relies on are present
-- (gen_random_uuid() needs pgcrypto or the built-in in PG13+/pgcrypto).
SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto', 'uuid-ossp', 'pg_trgm');
