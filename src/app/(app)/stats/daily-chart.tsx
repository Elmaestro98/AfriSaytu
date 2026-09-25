"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { formatShortDay } from "@/lib/dates"
import { formatAmount, formatCompactAmount, formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { DayTotals } from "@/server/stats/compute"

type Metric = "commission" | "volume"

const METRIC_LABELS: Record<Metric, string> = { commission: "Commissions", volume: "Volume" }

type TooltipProps = { active?: boolean; payload?: readonly { payload: DayTotals }[] }

function DayTooltip({ active, payload }: TooltipProps) {
  const day = active ? payload?.[0]?.payload : undefined
  if (!day) return null
  return (
    <div className="rounded-xl border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-semibold capitalize">{formatShortDay(day.key)}</p>
      <p className="tabular-nums">Commission : <span className="font-bold">{formatFCFA(day.commission)}</span></p>
      <p className="tabular-nums">Volume : <span className="font-bold">{formatFCFA(day.volume)}</span></p>
      <p className="text-muted-foreground tabular-nums">{formatAmount(day.count)} opération{day.count > 1 ? "s" : ""}</p>
    </div>
  )
}

// Commission or volume per day, today highlighted. Tap a bar for the detail of the day.
export function DailyChart({ days }: { days: readonly DayTotals[] }) {
  const [metric, setMetric] = useState<Metric>("commission")
  const total = days.reduce((sum, day) => sum + day[metric], 0)

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold">Évolution par jour</h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {days.length} derniers jours · {formatFCFA(total)}
          </p>
        </div>
        <div role="group" aria-label="Indicateur du graphique" className="flex gap-1 rounded-xl border p-1">
          {(Object.keys(METRIC_LABELS) as Metric[]).map((value) => (
            <button key={value} type="button" aria-pressed={metric === value} onClick={() => setMetric(value)}
              className={cn("h-11 rounded-lg px-3 text-sm font-semibold",
                metric === value ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
              {METRIC_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 lg:h-72" role="img" aria-label={`${METRIC_LABELS[metric]} par jour, total ${formatFCFA(total)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...days]} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="key" tickFormatter={formatShortDay} tickLine={false} axisLine={false} minTickGap={12}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tickFormatter={formatCompactAmount} tickLine={false} axisLine={false} width={44} allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip content={<DayTooltip />} cursor={{ fill: "var(--accent)" }} />
            <Bar dataKey={metric} radius={[6, 6, 0, 0]} maxBarSize={40} isAnimationActive={false}>
              {days.map((day) => (
                <Cell key={day.key} fill={day.isToday ? "var(--brand-accent)" : "var(--primary)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
