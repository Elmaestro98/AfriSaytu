import { renderToBuffer } from "@react-pdf/renderer"

import type { ActorContext } from "@/server/auth/actor"
import { recordAudit, singleBranch } from "@/server/audit/log"
import { MonthlyReportDocument } from "@/server/reports/pdf/document"
import { REPORT_LOGO } from "@/server/reports/pdf/logo-data"
import { ReportError, loadMonthlyReport } from "@/server/reports/monthly"

export type ReportFile = { ok: true; body: Buffer; filename: string } | { ok: false; status: number; error: string }

// "afrisaytu-rapport-2026-09.pdf", or with the branch: "afrisaytu-rapport-2026-09-kiosque-ugb.pdf".
// Safe characters only: the name goes into a Content-Disposition header.
export function reportFileName(month: string, branchName: string | null): string {
  const slug = (branchName ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  return `afrisaytu-rapport-${month}${slug ? `-${slug}` : ""}.pdf`
}

// The monthly report as a PDF file, recorded in the audit journal like any export (section 9).
export async function monthlyReportFile(ctx: ActorContext, month: string, branchId: string | null, now = new Date()): Promise<ReportFile> {
  let report
  try {
    report = await loadMonthlyReport(ctx, month, branchId, now)
  } catch (error) {
    if (error instanceof ReportError) return { ok: false, status: error.status, error: error.message }
    throw error
  }

  // Called as a function: the renderer wants the <Document> element itself.
  const body = await renderToBuffer(MonthlyReportDocument({ report, logo: REPORT_LOGO }))

  await recordAudit(ctx, {
    action: "data.export",
    entity: "Report",
    branchId: branchId ?? singleBranch(ctx.actor.branchIds),
    after: { format: "pdf", report: "monthly", month, branchId },
  })

  return { ok: true, body, filename: reportFileName(month, report.branchName) }
}
