import type { TransactionType } from "@/generated/prisma/enums"
import { formatPhone, maskPhone } from "@/lib/phone"
import type { ActorContext } from "@/server/auth/actor"
import { planCancellation } from "@/server/operations/cancel-rules"

export type OperationRow = {
  id: string
  type: TransactionType
  amount: number
  fee: number
  commission: number
  noRule: boolean
  operatorName: string
  operatorColor: string | null
  branchName: string
  authorName: string
  customerPhone: string | null // already masked for agents
  reference: string | null
  createdAt: Date
  status: "VALID" | "CANCELLED"
  cancelReason: string | null
  canCancel: boolean
}

// Latest operations the current user may see: all (owner), their branches (manager),
// their own (agent). The full history with filters comes with the history screen.
export async function listRecentOperations(ctx: ActorContext, limit = 50, now = new Date()): Promise<OperationRow[]> {
  const visibility =
    ctx.actor.role === "OWNER"
      ? {}
      : ctx.actor.role === "MANAGER"
        ? { branchId: { in: [...ctx.actor.branchIds] } }
        : { memberId: ctx.actor.memberId }

  const operations = await ctx.db.transaction.findMany({
    where: visibility,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
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
      operator: { select: { name: true, color: true } },
      branch: { select: { name: true } },
      member: { select: { name: true } },
    },
  })

  // Customer numbers are personal data: agents only see them partly (77 *** ** 34).
  const showPhone = (phone: string) => (ctx.actor.role === "AGENT" ? maskPhone(phone) : formatPhone(phone))

  return operations.map((operation) => ({
    id: operation.id,
    type: operation.type,
    amount: operation.amount,
    fee: operation.fee,
    commission: operation.commission,
    noRule: operation.noRule,
    operatorName: operation.operator.name,
    operatorColor: operation.operator.color,
    branchName: operation.branch.name,
    authorName: operation.member.name,
    customerPhone: operation.customerPhone ? showPhone(operation.customerPhone) : null,
    reference: operation.reference,
    createdAt: operation.createdAt,
    status: operation.status,
    cancelReason: operation.cancelReason,
    canCancel: planCancellation(ctx.actor, operation, now).ok,
  }))
}
