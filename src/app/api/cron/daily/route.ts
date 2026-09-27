import { timingSafeEqual } from "node:crypto"

import { runDailyNotifications } from "@/server/notifications/cron"

// GET /api/cron/daily: called by Vercel Cron every day at 21:00 (Dakar = UTC, vercel.json).
// Public for Clerk (a cron has no session), so it checks CRON_SECRET, which Vercel sends as
// "Authorization: Bearer <secret>". Without the variable, nobody can run it.
function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request.headers.get("authorization"))) return new Response("Accès refusé.", { status: 401 })
  const result = await runDailyNotifications()
  return Response.json(result)
}
