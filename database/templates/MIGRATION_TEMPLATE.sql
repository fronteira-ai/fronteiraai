-- ============================================================
-- <NNNN> — <Short Title> (Release <X.Y> — <Epic/Wave name>)
-- Status: DRAFT | READY | APPLIED
-- Rollback: Possible | Partial | Impossible — <one line, see
--   database/templates/ROLLBACK_TEMPLATE.sql for the full policy>
-- Depends on: <previous migration(s) this one assumes are already applied,
--   or "none">
-- ============================================================
--
-- Cria / altera:
-- 1. <table/column/index/policy/function/trigger being added>
--
-- PRINCÍPIO:
-- <the one invariant this migration exists to protect, if any>
--
-- Verificação: database/verification/<NNNN>_verify.sql — nunca embutida
-- aqui, nunca executada automaticamente. Ver
-- docs/engineering/DATABASE_ENGINEERING.md.
-- ============================================================

-- Rules enforced by `npm run db:lint` (scripts/db-migration-lint.ts):
--   - Only CREATE / ALTER / DROP / INSERT / UPDATE / DELETE.
--   - No standalone SELECT (an `INSERT INTO ... SELECT ...` data migration
--     is fine — that's DML, not an audit query).
--   - CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS always.
--   - DROP POLICY IF EXISTS before every CREATE POLICY (Postgres has no
--     `CREATE POLICY IF NOT EXISTS` — this is what makes a migration safe
--     to replay against a fresh environment).
--   - DROP TRIGGER IF EXISTS before every CREATE TRIGGER.
--   - CREATE OR REPLACE FUNCTION instead of CREATE FUNCTION where the
--     function may already exist.

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — <table name>
-- ──────────────────────────────────────────────────────────

-- CREATE TABLE IF NOT EXISTS <table> (
--   id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
--   ...
--   created_at timestamptz NOT NULL DEFAULT now()
-- );

-- CREATE INDEX IF NOT EXISTS idx_<table>_<columns> ON <table> (<columns>);

-- ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
-- -- Leitura/escrita exclusivamente via service_role (API routes autenticadas)
-- -- OU, se houver policy pública/de usuário:
-- DROP POLICY IF EXISTS "<policy_name>" ON <table>;
-- CREATE POLICY "<policy_name>" ON <table>
--   FOR SELECT USING (<condition>);
