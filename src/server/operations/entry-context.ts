import type { CommissionMode, RoundingMode, TransactionType } from "@/generated/prisma/enums"
import { operatorLogoSrc } from "@/lib/operator-logo"
import type { ActorContext } from "@/server/auth/actor"
import type { Rule } from "@/server/commissions/resolve"
import { getBalances } from "@/server/ledger/balances"
import { resolveEffects, type EffectMatrix } from "@/server/ledger/effects"

// Everything the entry screen needs to compute instantly, loaded once with the page.

export type EntryOperator = {
  id: string
  name: string
  color: string | null
  logoSrc: string | null
  commissionMode: CommissionMode
  uvAccountId: string
  uvBalance: number
  effects: EffectMatrix
}

export type EntryBranch = {
  id: string
  name: string
  cashAccountId: string
  cashBalance: number
  operators: EntryOperator[]
}

export type EntryContext = {
  branches: EntryBranch[]
  rules: Rule[]
  roundingMode: RoundingMode
  allowManualCommission: boolean
  blockNegativeBalance: boolean
  last: { branchId: string; operatorId: string; type: TransactionType } | null
}

export async function loadEntryContext(ctx: ActorContext, now = new Date()): Promise<EntryContext> {
  const branchFilter = ctx.actor.role === "OWNER" ? {} : { id: { in: [...ctx.actor.branchIds] } }

  const [organization, branches, orgOperators, rules, last] = await Promise.all([
    ctx.db.organization.findFirst({
      select: { roundingMode: true, allowManualCommission: true, blockNegativeBalance: true },
    }),
    ctx.db.branch.findMany({
      where: { isActive: true, ...branchFilter },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        accounts: {
          where: { isActive: true },
          select: { id: true, kind: true, operatorId: true, operator: { select: { name: true, color: true, isActive: true, defaultEffects: true, commissionMode: true, logo: { select: { updatedAt: true } } } } },
        },
      },
    }),
    ctx.db.orgOperator.findMany({ where: { isActive: true }, select: { operatorId: true, effectsConfig: true } }),
    ctx.db.commissionRule.findMany({ where: { isActive: true, OR: [{ validTo: null }, { validTo: { gt: now } }] } }),
    ctx.db.transaction.findFirst({
      where: { memberId: ctx.actor.memberId },
      orderBy: { createdAt: "desc" },
      select: { branchId: true, operatorId: true, type: true },
    }),
  ])

  const activeOperators = new Map(orgOperators.map((row) => [row.operatorId, row.effectsConfig]))
  const balances = await getBalances(ctx.db, branches.flatMap((branch) => branch.accounts.map((account) => account.id)))

  const entryBranches: EntryBranch[] = []
  for (const branch of branches) {
    const cash = branch.accounts.find((account) => account.kind === "CASH")
    if (!cash) continue // a branch without a cash drawer cannot record operations

    const operators: EntryOperator[] = []
    for (const account of branch.accounts) {
      const operator = account.operator
      if (account.kind !== "OPERATOR" || !account.operatorId || !operator?.isActive) continue
      if (!activeOperators.has(account.operatorId)) continue // switched off for the organization
      operators.push({
        id: account.operatorId,
        name: operator.name,
        color: operator.color,
        logoSrc: operatorLogoSrc(account.operatorId, operator.logo?.updatedAt),
        commissionMode: operator.commissionMode,
        uvAccountId: account.id,
        uvBalance: balances.get(account.id) ?? 0,
        effects: resolveEffects(operator.defaultEffects, activeOperators.get(account.operatorId)),
      })
    }
    operators.sort((a, b) => a.name.localeCompare(b.name, "fr"))

    entryBranches.push({
      id: branch.id,
      name: branch.name,
      cashAccountId: cash.id,
      cashBalance: balances.get(cash.id) ?? 0,
      operators,
    })
  }

  return {
    branches: entryBranches,
    rules,
    roundingMode: organization?.roundingMode ?? "NEAREST",
    allowManualCommission: organization?.allowManualCommission ?? false,
    blockNegativeBalance: organization?.blockNegativeBalance ?? false,
    last,
  }
}
