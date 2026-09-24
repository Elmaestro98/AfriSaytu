import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"

// INTERNAL. This client is NOT scoped to an organization. Only the db/ module and the
// organization provisioning code may import it. Everything else goes through getTenantDb().

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.")
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

// Lazy and cached, so that importing this file never needs a database (tests, build).
export function getBaseClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient()
  }
  return globalForPrisma.prisma
}
