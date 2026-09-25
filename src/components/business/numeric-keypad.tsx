"use client"

import { Delete } from "lucide-react"

import { cn } from "@/lib/utils"

const MAX_DIGITS = 10
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"] as const

type NumericKeypadProps = {
  value: number
  onValueChange: (value: number) => void
}

// On-screen keypad for amounts (mockup 03): big keys, one hand, no phone keyboard popping up.
// Works on whole numbers only.
export function NumericKeypad({ value, onValueChange }: NumericKeypadProps) {
  const press = (key: (typeof KEYS)[number]) => {
    const digits = value === 0 ? "" : String(value)
    if (key === "back") {
      onValueChange(digits.length <= 1 ? 0 : Number(digits.slice(0, -1)))
      return
    }
    const next = (digits + key).replace(/^0+/, "")
    if (next.length > MAX_DIGITS) return
    onValueChange(next === "" ? 0 : Number(next))
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          aria-label={key === "back" ? "Effacer le dernier chiffre" : key}
          className={cn(
            "flex h-14 items-center justify-center rounded-xl font-heading text-2xl font-bold tabular-nums transition-colors select-none",
            "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.97]",
            key === "back" ? "bg-secondary text-secondary-foreground" : "bg-muted hover:bg-secondary",
          )}
        >
          {key === "back" ? <Delete className="size-6" aria-hidden /> : key}
        </button>
      ))}
    </div>
  )
}
