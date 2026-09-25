import { Plus } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { dayKey, formatDayLabel } from "@/lib/dates"
import { requireActor } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { listRecentOperations, type OperationRow } from "@/server/operations/queries"

import { OperationItem } from "./operation-item"

function groupByDay(operations: readonly OperationRow[]) {
  const groups = new Map<string, OperationRow[]>()
  for (const operation of operations) {
    const key = dayKey(operation.createdAt)
    groups.set(key, [...(groups.get(key) ?? []), operation])
  }
  return [...groups.values()]
}

export default async function OperationsPage() {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  if (!authorize(ctx.actor, "transaction:view").allowed) redirect("/dashboard")

  const now = new Date()
  const operations = await listRecentOperations(ctx, 50, now)
  const canEnter = authorize(ctx.actor, "transaction:create").allowed

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title="Dernières opérations"
        subtitle={ctx.actor.role === "AGENT" ? "Vos opérations" : "50 plus récentes"}
        backHref="/dashboard"
      />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
        {ctx.actor.role === "AGENT" && (
          <p className="text-sm text-muted-foreground">
            Vous pouvez annuler vos opérations pendant 15 minutes, avec un motif. Au-delà, demandez au gérant.
          </p>
        )}

        {operations.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center">
            <p className="font-semibold">Aucune opération pour l&apos;instant.</p>
            {canEnter && (
              <Link href="/operations/new" className="flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
                <Plus className="size-5" aria-hidden />
                Saisir une opération
              </Link>
            )}
          </div>
        )}

        {groupByDay(operations).map((group) => (
          <section key={dayKey(group[0].createdAt)} className="flex flex-col gap-3">
            <h2 className="font-heading text-lg font-bold">{formatDayLabel(group[0].createdAt, now)}</h2>
            <ul className="flex flex-col gap-3">
              {group.map((operation) => (
                <OperationItem key={operation.id} operation={operation} showAuthor={ctx.actor.role !== "AGENT"} />
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  )
}
