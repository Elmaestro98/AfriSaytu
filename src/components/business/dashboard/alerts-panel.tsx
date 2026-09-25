import { ChevronRight, CircleCheck, TriangleAlert } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import type { Alert } from "@/server/dashboard/alerts"

// "À surveiller": what needs attention, most urgent first, each line leading to where to act.
export function AlertsPanel({ alerts }: { alerts: readonly Alert[] }) {
  return (
    <section aria-labelledby="alerts-title" className="flex flex-col gap-3 rounded-2xl border bg-card p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="alerts-title" className="font-heading text-lg font-bold">À surveiller</h2>
        {alerts.length > 0 && (
          <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive tabular-nums">{alerts.length}</span>
        )}
      </div>
      {alerts.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-accent px-3 py-3 text-sm font-semibold text-accent-foreground">
          <CircleCheck className="size-4 shrink-0" aria-hidden /> Tout est en ordre.
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {alerts.map((alert) => (
            <li key={alert.key}>
              <Link href={alert.href} className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted">
                <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg",
                  alert.level === "danger" ? "bg-destructive/10 text-destructive" : "bg-brand-accent/20 text-brand-accent-strong")}>
                  <TriangleAlert className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{alert.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{alert.detail}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
