"use client"

import { useFormStatus } from "react-dom"

import { cn } from "@/lib/utils"

// Disabled while the form is being saved: a double click must never record a payment twice.
export function SubmitButton({ danger }: { danger?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} aria-busy={pending}
      className={cn("h-11 rounded-xl font-semibold disabled:opacity-60",
        danger ? "bg-destructive text-white" : "bg-primary text-primary-foreground")}>
      {pending ? "Enregistrement…" : "Valider"}
    </button>
  )
}
