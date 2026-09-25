import { formatDayLabel, formatTime, dayKey } from "@/lib/dates"
import type { AuditRow } from "@/server/audit/queries"

// Journal entries grouped by Dakar day, latest first.
export function AuditList({ rows, now }: { rows: readonly AuditRow[]; now: Date }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border bg-card p-6 text-center text-muted-foreground">Aucun événement sur cette période.</p>
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
          <h2 className="text-sm font-semibold text-muted-foreground">{formatDayLabel(day.date, now)}</h2>
          <ol className="flex flex-col divide-y rounded-2xl border bg-card">
            {day.rows.map((row) => (
              <li key={row.id} className="flex gap-3 p-4">
                <time dateTime={row.createdAt.toISOString()} className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums">
                  {formatTime(row.createdAt)}
                </time>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-semibold">{row.title}</p>
                  {row.detail && <p className="text-sm tabular-nums">{row.detail}</p>}
                  {row.reason && (
                    <p className="rounded-lg bg-muted px-2.5 py-1.5 text-sm">
                      <span className="font-semibold">Motif : </span>{row.reason}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {row.authorName}{row.branchName && ` · ${row.branchName}`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
