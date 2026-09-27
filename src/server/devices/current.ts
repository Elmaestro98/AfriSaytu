import { cookies } from "next/headers"

import type { TenantContext } from "@/server/db"
import { DEVICE_COOKIE, hashDeviceToken, isDeviceTokenShape } from "@/server/devices/token"

// The shared phone this browser is, if any: still declared (not withdrawn), in this
// organization (the tenant client filters it).
export async function currentDevice(ctx: Pick<TenantContext, "db">) {
  const value = (await cookies()).get(DEVICE_COOKIE)?.value
  if (!isDeviceTokenShape(value)) return null
  return ctx.db.sharedDevice.findFirst({
    where: { tokenHash: hashDeviceToken(value), revokedAt: null },
    select: { id: true, branchId: true, name: true, branch: { select: { name: true } } },
  })
}

// Whether this browser carries a shared-phone secret at all (no database): enough to hide the
// account menus and to keep the admin console and the setup assistant away from a shared phone.
export async function carriesDeviceCookie(): Promise<boolean> {
  return isDeviceTokenShape((await cookies()).get(DEVICE_COOKIE)?.value)
}
