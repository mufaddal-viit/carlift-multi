import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Tenancy: only server code may reach the database, and only through serverRepo() (src/core/repo/server.ts),
  // which scopes every query to one company. Pages, components and client data code may not import Prisma.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/**", "src/core/repo/server.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/server/*", "@/server/**", "@prisma/client"],
          message: "Reach the database through serverRepo() from '@/core/repo/server', which scopes every query to one company.",
        }],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
