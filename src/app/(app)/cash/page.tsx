import Link from "next/link"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { PAGE } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { loadCashContext } from "@/server/cash/queries"

import { CashScreen } from "./cash-screen"

export default async function CashPage({ searchParams }: PageProps<"/cash">) {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  if (!authorize(ctx.actor, "transaction:create").allowed) redirect("/dashboard")

  const requested = (await searchParams).branch
  const context = await loadCashContext(ctx, typeof requested === "string" ? requested : undefined)
  const branchName = context?.branches.find((branch) => branch.id === context.branchId)?.name

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Caisse" subtitle={branchName} />
      <main className={cn(PAGE, "gap-4")}>
        {context && context.branches.length > 1 && (
          <nav aria-label="Point de vente" className="flex gap-2 overflow-x-auto">
            {context.branches.map((branch) => (
              <Link key={branch.id} href={`/cash?branch=${branch.id}`}
                className={cn("flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold",
                  branch.id === context.branchId ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
                {branch.name}
              </Link>
            ))}
          </nav>
        )}
        {context ? (
          <CashScreen key={context.branchId} context={context} branchName={branchName ?? ""} loadedAt={new Date()} />
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-muted-foreground">Aucun point de vente disponible.</p>
        )}
      </main>
    </div>
  )
}
