"use client"

import { useState, type ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { formatPercentNumber, parsePercent } from "@/lib/percent"
import { cn } from "@/lib/utils"

type PercentInputProps = Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "inputMode"> & {
  value: number // basis points
  onValueChange: (basisPoints: number) => void // NaN when the text is not a valid percentage
}

// Percentage typed as "0,5" and handed over as basis points (50). The text stays as typed.
export function PercentInput({ value, onValueChange, className, ...props }: PercentInputProps) {
  const [text, setText] = useState(() => (Number.isFinite(value) && value > 0 ? formatPercentNumber(value) : ""))

  return (
    <div className="relative">
      <Input
        {...props}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          onValueChange(parsePercent(event.target.value) ?? 0)
        }}
        className={cn("h-14 pr-10 font-heading text-2xl font-bold tabular-nums md:text-2xl", className)}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
        %
      </span>
    </div>
  )
}
