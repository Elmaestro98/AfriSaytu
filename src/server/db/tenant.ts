import type { PrismaClient } from "@/generated/prisma/client"
import { scopeArgs } from "@/server/db/tenant-scope"

// Wraps a Prisma client so that every model query is rewritten by scopeArgs():
// the organization filter is added automatically, and forbidden writes are refused.
//
// Limits to keep in mind when writing server modules:
// - Raw queries ($queryRaw, $executeRaw) bypass this layer: do not use them in app code.
// - Write with scalar foreign keys (organizationId, branchId...), not nested `connect`, and
//   check that any id received from the client belongs to the organization before using it.
export function withTenant(client: PrismaClient, organizationId: string) {
  return client.$extends({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const scoped = scopeArgs(model, operation, args as Record<string, unknown>, organizationId)
          return query(scoped)
        },
      },
    },
  })
}

export type TenantClient = ReturnType<typeof withTenant>
