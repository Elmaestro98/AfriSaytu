import { notFound, redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { formatDayLabel, formatTime } from "@/lib/dates"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { getAccountLedger } from "@/server/cash/ledger"

const LIMIT = 100

export default async function AccountLedgerPage({ params }: PageProps<"/cash/accounts/[accountId]">) {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }

  const { accountId } = await params
  const ledger = await getAccountLedger(ctx, accountId, LIMIT)
  if (!ledger) notFound()

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={`Grand livre · ${ledger.label}`} subtitle={ledger.branchName} backHref="/cash" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-primary p-5 text-primary-foreground">
          <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Solde théorique</p>
          <p className="mt-1 font-heading text-4xl font-extrabold tabular-nums">{formatFCFA(ledger.balance)}</p>
          <p className="mt-2 text-sm opacity-80">
            Somme exacte des {ledger.lineCount} lignes de ce compte.
            {ledger.lineCount > LIMIT && ` Les ${LIMIT} plus récentes sont affichées.`}
          </p>
        </section>

        {ledger.lines.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-muted-foreground">Aucune ligne pour ce compte.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {ledger.lines.map((line) => (
              <li key={line.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">{line.label}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[`${formatDayLabel(line.createdAt)} ${formatTime(line.createdAt)}`, line.authorName].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("font-heading font-bold whitespace-nowrap tabular-nums", line.delta < 0 ? "text-destructive" : "text-primary")}>
                    {line.delta > 0 ? "+" : ""}{formatFCFA(line.delta)}
                  </p>
                  <p className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">Solde {formatFCFA(line.runningBalance)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
