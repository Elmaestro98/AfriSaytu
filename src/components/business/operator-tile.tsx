"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

type OperatorTileProps = {
  name: string
  color: string | null // operator theme colour, comes from the catalogue
  selected: boolean
  onToggle: () => void
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter((word) => word.toLowerCase() !== "by")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

// Large tappable tile (well above 44 px) for choosing an operator.
export function OperatorTile({ name, color, selected, onToggle }: OperatorTileProps) {
  const accent = color ?? "var(--primary)"

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
      <span
        className="flex size-12 items-center justify-center rounded-full text-lg font-bold"
        style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 16%, white)` }}
      >
        {initials(name)}
      </span>
      {name}
      {selected && (
        <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-4" aria-hidden />
        </span>
      )}
    </button>
  )
}
