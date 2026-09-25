import type { Prisma } from "@/generated/prisma/client"
import type { TransactionType } from "@/generated/prisma/enums"
import { operatorLogoSrc } from "@/lib/operator-logo"
import { formatPhone, maskPhone } from "@/lib/phone"
import type { ActorContext } from "@/server/auth/actor"
import { DAILY_VOLUME_TYPES } from "@/server/commissions/daily"
import { planCancellation } from "@/server/operations/cancel-rules"
import { visibilityWhere } from "@/server/operations/history-where"

export type OperationRow = {
  id: string
  type: TransactionType
  amount: number
  fee: number
  commission: number
  noRule: boolean
  dailyCommission: boolean // deposit/withdrawal of a daily-volume operator: earns via the day's total
  operatorName: string
  operatorColor: string | null
  operatorLogoSrc: string | null
  branchName: string
  authorName: string
  customerPhone: string | null // already masked for agents
  reference: string | null
  createdAt: Date
  status: "VALID" | "CANCELLED"
  cancelReason: string | null
  canCancel: boolean
}

export const OPERATION_SELECT = {
  id: true,
  type: true,
  amount: true,
  fee: true,
  commission: true,
  noRule: true,
  customerPhone: true,
  reference: true,
  createdAt: true,
  status: true,
  cancelReason: true,
  branchId: true,
  memberId: true,
  closingId: true,
  operator: { select: { id: true, name: true, color: true, commissionMode: true, logo: { select: { updatedAt: true } } } },
  branch: { select: { name: true } },
  member: { select: { name: true } },
} satisfies Prisma.TransactionSelect

type SelectedOperation = Prisma.TransactionGetPayload<{ select: typeof OPERATION_SELECT }>

// Customer numbers are personal data (law 2008-12): agents only see them partly (77 *** ** 34).
export function toOperationRow(ctx: ActorContext, operation: SelectedOperation, now: Date): OperationRow {
  const phone = operation.customerPhone
  return {
    id: operation.id,
    type: operation.type,
    amount: operation.amount,
    fee: operation.fee,
    commission: operation.commission,
    noRule: operation.noRule,
    dailyCommission: operation.operator.commissionMode === "DAILY_VOLUME" && DAILY_VOLUME_TYPES.includes(operation.type) && operation.commission === 0,
    operatorName: operation.operator.name,
    operatorColor: operation.operator.color,
    operatorLogoSrc: operatorLogoSrc(operation.operator.id, operation.operator.logo?.updatedAt),
    branchName: operation.branch.name,
    authorName: operation.member.name,
    customerPhone: phone ? (ctx.actor.role === "AGENT" ? maskPhone(phone) : formatPhone(phone)) : null,
    reference: operation.reference,
    createdAt: operation.createdAt,
    status: operation.status,
    cancelReason: operation.cancelReason,
    canCancel: planCancellation(ctx.actor, operation, now).ok,
  }
}

// Latest operations the current user may see (dashboard).
export async function listRecentOperations(ctx: ActorContext, limit = 50, now = new Date()): Promise<OperationRow[]> {
  const operations = await ctx.db.transaction.findMany({
    where: visibilityWhere(ctx.actor),
    orderBy: { createdAt: "desc" },
    take: limit,
    select: OPERATION_SELECT,
  })
  return operations.map((operation) => toOperationRow(ctx, operation, now))
}
