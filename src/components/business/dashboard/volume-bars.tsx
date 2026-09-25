import { formatShortDay } from "@/lib/dates"
import { formatAmount, formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { DayVolume } from "@/server/supervision/compute"

// Rounds the top of the scale to a readable value (1, 2 or 5 × 10^n).
function niceMax(value: number): number {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 5, 10].find((factor) => factor * power >= value) ?? 10
  return step * power
}

function compact(amount: number): string {
  if (amount >= 1_000_000) return `${formatAmount(Math.round(amount / 100_000) / 10).replace(".", ",")} M`
  if (amount >= 1_000) return `${formatAmount(Math.round(amount / 1_000))} k`
  return formatAmount(amount)
}

type VolumeBarsProps = {
  title: string
  subtitle: string
  days: readonly DayVolume[]
}

// Daily volume with a scale and guide lines, drawn in CSS (no chart library, light on 3G).
export function VolumeBars({ title, subtitle, days }: VolumeBarsProps) {
  const total = days.reduce((sum, day) => sum + day.volume, 0)
  const max = niceMax(Math.max(...days.map((day) => day.volume)))
  const guides = [1, 0.5, 0]

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-heading font-bold whitespace-nowrap tabular-nums">{formatFCFA(total)}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex h-44 flex-col justify-between pb-6 text-right text-[11px] text-muted-foreground tabular-nums" aria-hidden>
          {guides.map((ratio) => <span key={ratio}>{compact(max * ratio)}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden>
            {guides.map((ratio) => <span key={ratio} className="border-t border-dashed" />)}
          </div>
          <ol className="relative flex h-44 items-end gap-2" aria-label="Volume par jour">
            {days.map((day) => (
              <li key={day.key} className="flex h-full flex-1 flex-col items-center justify-end">
                <div className="relative w-full flex-1">
                  <span title={`${formatShortDay(day.key)} : ${formatFCFA(day.volume)}`}
                    aria-label={`${formatShortDay(day.key)} : ${formatFCFA(day.volume)}`}
                    className={cn("absolute bottom-0 left-1/2 w-full max-w-10 -translate-x-1/2 rounded-t-md transition-colors",
                      day.isToday ? "bg-brand-accent" : "bg-primary/75 hover:bg-primary")}
                    style={{ height: `${day.volume > 0 ? Math.max((day.volume / max) * 100, 2) : 0}%` }} />
                </div>
                <span className={cn("mt-2 h-4 text-[11px] whitespace-nowrap", day.isToday ? "font-bold" : "text-muted-foreground")}>
                  {formatShortDay(day.key)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
