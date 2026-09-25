import { auth } from "@clerk/nextjs/server"

// SaaS admin (F-63): Clerk user ids listed in SAAS_ADMIN_USER_IDS (comma separated). A user id
// never changes and cannot be chosen by someone else, unlike an e-mail address.

export class AdminAccessError extends Error {}

export function parseAdminIds(raw: string | undefined): ReadonlySet<string> {
  return new Set((raw ?? "").split(",").map((id) => id.trim()).filter((id) => /^user_[A-Za-z0-9]+$/.test(id)))
}

export function isSaasAdmin(userId: string | null | undefined, raw: string | undefined): boolean {
  return Boolean(userId) && parseAdminIds(raw).has(userId as string)
}

// First line of every admin page and action. The pages answer 404 on refusal: the console does
// not even reveal that it exists.
export async function requireSaasAdmin(): Promise<{ userId: string }> {
  const { userId } = await auth()
  if (!userId || !isSaasAdmin(userId, process.env.SAAS_ADMIN_USER_IDS)) throw new AdminAccessError()
  return { userId }
}
