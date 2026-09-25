import { dayKey } from "@/lib/dates"
import type { HistoryFilters } from "@/lib/history-filters"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { recordAudit, singleBranch } from "@/server/audit/log"
import { toCsv, toExportRecord } from "@/server/export/operations-file"
import { toXlsx } from "@/server/export/operations-xlsx"
import { buildHistoryWhere } from "@/server/operations/history-where"
import { getCurrentPlan, getSubscriptionState } from "@/server/plans/current"
import { SUSPENDED_ERROR } from "@/server/plans/lifecycle"

export const MAX_EXPORT_ROWS = 50_000

export type ExportFormat = "csv" | "xlsx"

export type ExportResult =
  | { ok: true; body: Buffer | string; contentType: string; filename: string; count: number }
  | { ok: false; status: number; error: string }

// Whether the export is offered at all: the Basic plan has none (cahier 13).
export async function canExportOperations(ctx: ActorContext): Promise<boolean> {
  if (!authorize(ctx.actor, "data:export").allowed) return false
  return (await getCurrentPlan(ctx)) !== "BASIC"
}

// Export of the operations matching the history filters (F-53). Same visibility as the screen:
// everything (owner), their branches (manager), their own operations (agent). Every export is
// recorded in the audit log.
export async function exportOperations(
  ctx: ActorContext,
  filters: HistoryFilters,
  format: ExportFormat,
  now = new Date(),
): Promise<ExportResult> {
  // Read only still exports (F-62: the history stays exportable); a suspended account does not.
  if ((await getSubscriptionState(ctx, now)).access === "BLOCKED") return { ok: false, status: 403, error: SUSPENDED_ERROR }
  if (!(await canExportOperations(ctx))) {
    return { ok: false, status: 403, error: "L'export est disponible à partir de la formule Pro." }
  }

  const operations = await ctx.db.transaction.findMany({
    where: buildHistoryWhere(filters, ctx.actor, now),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: MAX_EXPORT_ROWS + 1,
    select: {
      createdAt: true,
      type: true,
      amount: true,
      fee: true,
      commission: true,
      noRule: true,
      customerPhone: true,
      reference: true,
      status: true,
      cancelReason: true,
      note: true,
      operator: { select: { name: true } },
      branch: { select: { name: true } },
      member: { select: { name: true } },
    },
  })
  if (operations.length > MAX_EXPORT_ROWS) {
    return { ok: false, status: 413, error: "Trop d'opérations pour un seul fichier. Choisissez une période plus courte." }
  }

  const records = operations.map((operation) =>
    toExportRecord(
      {
        ...operation,
        operatorName: operation.operator.name,
        branchName: operation.branch.name,
        authorName: operation.member.name,
      },
      ctx.actor.role === "AGENT",
    ),
  )

  await recordAudit(ctx, {
    action: "data.export",
    entity: "Transaction",
    branchId: filters.branch || singleBranch(ctx.actor.branchIds),
    after: { format, count: records.length, filters: { ...filters, limit: undefined } },
  })

  const filename = `afrisaytu-operations-${dayKey(now)}.${format}`
  if (format === "xlsx") {
    return {
      ok: true,
      body: await toXlsx(records, "Opérations AfriSaytu"),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename,
      count: records.length,
    }
  }
  return { ok: true, body: toCsv(records), contentType: "text/csv; charset=utf-8", filename, count: records.length }
}
