import { Ban, CreditCard, Download, Lock, Percent, Settings, Unlock, Users, type LucideIcon } from "lucide-react"

import { dayKey, formatDayLabel, formatTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { AuditRow } from "@/server/audit/queries"

// Family of an action, for its icon: the most sensitive ones (cancellation, reopening) stand out.
function iconOf(action: string): { icon: LucideIcon; tone: string } {
  if (action === "transaction.cancel") return { icon: Ban, tone: "bg-destructive/10 text-destructive" }
  if (action === "closing.reopen") return { icon: Unlock, tone: "bg-brand-accent/20 text-brand-accent-strong" }
  if (action.startsWith("closing.")) return { icon: Lock, tone: "bg-accent text-accent-foreground" }
  if (action.startsWith("commissionRule.")) return { icon: Percent, tone: "bg-accent text-accent-foreground" }
  if (action.startsWith("member.")) return { icon: Users, tone: "bg-accent text-accent-foreground" }
  if (action === "data.export") return { icon: Download, tone: "bg-accent text-accent-foreground" }
  if (action.startsWith("subscription.")) return { icon: CreditCard, tone: "bg-primary/10 text-primary" }
  return { icon: Settings, tone: "bg-muted text-muted-foreground" }
}

// Journal entries grouped by Dakar day, latest first.
export function AuditList({ rows, now }: { rows: readonly AuditRow[]; now: Date }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">Aucun événement sur cette période.</p>
  }

  const days: { key: string; date: Date; rows: AuditRow[] }[] = []
  for (const row of rows) {
    const key = dayKey(row.createdAt)
    const last = days.at(-1)
    if (last?.key === key) last.rows.push(row)
    else days.push({ key, date: row.createdAt, rows: [row] })
  }

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <section key={day.key} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{formatDayLabel(day.date, now)}</h2>
          <ol className="flex flex-col divide-y rounded-2xl border bg-card shadow-xs">
            {day.rows.map((row) => {
              const { icon: Icon, tone } = iconOf(row.action)
              return (
                <li key={row.id} className="flex gap-3 p-4">
                  <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone)}>
                    <Icon className="size-5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold">{row.title}</p>
                      <time dateTime={row.createdAt.toISOString()} className="shrink-0 text-sm text-muted-foreground tabular-nums">
                        {formatTime(row.createdAt)}
                      </time>
                    </div>
                    {row.detail && <p className="text-sm tabular-nums">{row.detail}</p>}
                    {row.reason && (
                      <p className="rounded-lg bg-muted px-2.5 py-1.5 text-sm">
                        <span className="font-semibold">Motif : </span>{row.reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {row.authorName}{row.branchName && ` · ${row.branchName}`}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
