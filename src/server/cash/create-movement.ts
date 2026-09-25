import { Prisma } from "@/generated/prisma/client"
import { LedgerReason } from "@/generated/prisma/enums"
import { formatFCFA } from "@/lib/money"
import { MOVEMENT_LABELS } from "@/lib/movement-kinds"
import type { CreateMovementInput } from "@/schemas/movement"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { getBalances } from "@/server/ledger/balances"
import { PostingError, movementPostings, type MovementAccount } from "@/server/ledger/postings"

export type CreateMovementResult =
  | { ok: true; message: string; warning: string | null }
  | { ok: false; error: string }

const ACCOUNT_ERROR = "Les comptes choisis ne conviennent pas à ce mouvement."

// Records an internal movement (no customer) and its ledger lines in ONE SQL transaction.
export async function createMovement(ctx: ActorContext, input: CreateMovementInput): Promise<CreateMovementResult> {
  const replay = await ctx.db.internalMovement.findFirst({ where: { idempotencyKey: input.idempotencyKey }, select: { id: true } })
  if (replay) return { ok: true, message: "Mouvement déjà enregistré.", warning: null }

  // Same scope as entering an operation: anyone working on the branch.
  if (!authorize(ctx.actor, "transaction:create", { branchId: input.branchId }).allowed) {
    return { ok: false, error: "Vous ne pouvez pas saisir de mouvement dans ce point de vente." }
  }

  // The ids come from the client: they must be active accounts of THIS branch.
  const ids = [input.fromAccountId, input.toAccountId].filter((id): id is string => id !== null)
  const accounts = await ctx.db.account.findMany({
    where: { id: { in: ids }, branchId: input.branchId, isActive: true },
    select: { id: true, kind: true },
  })
  const byId = new Map<string, MovementAccount>(accounts.map((account) => [account.id, account]))
  const from = input.fromAccountId ? byId.get(input.fromAccountId) : undefined
  const to = input.toAccountId ? byId.get(input.toAccountId) : undefined
  if ((input.fromAccountId && !from) || (input.toAccountId && !to)) return { ok: false, error: ACCOUNT_ERROR }

  let postings
  try {
    postings = movementPostings({ kind: input.kind, amount: input.amount, from, to })
  } catch (error) {
    if (error instanceof PostingError) return { ok: false, error: ACCOUNT_ERROR }
    throw error
  }

  const [organization, balances] = await Promise.all([
    ctx.db.organization.findFirst({ select: { blockNegativeBalance: true } }),
    getBalances(ctx.db, postings.map((posting) => posting.accountId)),
  ])
  const goesNegative = postings.some((posting) => posting.delta < 0 && (balances.get(posting.accountId) ?? 0) + posting.delta < 0)
  if (goesNegative && organization?.blockNegativeBalance) {
    return { ok: false, error: "Solde insuffisant : ce mouvement rendrait un solde négatif." }
  }

  try {
    await ctx.db.$transaction(async (tx) => {
      const movement = await tx.internalMovement.create({
        data: {
          organizationId: ctx.organizationId,
          branchId: input.branchId,
          memberId: ctx.actor.memberId,
          kind: input.kind,
          amount: input.amount,
          fromAccountId: from?.id ?? null,
          toAccountId: to?.id ?? null,
          description: input.description,
          idempotencyKey: input.idempotencyKey,
        },
        select: { id: true },
      })
      await tx.ledgerEntry.createMany({
        data: postings.map((posting) => ({
          organizationId: ctx.organizationId,
          accountId: posting.accountId,
          delta: posting.delta,
          reason: LedgerReason.MOVEMENT,
          movementId: movement.id,
          memberId: ctx.actor.memberId,
        })),
      })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: true, message: "Mouvement déjà enregistré.", warning: null }
    }
    throw error
  }

  return {
    ok: true,
    message: `${MOVEMENT_LABELS[input.kind]} de ${formatFCFA(input.amount)} enregistré.`,
    warning: goesNegative ? "Attention : un solde est maintenant négatif." : null,
  }
}
