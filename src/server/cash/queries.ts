import type { MovementKind } from "@/generated/prisma/enums"
import type { ActorContext } from "@/server/auth/actor"
import { getBalances } from "@/server/ledger/balances"

export type CashAccount = {
  id: string
  kind: "OPERATOR" | "CASH"
  label: string
  color: string | null
  accountNumber: string | null
  alertThreshold: number | null
  balance: number
}

export type MovementRow = {
  id: string
  kind: MovementKind
  amount: number
  description: string | null
  authorName: string
  fromLabel: string | null
  toLabel: string | null
  createdAt: Date
}

export type CashContext = {
  branches: { id: string; name: string }[]
  branchId: string
  accounts: CashAccount[]
  movements: MovementRow[]
  canViewLedger: boolean // the detailed ledger shows everyone's operations: not for agents
}

// Data of the cash screen (mockup 04) for one branch.
export async function loadCashContext(ctx: ActorContext, requestedBranchId?: string): Promise<CashContext | null> {
  const branches = await ctx.db.branch.findMany({
    where: { isActive: true, ...(ctx.actor.role === "OWNER" ? {} : { id: { in: [...ctx.actor.branchIds] } }) },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  })
  const branch = branches.find((item) => item.id === requestedBranchId) ?? branches[0]
  if (!branch) return null

  const [accounts, movements] = await Promise.all([
    ctx.db.account.findMany({
      where: { branchId: branch.id, isActive: true },
      orderBy: [{ kind: "asc" }, { label: "asc" }], // operators first, cash drawer last
      select: { id: true, kind: true, label: true, accountNumber: true, alertThreshold: true, operator: { select: { color: true } } },
    }),
    ctx.db.internalMovement.findMany({
      where: { branchId: branch.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        kind: true,
        amount: true,
        description: true,
        createdAt: true,
        member: { select: { name: true } },
        fromAccount: { select: { label: true } },
        toAccount: { select: { label: true } },
      },
    }),
  ])
  const balances = await getBalances(ctx.db, accounts.map((account) => account.id))

  return {
    branches,
    branchId: branch.id,
    accounts: accounts.map((account) => ({
      id: account.id,
      kind: account.kind,
      label: account.label,
      color: account.operator?.color ?? null,
      accountNumber: account.accountNumber,
      alertThreshold: account.alertThreshold,
      balance: balances.get(account.id) ?? 0,
    })),
    movements: movements.map((movement) => ({
      id: movement.id,
      kind: movement.kind,
      amount: movement.amount,
      description: movement.description,
      authorName: movement.member.name,
      fromLabel: movement.fromAccount?.label ?? null,
      toLabel: movement.toAccount?.label ?? null,
      createdAt: movement.createdAt,
    })),
    canViewLedger: ctx.actor.role !== "AGENT",
  }
}
