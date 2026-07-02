// Database Migration System V2 (docs/engineering/DATABASE_ENGINEERING.md).
// `npm run db:lint` — CI/CD's migration-hygiene gate (ETAPA 7/8).

import { readFileSync, readdirSync } from "fs";
import path from "path";
import { findForbiddenSelects } from "./lib/migration-lint";

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

function main() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let hasViolations = false;

  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const violations = findForbiddenSelects(sql);
    if (violations.length === 0) continue;

    hasViolations = true;
    console.error(`\n${file}:`);
    for (const v of violations) {
      console.error(`  line ~${v.line}: ${v.statement}`);
    }
  }

  if (hasViolations) {
    console.error(
      "\n[db:lint] FAILED — migrations may only contain CREATE/ALTER/DROP/INSERT/UPDATE/DELETE.\n" +
        "Move SELECT/health-check/audit queries to database/verification/ or database/health_checks/.\n" +
        "See docs/engineering/DATABASE_ENGINEERING.md."
    );
    process.exit(1);
  }

  console.log(`[db:lint] OK — ${files.length} migration(s) checked in supabase/migrations/, no embedded SELECT found.`);
}

main();
