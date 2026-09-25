import type { ReactNode } from "react"

import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"

export type ReceiptLine = {
  key: string
  label: string
  amount: number
  color?: string | null // operator colour dot, from the catalogue
}

type ReceiptCardProps = {
  title: string
  caption?: string
  lines: readonly ReceiptLine[]
  total: { label: string; amount: number }
  footer?: ReactNode
  className?: string
}

// A summary printed like a cash receipt, with a torn bottom edge.
export function ReceiptCard({ title, caption, lines, total, footer, className }: ReceiptCardProps) {
  return (
    <section className={cn("receipt-edge rounded-t-2xl bg-card px-5 pt-5 text-card-foreground shadow-lg", className)}>
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="font-heading text-lg font-bold">{title}</h3>
        {caption && <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{caption}</span>}
      </header>

      <ul className="mt-4 flex flex-col gap-2.5 border-t border-dashed pt-4">
        {lines.map((line) => (
          <li key={line.key} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full bg-muted-foreground"
                style={line.color ? { backgroundColor: line.color } : undefined}
              />
              <span className="truncate">{line.label}</span>
            </span>
            <span className="font-semibold whitespace-nowrap tabular-nums">{formatFCFA(line.amount)}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex items-baseline justify-between gap-3 border-t-2 border-dashed pt-4">
        <span className="font-semibold">{total.label}</span>
        <span className="font-heading text-2xl font-bold whitespace-nowrap text-primary tabular-nums">
          {formatFCFA(total.amount)}
        </span>
      </p>

      {footer && <div className="mt-3">{footer}</div>}
    </section>
  )
}
