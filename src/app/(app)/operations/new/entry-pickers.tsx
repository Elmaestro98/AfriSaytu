"use client"

import { ArrowDownToLine, ArrowUpFromLine, Ellipsis, ReceiptText, Send, Smartphone, type LucideIcon } from "lucide-react"

import type { TransactionType } from "@/generated/prisma/enums"
import { OperatorBadge } from "@/components/business/operator-badge"
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
            <OperatorBadge name={operator.name} color={operator.color} logoSrc={operator.logoSrc} className="size-10 font-heading text-base" />
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
