import { Clock } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { formatDayLabel, formatTime } from "@/lib/dates"
import { PAGE } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { loadClosingContext } from "@/server/closing/queries"

import { ClosingHistory } from "./closing-history"
import { ClosingScreen } from "./closing-screen"
import { RecapTable } from "./recap-table"

export default async function ClosingPage({ searchParams }: PageProps<"/closing">) {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  if (!authorize(ctx.actor, "closing:validate").allowed) redirect("/dashboard")

  const requested = (await searchParams).branch
  const context = await loadClosingContext(ctx, typeof requested === "string" ? requested : undefined)
  const branchName = context?.branches.find((branch) => branch.id === context.branchId)?.name

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Clôture de journée" subtitle={branchName} />
      <main className={cn(PAGE, "gap-5")}>
        {context && context.branches.length > 1 && (
          <nav aria-label="Point de vente" className="flex gap-2 overflow-x-auto">
            {context.branches.map((branch) => (
              <Link key={branch.id} href={`/closing?branch=${branch.id}`}
                className={cn("flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold",
                  branch.id === context.branchId ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
                {branch.name}
              </Link>
            ))}
          </nav>
        )}

        {!context ? (
          <p className="rounded-xl border border-dashed p-4 text-muted-foreground">Aucun point de vente disponible.</p>
        ) : (
          <>
            <p className="flex items-center gap-2 self-start rounded-full bg-brand-accent/20 px-3 py-1.5 text-sm font-semibold">
              <Clock className="size-4" aria-hidden />
              Journée ouverte {context.since ? `depuis ${formatDayLabel(context.since).toLowerCase()} à ${formatTime(context.since)}` : "depuis la configuration"}
            </p>
            <p className="text-sm text-muted-foreground lg:max-w-2xl">
              Relevez le solde affiché dans chaque application opérateur et comptez les espèces du tiroir. Tout écart doit être expliqué avant de verrouiller.
            </p>
            <RecapTable rows={context.recap} />
            <ClosingScreen key={context.previousClosingId ?? "first"} context={context} />
            <ClosingHistory rows={context.history} />
          </>
        )}
      </main>
    </div>
  )
}
