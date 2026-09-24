import { defineConfig, env } from "prisma/config"

// Prisma CLI configuration. Migrations use the direct connection (port 5432).
// The application itself connects through the pooler (DATABASE_URL, port 6543).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
})
