import { findForbiddenSelects } from "../lib/migration-lint";

describe("findForbiddenSelects", () => {
  it("flags a standalone top-level SELECT", () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS foo (id uuid PRIMARY KEY);

      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE tablename = 'foo';
    `;
    const violations = findForbiddenSelects(sql);
    expect(violations.length).toBe(1);
    expect(violations[0].statement).toMatch(/^SELECT/i);
  });

  it("passes a migration with only CREATE/ALTER/INSERT statements", () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS foo (id uuid PRIMARY KEY, name text NOT NULL);
      ALTER TABLE foo ADD COLUMN IF NOT EXISTS description text;
      INSERT INTO foo (id, name) VALUES (gen_random_uuid(), 'seed');
    `;
    expect(findForbiddenSelects(sql)).toEqual([]);
  });

  it("allows INSERT INTO ... SELECT as a data migration, not a violation", () => {
    const sql = `
      INSERT INTO foo (id, name)
      SELECT gen_random_uuid(), bar.name
      FROM bar
      WHERE bar.active = true;
    `;
    expect(findForbiddenSelects(sql)).toEqual([]);
  });

  it("ignores SELECT inside a dollar-quoted function body", () => {
    const sql = `
      CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
      BEGIN
        SELECT now() INTO NEW.updated_at;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    expect(findForbiddenSelects(sql)).toEqual([]);
  });

  it("ignores SELECT mentioned inside a line comment", () => {
    const sql = `
      -- APÓS APLICAR: SELECT * FROM foo;
      CREATE TABLE IF NOT EXISTS foo (id uuid PRIMARY KEY);
    `;
    expect(findForbiddenSelects(sql)).toEqual([]);
  });

  it("flags every standalone SELECT when there are several", () => {
    const sql = `
      SELECT 1;
      CREATE TABLE IF NOT EXISTS foo (id uuid PRIMARY KEY);
      SELECT 2;
    `;
    expect(findForbiddenSelects(sql).length).toBe(2);
  });
});
