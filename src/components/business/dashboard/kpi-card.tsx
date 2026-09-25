import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type Tone = "default" | "primary" | "danger"

type KpiCardProps = {
  label: string
  value: string
  icon: LucideIcon
  tone?: Tone
  change?: { value: number | null; label: string } // +12 = +12 %, null = nothing to compare
  children?: ReactNode // one line of detail under the figure
}

export function Trend({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="text-xs text-muted-foreground">Pas de comparaison possible</span>
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold",
        value > 0 ? "bg-accent text-accent-foreground" : value < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
        <Icon className="size-3.5" aria-hidden />
        {value > 0 ? "+" : ""}{value} %
      </span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

// Key figure of a dashboard: label, icon, big value, trend or detail.
export function KpiCard({ label, value, icon: Icon, tone = "default", change, children }: KpiCardProps) {
  return (
    <div className={cn(
      "flex min-w-0 flex-col gap-3 rounded-2xl border p-4 lg:p-5",
      tone === "primary" ? "border-primary bg-primary text-primary-foreground" : "bg-card",
      tone === "danger" && "border-destructive/40 bg-destructive/5",
    )}>
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-xs font-semibold tracking-wide uppercase",
          tone === "primary" ? "text-primary-foreground/80" : tone === "danger" ? "text-destructive" : "text-muted-foreground")}>
          {label}
        </p>
        <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl",
          tone === "primary" ? "bg-primary-foreground/15" : tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground")}>
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className={cn("font-heading text-2xl font-extrabold whitespace-nowrap tabular-nums 2xl:text-3xl", tone === "danger" && "text-destructive")}>
        {value}
      </p>
      <div className={cn("min-h-5", tone === "primary" && "[&_.text-muted-foreground]:text-primary-foreground/75")}>
        {change ? <Trend value={change.value} label={change.label} /> : children}
      </div>
    </div>
  )
}
