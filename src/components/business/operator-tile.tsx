"use client"

import { Check } from "lucide-react"

import { OperatorBadge } from "@/components/business/operator-badge"
import { cn } from "@/lib/utils"

type OperatorTileProps = {
  name: string
  color: string | null // operator theme colour, comes from the catalogue
  logoSrc: string | null
  selected: boolean
  onToggle: () => void
}

// Large tappable tile (well above 44 px) for choosing an operator.
export function OperatorTile({ name, color, logoSrc, selected, onToggle }: OperatorTileProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 bg-card p-3 text-base font-semibold transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        selected ? "border-primary bg-accent" : "border-border",
      )}
    >
      <OperatorBadge name={name} color={color} logoSrc={logoSrc} />
      {name}
      {selected && (
        <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-4" aria-hidden />
        </span>
      )}
    </button>
  )
}
