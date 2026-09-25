import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Coins,
  Ellipsis,
  Flag,
  ReceiptText,
  Scale,
  Send,
  Smartphone,
  Undo2,
  type LucideIcon,
} from "lucide-react"

import { dayKey, formatDayLabel, formatTime } from "@/lib/dates"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { LedgerLine } from "@/server/cash/ledger"

const TYPE_ICONS: Record<string, LucideIcon> = {
  DEPOSIT: ArrowDownToLine,
  WITHDRAWAL: ArrowUpFromLine,
  SEND: Send,
  AIRTIME: Smartphone,
  BILL: ReceiptText,
  OTHER: Ellipsis,
}

// What created the line, as an icon: cancellations stand out in red.
function iconOf(line: LedgerLine): { icon: LucideIcon; tone: string } {
  switch (line.reason) {
    case "OPENING":
      return { icon: Flag, tone: "bg-muted text-muted-foreground" }
    case "CANCELLATION":
      return { icon: Undo2, tone: "bg-destructive/10 text-destructive" }
    case "ADJUSTMENT":
      return { icon: Scale, tone: "bg-brand-accent/20 text-brand-accent-strong" }
    case "MOVEMENT":
      return line.movementKind === "COMMISSION_PAYOUT"
        ? { icon: Coins, tone: "bg-primary/10 text-primary" }
        : { icon: ArrowLeftRight, tone: "bg-accent text-accent-foreground" }
    case "TRANSACTION":
      return { icon: TYPE_ICONS[line.transactionType ?? "OTHER"] ?? Ellipsis, tone: "bg-accent text-accent-foreground" }
  }
}

function Amount({ delta }: { delta: number }) {
  return (
    <span className={cn("font-heading font-bold whitespace-nowrap tabular-nums", delta < 0 ? "text-destructive" : "text-primary")}>
      {delta > 0 ? "+" : ""}{formatFCFA(delta)}
    </span>
  )
}

function groupByDay(lines: readonly LedgerLine[]) {
  const days: { key: string; date: Date; lines: LedgerLine[] }[] = []
  for (const line of lines) {
    const key = dayKey(line.createdAt)
    const last = days.at(-1)
    if (last?.key === key) last.lines.push(line)
    else days.push({ key, date: line.createdAt, lines: [line] })
  }
  return days
}

// Lines newest first, grouped by Dakar day with the balance at the end of each day. Phone: cards;
// desktop: a table with money in and money out apart.
export function LedgerLines({ lines, now }: { lines: readonly LedgerLine[]; now: Date }) {
  const days = groupByDay(lines)
  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <section key={day.key} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{formatDayLabel(day.date, now)}</h2>
            <p className="text-sm text-muted-foreground tabular-nums">
              Solde en fin de journée <span className="font-semibold text-foreground">{formatFCFA(day.lines[0].runningBalance)}</span>
            </p>
          </div>

          <ol className="flex flex-col divide-y rounded-2xl border bg-card shadow-xs lg:hidden">
            {day.lines.map((line) => {
              const { icon: Icon, tone } = iconOf(line)
              return (
                <li key={line.id} className="flex items-start gap-3 p-4">
                  <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone)}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-semibold", line.reason === "CANCELLATION" && "text-destructive")}>{line.label}</p>
                    {line.note && <p className="text-sm">Motif : {line.note}</p>}
                    <p className="truncate text-xs text-muted-foreground">{[formatTime(line.createdAt), line.authorName].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="text-right">
                    <Amount delta={line.delta} />
                    <p className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">Solde {formatFCFA(line.runningBalance)}</p>
                  </div>
                </li>
              )
            })}
          </ol>

          <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-xs lg:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="w-20 px-4 py-2.5 font-semibold">Heure</th>
                  <th className="px-4 py-2.5 font-semibold">Libellé</th>
                  <th className="px-4 py-2.5 font-semibold">Auteur</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Entrée</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Sortie</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Solde</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {day.lines.map((line) => {
                  const { icon: Icon, tone } = iconOf(line)
                  return (
                    <tr key={line.id} className={cn(line.reason === "CANCELLATION" && "bg-destructive/[0.03]")}>
                      <td className="px-4 py-3 tabular-nums">{formatTime(line.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <span aria-hidden className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone)}>
                            <Icon className="size-4" />
                          </span>
                          <span>
                            <span className={cn("block font-semibold", line.reason === "CANCELLATION" && "text-destructive")}>{line.label}</span>
                            {line.note && <span className="block text-xs text-muted-foreground">Motif : {line.note}</span>}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{line.authorName ?? "—"}</td>
                      <td className="px-4 py-3 text-right">{line.delta > 0 ? <Amount delta={line.delta} /> : ""}</td>
                      <td className="px-4 py-3 text-right">{line.delta < 0 ? <Amount delta={line.delta} /> : ""}</td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">{formatFCFA(line.runningBalance)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
