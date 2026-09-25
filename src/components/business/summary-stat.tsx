import { cn } from "@/lib/utils"

// One figure of a settings summary band: small uppercase label, big bold value.
export function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={cn("truncate font-heading text-xl font-extrabold tabular-nums", tone === "warning" && "text-brand-accent-strong")}>{value}</p>
    </div>
  )
}
