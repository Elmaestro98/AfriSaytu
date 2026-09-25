import { parseHistoryFilters } from "@/lib/history-filters"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { exportOperations } from "@/server/export/operations"

// GET /api/export/operations?format=csv|xlsx&<history filters>: downloads the file.
export async function GET(request: Request): Promise<Response> {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) return new Response("Accès refusé. Reconnectez-vous.", { status: 401 })
    throw error
  }

  const params = new URL(request.url).searchParams
  const format = params.get("format") === "xlsx" ? "xlsx" : "csv"
  const filters = parseHistoryFilters(Object.fromEntries(params))

  const result = await exportOperations(ctx, filters, format)
  if (!result.ok) {
    return new Response(result.error, { status: result.status, headers: { "Content-Type": "text/plain; charset=utf-8" } })
  }

  return new Response(new Uint8Array(typeof result.body === "string" ? Buffer.from(result.body, "utf8") : result.body), {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
