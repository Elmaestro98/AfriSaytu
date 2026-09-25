import { getBaseClient } from "@/server/db/client"

// Reads one logo of the GLOBAL operator catalogue (no tenant: every organization sees the
// catalogue, F-10). Read-only, by operator id. Guarded by admin/boundary.test.ts.
export async function readOperatorLogo(operatorId: string): Promise<{ mimeType: string; data: Uint8Array } | null> {
  return getBaseClient().operatorLogo.findUnique({ where: { operatorId }, select: { mimeType: true, data: true } })
}
