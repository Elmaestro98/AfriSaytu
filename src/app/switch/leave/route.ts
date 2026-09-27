import { NextResponse } from "next/server"

import { ACTOR_COOKIE } from "@/server/devices/actor-cookie"
import { leaveSharedMode } from "@/server/devices/switch"
import { DEVICE_COOKIE } from "@/server/devices/token"

// POST /switch/leave ("Quitter le mode partagé"): a plain form post, handled in one go on the
// server (withdraw the phone, forget its secrets), then /switch/bye signs the account out. A plain
// post avoids a Server Action whose page refresh would redirect in the middle of the sign-out.
export async function POST(request: Request): Promise<Response> {
  // Only from this site's own page (a form posted by another site is refused).
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin) return new Response("Accès refusé.", { status: 403 })

  try {
    await leaveSharedMode()
  } catch (error) {
    console.error("Leaving shared mode failed", error)
  }
  // The secrets are dropped on the response itself, whatever happened above.
  const response = NextResponse.redirect(new URL("/switch/bye", request.url), 303)
  response.cookies.delete(DEVICE_COOKIE)
  response.cookies.delete(ACTOR_COOKIE)
  return response
}
