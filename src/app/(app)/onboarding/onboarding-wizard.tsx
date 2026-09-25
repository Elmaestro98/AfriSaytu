"use client"

import { useOrganizationList } from "@clerk/nextjs"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { FormProvider, useForm, type FieldPath } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { onboardingSchema, type OnboardingInput } from "@/schemas/onboarding"
import type { ActiveOperator } from "@/server/onboarding/queries"

import { completeOnboarding } from "./actions"
import { OnboardingHeader, type StepInfo } from "./onboarding-header"
import { CashStep } from "./steps-cash"
import { BranchStep, CompanyStep } from "./steps-basic"
import { OperatorsStep } from "./steps-operators"

const STEPS: StepInfo[] = [
  {
    short: "Entreprise",
    title: "Votre entreprise",
    help: "Le nom qui apparaîtra sur vos rapports et pour votre équipe.",
  },
  {
    short: "Kiosque",
    title: "Votre point de vente",
    help: "La boutique ou le kiosque où vous faites vos opérations. Vous pourrez en ajouter d'autres.",
  },
  {
    short: "Opérateurs",
    title: "Vos opérateurs",
    help: "Choisissez ceux que vous utilisez et indiquez le solde affiché dans chaque application.",
  },
  {
    short: "Caisse",
    title: "Votre caisse",
    help: "Comptez les espèces du tiroir, vérifiez le récapitulatif, puis terminez.",
  },
]

// Fields checked before moving on from each step.
const STEP_FIELDS: FieldPath<OnboardingInput>[][] = [
  ["organizationName"],
  ["branchName", "branchAddress"],
  ["operators"],
  ["cash"],
]

const LAST_STEP = STEPS.length - 1

export function OnboardingWizard({ operators }: { operators: readonly ActiveOperator[] }) {
  const router = useRouter()
  const { setActive } = useOrganizationList()
  const [step, setStep] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    mode: "onTouched",
    defaultValues: {
      organizationName: "",
      branchName: "",
      branchAddress: "",
      operators: [],
      cash: { openingBalance: 0, alertThreshold: 0 },
    },
  })

  const goTo = (next: number) => {
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  const goNext = async () => {
    const valid = await form.trigger(STEP_FIELDS[step])
    if (valid) goTo(Math.min(step + 1, LAST_STEP))
  }

  const submit = (values: OnboardingInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await completeOnboarding(values)
      if (!result.ok) {
        setServerError(result.error)
        return
      }
      // Make the new organization the active one in the Clerk session, then enter the app.
      await setActive?.({ organization: result.clerkOrgId })
      router.replace("/dashboard")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingHeader steps={STEPS} current={step} />

      <FormProvider {...form}>
        <form
          noValidate
          className="flex flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            // Enter must never submit early: only the last step sends the form.
            if (step < LAST_STEP) void goNext()
            else void form.handleSubmit(submit)(event)
          }}
        >
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
            {step === 0 && <CompanyStep />}
            {step === 1 && <BranchStep />}
            {step === 2 && <OperatorsStep catalog={operators} />}
            {step === 3 && <CashStep catalog={operators} />}

            {serverError && (
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {serverError}
              </p>
            )}
          </div>

          {/* Actions stay at the bottom of the screen, within thumb reach. */}
          <div className="sticky bottom-0 border-t bg-card/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-md gap-3 p-4">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 flex-1 text-base"
                  disabled={isPending}
                  onClick={() => goTo(step - 1)}
                >
                  Retour
                </Button>
              )}
              <Button type="submit" className="h-12 flex-[2] text-base font-bold" disabled={isPending}>
                {step < LAST_STEP ? "Continuer" : isPending ? "Création en cours…" : "Terminer la configuration"}
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
