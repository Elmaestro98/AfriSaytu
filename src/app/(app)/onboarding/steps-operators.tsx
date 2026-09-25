"use client"

import { Controller, useFieldArray, useFormContext } from "react-hook-form"

import { AmountInput } from "@/components/business/amount-input"
import { FieldError } from "@/components/business/field-error"
import { OperatorTile } from "@/components/business/operator-tile"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { OnboardingInput } from "@/schemas/onboarding"
import type { ActiveOperator } from "@/server/onboarding/queries"

export function OperatorsStep({ catalog }: { catalog: readonly ActiveOperator[] }) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<OnboardingInput>()
  const { fields, append, remove } = useFieldArray({ control, name: "operators" })

  const toggle = (operator: ActiveOperator) => {
    const index = fields.findIndex((field) => field.operatorId === operator.id)
    if (index >= 0) {
      remove(index)
    } else {
      append({ operatorId: operator.id, accountNumber: "", openingBalance: 0, alertThreshold: 0 })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        {catalog.map((operator) => (
          <OperatorTile
            key={operator.id}
            name={operator.name}
            color={operator.color}
            logoSrc={operator.logoSrc}
            selected={fields.some((field) => field.operatorId === operator.id)}
            onToggle={() => toggle(operator)}
          />
        ))}
      </div>
      <FieldError message={errors.operators?.message ?? errors.operators?.root?.message} />

      {fields.map((field, index) => {
        const operator = catalog.find((item) => item.id === field.operatorId)
        return (
          <fieldset
            key={field.id}
            className="flex flex-col gap-4 rounded-xl border border-l-4 bg-card p-4"
            style={operator?.color ? { borderLeftColor: operator.color } : undefined}
          >
            <legend className="sr-only">{operator?.name ?? "Opérateur"}</legend>
            <p aria-hidden className="font-heading text-xl font-bold">
              {operator?.name ?? "Opérateur"}
            </p>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`account-${index}`}>
                Numéro du compte <span className="font-normal text-muted-foreground">(facultatif)</span>
              </Label>
              <Input
                id={`account-${index}`}
                inputMode="tel"
                placeholder="77 123 45 67"
                className="h-12 text-base"
                {...register(`operators.${index}.accountNumber`)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`opening-${index}`}>Solde actuel (unités électroniques)</Label>
              <Controller
                control={control}
                name={`operators.${index}.openingBalance`}
                render={({ field: balance }) => (
                  <AmountInput
                    id={`opening-${index}`}
                    value={balance.value}
                    onValueChange={balance.onChange}
                    onBlur={balance.onBlur}
                  />
                )}
              />
              <FieldError message={errors.operators?.[index]?.openingBalance?.message} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`threshold-${index}`}>Alerte si le solde passe sous</Label>
              <Controller
                control={control}
                name={`operators.${index}.alertThreshold`}
                render={({ field: threshold }) => (
                  <AmountInput
                    id={`threshold-${index}`}
                    value={threshold.value}
                    onValueChange={threshold.onChange}
                    onBlur={threshold.onBlur}
                  />
                )}
              />
              <FieldError message={errors.operators?.[index]?.alertThreshold?.message} />
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}
