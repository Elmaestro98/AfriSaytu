import { auth } from "@clerk/nextjs/server"

export type SessionContext = {
  userId: string
  clerkOrgId: string
}

export type SessionErrorCode =
  | "NO_SESSION"
  | "NO_ORGANIZATION"
  | "ORGANIZATION_NOT_PROVISIONED"
  | "NOT_A_MEMBER"
  | "MEMBER_DISABLED"

const SESSION_ERROR_MESSAGES: Record<SessionErrorCode, string> = {
  NO_SESSION: "Not signed in",
  NO_ORGANIZATION: "No active organization",
  ORGANIZATION_NOT_PROVISIONED: "Organization has no record in the database yet",
  NOT_A_MEMBER: "Signed-in user is not a member of this organization",
  MEMBER_DISABLED: "This member has been deactivated",
}

export class SessionError extends Error {
  readonly code: SessionErrorCode

  constructor(code: SessionErrorCode) {
    super(SESSION_ERROR_MESSAGES[code])
    this.name = "SessionError"
    this.code = code
  }
}

// The tenant identity always comes from the Clerk session on the server.
// Never accept an organization id from a form field, a query string or a request body.
export async function requireSession(): Promise<SessionContext> {
  const { userId, orgId } = await auth()

  if (!userId) throw new SessionError("NO_SESSION")
  if (!orgId) throw new SessionError("NO_ORGANIZATION")

  return { userId, clerkOrgId: orgId }
}
