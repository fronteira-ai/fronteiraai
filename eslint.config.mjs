import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // database/seed/ é tooling Node standalone (CommonJS), fora da árvore
    // da aplicação Next.js/TypeScript — não governado pelas regras de
    // import deste config. Ver docs/DECISIONS.md, ADR-012.
    "database/seed/**",
  ]),
]);

export default eslintConfig;
