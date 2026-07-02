-- ============================================================
-- Health Check — Row Level Security
-- System-wide, topic-based, callable anytime. Never tied to a single
-- migration, never executed automatically. See
-- docs/engineering/DATABASE_ENGINEERING.md for the Health System.
-- ============================================================

-- Every public table's RLS status. A table with rowsecurity = false that
-- holds user- or merchant-scoped data is almost certainly a bug.
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
