"use client"

import type { ReactNode } from "react"
import { Controller, useFormContext, type FieldPath } from "react-hook-form"

import { AmountInput } from "@/components/business/amount-input"
import { FieldError } from "@/components/business/field-error"
import { PercentInput } from "@/components/business/percent-input"
import { Label } from "@/components/ui/label"
import type { RuleFieldsInput } from "@/schemas/commission-rule"

type AmountField = "minAmount" | "maxAmount" | "fixedFee" | "feeFixed"
type OptionalField = "minCommission" | "cap"
type PercentField = "percentage" | "feePercentage"

function useFieldError(name: FieldPath<RuleFieldsInput>): string | undefined {
  const { formState } = useFormContext<RuleFieldsInput>()
  return formState.errors[name as keyof RuleFieldsInput]?.message
}

function Amount({ name, label }: { name: AmountField; label: string }) {
  const { control } = useFormContext<RuleFieldsInput>()
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`rule-${name}`}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <AmountInput id={`rule-${name}`} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
        )}
      />
      <FieldError message={useFieldError(name)} />
    </div>
  )
}

// Empty = no minimum / no cap (stored as null).
function OptionalAmount({ name, label }: { name: OptionalField; label: string }) {
  const { control } = useFormContext<RuleFieldsInput>()
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`rule-${name}`}>
        {label} <span className="font-normal text-muted-foreground">(facultatif)</span>
      </Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <AmountInput
            id={`rule-${name}`}
            value={field.value ?? 0}
            onValueChange={(value) => field.onChange(value === 0 ? null : value)}
            onBlur={field.onBlur}
          />
        )}
      />
      <FieldError message={useFieldError(name)} />
    </div>
  )
}

function Percent({ name, label }: { name: PercentField; label: string }) {
  const { control } = useFormContext<RuleFieldsInput>()
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`rule-${name}`}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <PercentInput id={`rule-${name}`} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
        )}
      />
      <FieldError message={useFieldError(name)} />
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</legend>
      {children}
    </fieldset>
  )
}

export function RuleAmountFields() {
  return (
    <>
      <Group title="Tranche de montant">
        <div className="grid grid-cols-2 gap-3">
          <Amount name="minAmount" label="De" />
          <Amount name="maxAmount" label="À" />
        </div>
      </Group>

      <Group title="Commission de l'agent">
        <div className="grid grid-cols-2 gap-3">
          <Amount name="fixedFee" label="Montant fixe" />
          <Percent name="percentage" label="Pourcentage" />
          <OptionalAmount name="minCommission" label="Minimum" />
          <OptionalAmount name="cap" label="Plafond" />
        </div>
      </Group>

      <Group title="Frais payés par le client">
        <div className="grid grid-cols-2 gap-3">
          <Amount name="feeFixed" label="Montant fixe" />
          <Percent name="feePercentage" label="Pourcentage" />
        </div>
      </Group>
    </>
  )
}
