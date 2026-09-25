import { operatorLogoSrc } from "@/lib/operator-logo"
import type { ActorContext } from "@/server/auth/actor"
import { getBalances } from "@/server/ledger/balances"
import { listActiveOrgOperators } from "@/server/operators/manage"

export type AccountRow = {
  id: string
  kind: "OPERATOR" | "CASH"
  label: string
  color: string | null
  logoSrc: string | null
  accountNumber: string | null
  alertThreshold: number | null
  balance: number // theoretical balance = sum of ledger lines
  operatorActive: boolean
}

export type BranchRow = {
  id: string
  name: string
  address: string | null
  accounts: AccountRow[]
  addableOperators: { id: string; name: string; color: string | null; logoSrc: string | null }[]
}

// Branches the current user manages: all for the owner, their own for a manager.
export async function listManagedBranches(ctx: ActorContext): Promise<BranchRow[]> {
  const branches = await ctx.db.branch.findMany({
    where: {
      isActive: true,
      ...(ctx.actor.role === "OWNER" ? {} : { id: { in: [...ctx.actor.branchIds] } }),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      accounts: {
        where: { isActive: true },
        // Enum order in PostgreSQL follows the declaration: OPERATOR first, CASH drawer last.
        orderBy: [{ kind: "asc" }, { label: "asc" }],
        select: {
          id: true,
          kind: true,
          label: true,
          accountNumber: true,
          alertThreshold: true,
          operatorId: true,
          operator: { select: { color: true, logo: { select: { updatedAt: true } } } },
        },
      },
    },
  })

  const activeOperators = await listActiveOrgOperators(ctx)
  const activeIds = new Set(activeOperators.map((operator) => operator.id))
  const balances = await getBalances(
    ctx.db,
    branches.flatMap((branch) => branch.accounts.map((account) => account.id)),
  )

  return branches.map((branch) => {
    const present = new Set(branch.accounts.map((account) => account.operatorId))
    return {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      accounts: branch.accounts.map((account) => ({
        id: account.id,
        kind: account.kind,
        label: account.label,
        color: account.operator?.color ?? null,
        logoSrc: account.operatorId ? operatorLogoSrc(account.operatorId, account.operator?.logo?.updatedAt) : null,
        accountNumber: account.accountNumber,
        alertThreshold: account.alertThreshold,
        balance: balances.get(account.id) ?? 0,
        operatorActive: account.operatorId === null || activeIds.has(account.operatorId),
      })),
      addableOperators: activeOperators.filter((operator) => !present.has(operator.id)),
    }
  })
}

export async function countActiveBranches(ctx: ActorContext): Promise<number> {
  return ctx.db.branch.count({ where: { isActive: true } })
}
