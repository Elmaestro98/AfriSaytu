"use client"

import type { ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatAmount, parseAmount } from "@/lib/money"

type AmountInputProps = Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "inputMode"> & {
  value: number
  onValueChange: (value: number) => void
}

const MAX_DIGITS = 10

// Numeric keypad field for a FCFA amount, with thousands separators as you type.
// The value is always a whole number: never a float.
export function AmountInput({ value, onValueChange, className, ...props }: AmountInputProps) {
  return (
    <div className="relative">
      <Input
        {...props}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        value={value === 0 ? "" : formatAmount(value)}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, MAX_DIGITS)
          onValueChange(parseAmount(digits) ?? 0)
        }}
        className={cn("h-14 pr-16 font-heading text-2xl font-bold md:text-2xl tabular-nums", className)}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-medium text-muted-foreground">
        FCFA
      </span>
    </div>
  )
}
