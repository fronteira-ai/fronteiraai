// Database Migration System V2 (docs/engineering/DATABASE_ENGINEERING.md).
//
// Enforces ETAPA 2's rule programmatically, not just by convention: a
// migration may only contain CREATE/ALTER/DROP/INSERT/UPDATE/DELETE. A
// standalone SELECT (audit query, health check) must live in
// database/verification/ or database/health_checks/ instead.
//
// `INSERT INTO ... SELECT ...` is legitimate DML (a data migration), not an
// audit query — it's allowed. What's forbidden is a SELECT that starts its
// own statement.
//
// This is a heuristic, not a full SQL parser: it strips `--` line comments
// and dollar-quoted (`$$...$$` / `$tag$...$tag$`) function bodies, then
// splits on `;` and flags any resulting statement whose first token is
// SELECT. Nested semicolons inside a dollar-quoted body are protected by
// the strip step; anything stranger (e.g. a semicolon inside a plain string
// literal) is out of scope for this lint.

export interface LintViolation {
  line: number;
  statement: string;
}

function stripLineComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "");
}

function stripDollarQuotedBodies(sql: string): string {
  return sql.replace(/\$([a-zA-Z_]*)\$[\s\S]*?\$\1\$/g, (match) => {
    const newlineCount = (match.match(/\n/g) ?? []).length;
    return "\n".repeat(newlineCount);
  });
}

export function findForbiddenSelects(sql: string): LintViolation[] {
  const cleaned = stripDollarQuotedBodies(stripLineComments(sql));
  const violations: LintViolation[] = [];

  let searchOffset = 0;
  for (const statement of cleaned.split(";")) {
    const trimmed = statement.trimStart();
    if (/^select\b/i.test(trimmed)) {
      const leadingWhitespace = statement.length - trimmed.length;
      const line = cleaned.slice(0, searchOffset + leadingWhitespace).split("\n").length;
      const firstLine = trimmed.split("\n")[0].trim();
      violations.push({ line, statement: firstLine });
    }
    searchOffset += statement.length + 1; // +1 for the ";" consumed by split
  }

  return violations;
}
