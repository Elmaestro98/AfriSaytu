import { auth } from "@clerk/nextjs/server"

export type SessionContext = {
  userId: string
  clerkOrgId: string
}

export type SessionErrorCode = "NO_SESSION" | "NO_ORGANIZATION"

export class SessionError extends Error {
  readonly code: SessionErrorCode

  constructor(code: SessionErrorCode) {
    super(code === "NO_SESSION" ? "Not signed in" : "No active organization")
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
