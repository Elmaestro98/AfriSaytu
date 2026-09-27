import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { monthlyReportFile } from "@/server/reports/download"

// GET /api/reports/monthly?month=2026-09[&branch=<id>]: downloads the monthly report (PDF).
// The organization, the role and the branches come from the session; the month and the branch
// are checked against what the member may see.
export async function GET(request: Request): Promise<Response> {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) return new Response("Accès refusé. Reconnectez-vous.", { status: 401 })
    throw error
  }

  const url = new URL(request.url)
  const month = url.searchParams.get("month") ?? ""
  const branch = url.searchParams.get("branch") || null
  const result = await monthlyReportFile(ctx, month, branch)
  if (!result.ok) {
    return new Response(result.error, { status: result.status, headers: { "Content-Type": "text/plain; charset=utf-8" } })
  }

  return new Response(new Uint8Array(result.body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
