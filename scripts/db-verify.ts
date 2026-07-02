// Database Migration System V2 (docs/engineering/DATABASE_ENGINEERING.md).
// `npm run db:verify` — lists the verification/health-check files available
// to run. No direct DB connection is attempted here: this environment has
// no Supabase credentials, and the standing policy (ETAPA 13) is that the
// SQL Editor remains legitimate for debug/inspection — this command's job
// is just to make the available checks discoverable, not to run them.

import { readdirSync } from "fs";
import path from "path";

function listSqlFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    return [];
  }
}

function main() {
  const verificationDir = path.join(__dirname, "..", "database", "verification");
  const healthChecksDir = path.join(__dirname, "..", "database", "health_checks");

  console.log("[db:verify] Per-migration verification files (database/verification/):");
  for (const file of listSqlFiles(verificationDir)) {
    console.log(`  - database/verification/${file}`);
  }

  console.log("\n[db:verify] System-wide health checks (database/health_checks/):");
  for (const file of listSqlFiles(healthChecksDir)) {
    console.log(`  - database/health_checks/${file}`);
  }

  console.log("\n[db:verify] Paste any of the above into the Supabase SQL Editor to run it.");
}

main();
