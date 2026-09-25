import { defineConfig, env } from "prisma/config"

// Prisma 7 does not load .env files by itself: load .env.local when it exists.
try {
  process.loadEnvFile(".env.local")
} catch {
  // No .env.local (CI, Vercel): variables come from the environment.
}

// Prisma CLI configuration. Migrations use the direct connection (port 5432).
// The application itself connects through the pooler (DATABASE_URL, port 6543).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --env-file-if-exists=.env.local prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
})
