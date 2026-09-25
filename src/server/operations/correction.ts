import type { TransactionType } from "@/generated/prisma/enums"
import { formatFCFA } from "@/lib/money"
import { TYPE_LABELS } from "@/lib/operation-types"
import type { ActorContext } from "@/server/auth/actor"
import { visibilityWhere } from "@/server/operations/history-where"

// "Corriger" = cancel (with its usual rights and audit) + enter again, pre-filled with the
// cancelled operation. A validated operation is never edited (CLAUDE.md, rule 4).
export type EntryCorrection = {
  transactionId: string
  label: string // "Dépôt Wave de 25 000 FCFA"
  cancelReason: string | null
  branchId: string
  operatorId: string
  type: TransactionType
  amount: number
  customerPhone: string
  reference: string
  note: string
  fee: number | null // kept only when it had been typed by hand; otherwise the rule applies again
  feeInCash: boolean
}

// The cancelled operation to correct, if the user may see it. The full customer number is only
// given back to its author, a manager or the owner (personal data, law 2008-12).
export async function loadCorrection(ctx: ActorContext, transactionId: string): Promise<EntryCorrection | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(transactionId)) return null
  const operation = await ctx.db.transaction.findFirst({
    where: { AND: [visibilityWhere(ctx.actor), { id: transactionId, status: "CANCELLED" }] },
    select: {
      id: true,
      memberId: true,
      branchId: true,
      operatorId: true,
      type: true,
      amount: true,
      fee: true,
      feeManual: true,
      feeInCash: true,
      customerPhone: true,
      reference: true,
      note: true,
      cancelReason: true,
      operator: { select: { name: true } },
    },
  })
  if (!operation) return null

  const mayReadPhone = ctx.actor.role !== "AGENT" || operation.memberId === ctx.actor.memberId
  return {
    transactionId: operation.id,
    label: `${TYPE_LABELS[operation.type]} ${operation.operator.name} de ${formatFCFA(operation.amount)}`,
    cancelReason: operation.cancelReason,
    branchId: operation.branchId,
    operatorId: operation.operatorId,
    type: operation.type,
    amount: operation.amount,
    customerPhone: mayReadPhone ? (operation.customerPhone ?? "") : "",
    reference: operation.reference ?? "",
    note: operation.note ?? "",
    fee: operation.feeManual ? operation.fee : null,
    feeInCash: operation.feeInCash,
  }
}
