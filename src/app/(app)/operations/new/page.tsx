import Link from "next/link"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { requireActor } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { loadCorrection } from "@/server/operations/correction"
import { loadEntryContext } from "@/server/operations/entry-context"

import { EntryScreen } from "./entry-screen"

export default async function NewOperationPage({ searchParams }: PageProps<"/operations/new">) {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  if (!authorize(ctx.actor, "transaction:create").allowed) redirect("/dashboard")

  const query = await searchParams
  const [context, correction] = await Promise.all([
    loadEntryContext(ctx),
    typeof query.correct === "string" ? loadCorrection(ctx, query.correct) : Promise.resolve(null),
  ])
  const usable = context.branches.filter((branch) => branch.operators.length > 0)
  const requested = correction?.branchId ?? query.branch
  const branch =
    usable.find((item) => item.id === requested) ??
    usable.find((item) => item.id === context.last?.branchId) ??
    usable[0]

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={correction ? "Corriger une opération" : "Nouvelle opération"} subtitle={branch?.name} backHref={correction ? "/operations" : "/dashboard"} />

      {usable.length > 1 && (
        <nav aria-label="Point de vente" className="mx-auto flex w-full max-w-md gap-2 overflow-x-auto px-4 pt-4 lg:mx-0 lg:max-w-6xl lg:px-8 lg:pt-6">
          {usable.map((item) => (
            <Link key={item.id} href={`/operations/new?branch=${item.id}`}
              className={`flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${item.id === branch?.id ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
              {item.name}
            </Link>
          ))}
        </nav>
      )}

      {branch ? (
        <EntryScreen key={`${branch.id}:${correction?.transactionId ?? ""}`} context={{ ...context, branches: usable }} branchId={branch.id}
          correction={correction?.branchId === branch.id ? correction : null} />
      ) : (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-10 text-center lg:mx-0 lg:px-8 lg:text-left">
          <p className="font-heading text-xl font-bold">Aucun opérateur disponible</p>
          <p className="text-muted-foreground">
            Votre point de vente n&apos;a pas encore de compte opérateur actif. Demandez au responsable de l&apos;ajouter
            dans Points de vente.
          </p>
        </main>
      )}
    </div>
  )
}
