import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { OperatorBadge } from "@/components/business/operator-badge"
import { SummaryStat } from "@/components/business/summary-stat"
import { formatMonth, isMonthKey, monthKey, shiftMonth } from "@/lib/dates"
import { PAGE } from "@/lib/layout"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { defaultPayoutMonth } from "@/server/cash/payout"
import { ReconciliationAccessError, loadReconciliation } from "@/server/commissions/reconciliation"

function signed(amount: number): string {
  return `${amount > 0 ? "+" : ""}${formatFCFA(amount)}`
}

// Commission reconciliation (F-55): what AfriSaytu computed for a month against what each operator
// paid for that month. Owner and managers.
export default async function ReconciliationPage({ searchParams }: PageProps<"/stats/reconciliation">) {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }

  const now = new Date()
  const current = monthKey(now)
  const requested = (await searchParams).month
  const month = typeof requested === "string" && isMonthKey(requested) && requested <= current ? requested : defaultPayoutMonth(now)
  let data
  try {
    data = await loadReconciliation(ctx, month, now)
  } catch (error) {
    if (error instanceof ReconciliationAccessError) redirect("/stats")
    throw error
  }
  const next = shiftMonth(month, 1)

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Rapprochement des commissions" subtitle="Estimées par AfriSaytu, reçues des opérateurs" backHref="/stats" />
      <main className={cn(PAGE, "gap-6")}>
        <nav aria-label="Mois" className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-2">
          <Link href={`/stats/reconciliation?month=${shiftMonth(month, -1)}`} aria-label="Mois précédent"
            className="flex size-11 items-center justify-center rounded-xl hover:bg-accent">
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <p className="font-heading text-lg font-bold capitalize">{formatMonth(month)}</p>
          {next <= current ? (
            <Link href={`/stats/reconciliation?month=${next}`} aria-label="Mois suivant" className="flex size-11 items-center justify-center rounded-xl hover:bg-accent">
              <ChevronRight className="size-5" aria-hidden />
            </Link>
          ) : (
            <span className="size-11" aria-hidden />
          )}
        </nav>

        <section aria-label="Synthèse" className="grid grid-cols-3 gap-4 rounded-2xl border bg-card p-4 lg:p-5">
          <SummaryStat label="Estimé" value={formatFCFA(data.estimated)} />
          <SummaryStat label="Reçu" value={formatFCFA(data.received)} />
          <SummaryStat label="Écart" value={signed(data.gap)} tone={data.gap < 0 ? "warning" : undefined} />
        </section>

        {month === current && (
          <p className="rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
            Mois en cours : l&apos;estimé grandit jusqu&apos;à la fin du mois, et les opérateurs versent en général le mois suivant.
          </p>
        )}

        {data.lines.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center">
            <p className="font-semibold">Rien à rapprocher pour {formatMonth(month)}.</p>
            <p className="text-sm text-muted-foreground">Aucune commission estimée ni aucun versement enregistré pour ce mois.</p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.lines.map((line) => (
              <li key={line.operatorId} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <OperatorBadge name={line.name} color={line.color} logoSrc={line.logoSrc} className="size-10 text-sm" />
                  <p className="min-w-0 flex-1 truncate font-heading text-lg font-bold">{line.name}</p>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                    line.gap < 0 ? "bg-destructive text-white" : line.gap > 0 ? "bg-brand-accent text-brand-accent-foreground" : "bg-primary text-primary-foreground")}>
                    {line.gap === 0 ? "Conforme" : signed(line.gap)}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Estimé</dt>
                    <dd className="font-heading text-lg font-bold tabular-nums">{formatFCFA(line.estimated)}</dd>
                    {line.daily > 0 && <dd className="text-xs text-muted-foreground tabular-nums">dont {formatFCFA(line.daily)} du jour</dd>}
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Reçu</dt>
                    <dd className="font-heading text-lg font-bold tabular-nums">{formatFCFA(line.received)}</dd>
                  </div>
                </dl>
                {line.gap < 0 && line.received > 0 && (
                  <p className="text-sm text-destructive">Il manque {formatFCFA(-line.gap)} : à vérifier auprès de {line.name}.</p>
                )}
                {line.received === 0 && <p className="text-sm text-muted-foreground">Aucun versement enregistré pour ce mois.</p>}
              </li>
            ))}
          </ul>
        )}

        {data.unassigned > 0 && (
          <p className="text-sm text-muted-foreground">
            {formatFCFA(data.unassigned)} de versements enregistrés sans opérateur ne sont rattachés à aucune ligne.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Les versements s&apos;enregistrent dans Caisse → Mouvement → « Versement de commissions », avec le mois qu&apos;ils couvrent.
        </p>
      </main>
    </div>
  )
}
