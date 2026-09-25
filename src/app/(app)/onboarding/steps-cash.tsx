"use client"

import { Controller, useFormContext, useWatch } from "react-hook-form"

import { AmountInput } from "@/components/business/amount-input"
import { FieldError } from "@/components/business/field-error"
import { Label } from "@/components/ui/label"
import { formatFCFA } from "@/lib/money"
import type { OnboardingInput } from "@/schemas/onboarding"
import type { ActiveOperator } from "@/server/onboarding/queries"

function Recap({ catalog }: { catalog: readonly ActiveOperator[] }) {
  const { control } = useFormContext<OnboardingInput>()
  const values = useWatch({ control })

  const operators = values.operators ?? []
  const electronicTotal = operators.reduce((sum, operator) => sum + (operator?.openingBalance ?? 0), 0)
  const cash = values.cash?.openingBalance ?? 0

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-primary p-4 text-primary-foreground">
      <h3 className="text-lg font-bold">Récapitulatif</h3>
      <p>
        <span className="opacity-80">Entreprise : </span>
        <strong>{values.organizationName}</strong>
      </p>
      <p>
        <span className="opacity-80">Point de vente : </span>
        <strong>{values.branchName}</strong>
      </p>
      <ul className="flex flex-col gap-1">
        {operators.map((operator, index) => (
          <li key={operator?.operatorId ?? index} className="flex justify-between gap-2">
            <span>{catalog.find((item) => item.id === operator?.operatorId)?.name}</span>
            <strong>{formatFCFA(operator?.openingBalance ?? 0)}</strong>
          </li>
        ))}
        <li className="flex justify-between gap-2">
          <span>Caisse espèces</span>
          <strong>{formatFCFA(cash)}</strong>
        </li>
      </ul>
      <p className="flex justify-between gap-2 border-t border-primary-foreground/30 pt-3 text-lg">
        <span>Total</span>
        <strong>{formatFCFA(electronicTotal + cash)}</strong>
      </p>
    </section>
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
