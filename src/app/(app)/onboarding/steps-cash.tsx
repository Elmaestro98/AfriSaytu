"use client"

import { Controller, useFormContext, useWatch } from "react-hook-form"

import { AmountInput } from "@/components/business/amount-input"
import { FieldError } from "@/components/business/field-error"
import { ReceiptCard, type ReceiptLine } from "@/components/business/receipt-card"
import { Label } from "@/components/ui/label"
import type { OnboardingInput } from "@/schemas/onboarding"
import type { ActiveOperator } from "@/server/onboarding/queries"

function Recap({ catalog }: { catalog: readonly ActiveOperator[] }) {
  const { control } = useFormContext<OnboardingInput>()
  const values = useWatch({ control })

  const lines: ReceiptLine[] = [
    ...(values.operators ?? []).map((operator, index) => {
      const item = catalog.find((entry) => entry.id === operator?.operatorId)
      return {
        key: operator?.operatorId ?? String(index),
        label: item?.name ?? "Opérateur",
        amount: operator?.openingBalance ?? 0,
        color: item?.color,
      }
    }),
    { key: "cash", label: "Caisse espèces", amount: values.cash?.openingBalance ?? 0 },
  ]

  return (
    <ReceiptCard
      title={values.branchName || "Récapitulatif"}
      caption="Ouverture"
      lines={lines}
      total={{ label: "Total de départ", amount: lines.reduce((sum, line) => sum + line.amount, 0) }}
      footer={
        values.organizationName ? (
          <p className="text-sm text-muted-foreground">{values.organizationName}</p>
        ) : undefined
      }
    />
  )
}

export function CashStep({ catalog }: { catalog: readonly ActiveOperator[] }) {
  const {
    control,
    formState: { errors },
  } = useFormContext<OnboardingInput>()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="cash-opening" className="text-base">
          Fond de caisse (espèces dans le tiroir)
        </Label>
        <Controller
          control={control}
          name="cash.openingBalance"
          render={({ field }) => (
            <AmountInput
              id="cash-opening"
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <FieldError message={errors.cash?.openingBalance?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cash-threshold">Alerte si les espèces passent sous</Label>
        <Controller
          control={control}
          name="cash.alertThreshold"
          render={({ field }) => (
            <AmountInput
              id="cash-threshold"
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <FieldError message={errors.cash?.alertThreshold?.message} />
      </div>

      <Recap catalog={catalog} />
    </div>
  )
}
