"use client"

import { useFormContext, useWatch } from "react-hook-form"

import type { RoundingMode } from "@/generated/prisma/enums"
import { formatFCFA } from "@/lib/money"
import { ruleFieldsSchema, type RuleFieldsInput } from "@/schemas/commission-rule"
// Same pure functions as the server: the preview shows exactly what will be computed.
import { computeCommission, computeFee } from "@/server/commissions/compute"

export function RulePreview({ roundingMode }: { roundingMode: RoundingMode }) {
  const { control } = useFormContext<RuleFieldsInput>()
  const values = useWatch({ control })
  const parsed = ruleFieldsSchema.safeParse(values)
  if (!parsed.success) return null

  const rule = parsed.data
  const examples = [...new Set([rule.minAmount, rule.maxAmount])].filter((amount) => amount > 0)

  return (
    <section className="rounded-xl bg-accent p-4 text-accent-foreground" aria-live="polite">
      <p className="text-sm font-semibold">Aperçu du calcul</p>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {examples.map((amount) => (
          <li key={amount}>
            Pour <strong className="tabular-nums">{formatFCFA(amount)}</strong> : commission{" "}
            <strong className="tabular-nums">{formatFCFA(computeCommission(amount, rule, roundingMode))}</strong>, frais
            client <strong className="tabular-nums">{formatFCFA(computeFee(amount, rule, roundingMode))}</strong>
          </li>
        ))}
      </ul>
    </section>
  )
}
