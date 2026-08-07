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
    // database/seed/ e database/storage/ são tooling Node standalone
    // (CommonJS), fora da árvore da aplicação Next.js/TypeScript.
    // Ver docs/DECISIONS.md, ADR-012.
    "database/seed/**",
    "database/storage/**",
    // Sprint 0 (baseline recovery): cópia órfã da primeira versão do projeto,
    // com .git próprio e untracked pelo repositório atual — nunca vai para o
    // build da Vercel, mas era typechecada e lintada localmente. Preservada em
    // disco deliberadamente (histórico), apenas excluída da validação local.
    // Mesma exclusão aplicada em tsconfig.json.
    "fronteiraai-web/**",
  ]),
]);

export default eslintConfig;
