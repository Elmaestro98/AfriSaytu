"use client"

import { ArrowDownToLine, ArrowUpFromLine, Ellipsis, ReceiptText, Send, Smartphone, type LucideIcon } from "lucide-react"

import type { TransactionType } from "@/generated/prisma/enums"
import { TRANSACTION_TYPES, TYPE_LABELS } from "@/lib/operation-types"
import { cn } from "@/lib/utils"
import type { EntryOperator } from "@/server/operations/entry-context"

const TYPE_ICONS: Record<TransactionType, LucideIcon> = {
  DEPOSIT: ArrowDownToLine,
  WITHDRAWAL: ArrowUpFromLine,
  SEND: Send,
  AIRTIME: Smartphone,
  BILL: ReceiptText,
  OTHER: Ellipsis,
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

type OperatorPickerProps = {
  operators: readonly EntryOperator[]
  value: string
  onChange: (operatorId: string) => void
}

export function OperatorPicker({ operators, value, onChange }: OperatorPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Opérateur">
      {operators.map((operator) => {
        const selected = operator.id === value
        const color = operator.color ?? "var(--primary)"
        return (
          <button
            key={operator.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(operator.id)}
            className={cn(
              "flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 bg-card p-2 text-sm font-semibold transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected ? "border-current" : "border-transparent bg-muted",
            )}
            style={selected ? { color } : undefined}
          >
            <span
              className="flex size-10 items-center justify-center rounded-full font-heading font-bold"
              style={{ color, backgroundColor: `color-mix(in srgb, ${color} 16%, white)` }}
            >
              {initials(operator.name)}
            </span>
            <span className="truncate text-foreground">{operator.name}</span>
          </button>
        )
      })}
    </div>
  )
}

type TypePickerProps = {
  value: TransactionType
  onChange: (type: TransactionType) => void
}

export function TypePicker({ value, onChange }: TypePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Type d'opération">
      {TRANSACTION_TYPES.map((type) => {
        const Icon = TYPE_ICONS[type]
        const selected = type === value
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type)}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-xl border text-base font-semibold transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected ? "border-primary bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {TYPE_LABELS[type]}
          </button>
        )
      })}
    </div>
  )
}
