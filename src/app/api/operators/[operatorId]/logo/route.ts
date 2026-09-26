import { readOperatorLogo } from "@/server/operators/logo-store"

// GET /api/operators/<id>/logo?v=<version>: the operator logo. Public (see src/proxy.ts): a
// logo belongs to the shared catalogue, not to an organization, and an image request made while
// the session token is being refreshed must not come back empty. The address changes with each
// new logo (?v=), so browsers may keep it for a year.
export async function GET(_request: Request, { params }: RouteContext<"/api/operators/[operatorId]/logo">): Promise<Response> {
  const { operatorId } = await params
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(operatorId)) return new Response("Introuvable.", { status: 404 })
  const logo = await readOperatorLogo(operatorId)
  if (!logo) return new Response("Introuvable.", { status: 404 })

  return new Response(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff", // the declared type only: never guessed by the browser
      "Content-Security-Policy": "default-src 'none'",
    },
  })
}
