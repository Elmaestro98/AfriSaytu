import { auth } from "@clerk/nextjs/server"

import { readOperatorLogo } from "@/server/operators/logo-store"

// GET /api/operators/<id>/logo?v=<version>: the operator logo, for signed-in users. The address
// changes with each new logo (?v=), so the browser may keep it for a year.
export async function GET(_request: Request, { params }: RouteContext<"/api/operators/[operatorId]/logo">): Promise<Response> {
  const { userId } = await auth()
  if (!userId) return new Response("Accès refusé.", { status: 401 })

  const { operatorId } = await params
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(operatorId)) return new Response("Introuvable.", { status: 404 })
  const logo = await readOperatorLogo(operatorId)
  if (!logo) return new Response("Introuvable.", { status: 404 })

  return new Response(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.mimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff", // the declared type only: never guessed by the browser
      "Content-Security-Policy": "default-src 'none'",
    },
  })
}
