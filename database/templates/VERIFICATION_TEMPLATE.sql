-- ============================================================
-- Verification — <NNNN> (<Short Title>)
-- supabase/migrations/<timestamp>_<name>.sql
-- Never executed automatically. Paste into the Supabase SQL Editor by hand,
-- or list it via `npm run db:verify`, to confirm the migration applied as
-- expected.
-- ============================================================

-- RLS status. ALWAYS use pg_tables.rowsecurity, never
-- information_schema.tables.row_security (not a real column — the ETAPA 1
-- bug this standard exists to prevent from recurring).
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('<table1>', '<table2>')
  AND schemaname = 'public'
ORDER BY tablename;

-- Indexes.
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('<table1>', '<table2>')
ORDER BY tablename, indexname;

-- Policies, if any.
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('<table1>', '<table2>')
ORDER BY tablename, policyname;

-- Manual smoke test: <describe the one real API call or script run that
-- proves this migration's tables/columns actually work end-to-end>.
