import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { SummaryStat } from "@/components/business/summary-stat"
import { PAGE } from "@/lib/layout"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { LEDGER_PERIODS, getAccountLedger, type LedgerPeriod } from "@/server/cash/ledger"
import { periodBounds } from "@/server/operations/history-where"

import { LedgerLines } from "./ledger-lines"

const PERIOD_LABELS: Record<LedgerPeriod, string> = { today: "Aujourd'hui", "7d": "7 jours", "30d": "30 jours", all: "Tout" }

// Ledger of one account (F-32): the balance is exactly the sum of its lines. Owner and managers.
export default async function AccountLedgerPage({ params, searchParams }: PageProps<"/cash/accounts/[accountId]">) {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }

  const [{ accountId }, query] = await Promise.all([params, searchParams])
  const period = LEDGER_PERIODS.find((value) => value === query.period) ?? "7d"
  const now = new Date()
  const ledger = await getAccountLedger(ctx, accountId, periodBounds(period, now)?.gte ?? null)
  if (!ledger) notFound()
  const href = (value: LedgerPeriod) => `/cash/accounts/${ledger.accountId}${value === "7d" ? "" : `?period=${value}`}`

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={`Grand livre · ${ledger.label}`} subtitle={ledger.branchName} backHref="/cash" />
      <main className={cn(PAGE, "gap-6")}>
        <section aria-label="Synthèse" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:p-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-10">
            <SummaryStat label="Solde actuel" value={formatFCFA(ledger.balance)} tone={ledger.balance < 0 ? "danger" : undefined} />
            {period !== "all" && <SummaryStat label="Début de période" value={formatFCFA(ledger.openingBalance)} />}
            <SummaryStat label="Entrées" value={`+${formatFCFA(ledger.credits)}`} />
            <SummaryStat label="Sorties" value={formatFCFA(ledger.debits)} />
          </div>
          <nav aria-label="Période" className="flex gap-1 rounded-xl border bg-card p-1 lg:self-start 2xl:self-auto">
            {LEDGER_PERIODS.map((value) => (
              <Link key={value} href={href(value)} scroll={false} aria-current={value === period ? "page" : undefined}
                className={cn("flex h-11 flex-1 items-center justify-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap",
                  value === period ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
                {PERIOD_LABELS[value]}
              </Link>
            ))}
          </nav>
        </section>

        <p className="text-sm text-muted-foreground">
          Le solde du compte est exactement la somme de ses lignes. Une opération annulée n&apos;est jamais effacée : une ligne inverse
          (en rouge) remet le solde comme avant.
          {ledger.lineCount > ledger.lines.length && ` Les ${ledger.lines.length} lignes les plus récentes de la période sont affichées.`}
        </p>

        {ledger.lines.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">Aucun mouvement sur cette période.</p>
        ) : (
          <LedgerLines lines={ledger.lines} now={now} />
        )}
      </main>
    </div>
  )
}
