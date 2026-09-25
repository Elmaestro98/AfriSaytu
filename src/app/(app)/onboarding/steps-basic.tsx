"use client"

import { useFormContext } from "react-hook-form"

import { FieldError } from "@/components/business/field-error"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { OnboardingInput } from "@/schemas/onboarding"

export function CompanyStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingInput>()

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="organizationName" className="text-base">
        Nom de votre entreprise
      </Label>
      <Input
        id="organizationName"
        placeholder="Ex. : Groupe Diop & Frères"
        autoComplete="organization"
        className="h-12 text-base"
        {...register("organizationName")}
      />
      <FieldError message={errors.organizationName?.message} />
    </div>
  )
}

export function BranchStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingInput>()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="branchName" className="text-base">
          Nom du point de vente
        </Label>
        <Input
          id="branchName"
          placeholder="Ex. : Kiosque Médina"
          className="h-12 text-base"
          {...register("branchName")}
        />
        <FieldError message={errors.branchName?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="branchAddress" className="text-base">
          Adresse <span className="font-normal text-muted-foreground">(facultatif)</span>
        </Label>
        <Input
          id="branchAddress"
          placeholder="Ex. : Médina, Dakar"
          autoComplete="street-address"
          className="h-12 text-base"
          {...register("branchAddress")}
        />
        <FieldError message={errors.branchAddress?.message} />
      </div>
    </div>
  )
}
