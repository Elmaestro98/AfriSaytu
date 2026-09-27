"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { setOwnPinAction } from "./actions"

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 4)

// Two fields (code, then again), digits only, hidden as they are typed.
export function PinForm({ hasPin }: { hasPin: boolean }) {
  const [pin, setPin] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const save = () =>
    startTransition(async () => {
      setError(null)
      const result = await setOwnPinAction({ pin, confirm })
      if (!result.ok) return setError(result.error)
      setPin("")
      setConfirm("")
      setSaved(true)
      toast.success(hasPin ? "Code changé" : "Code créé", { description: "Utilisez-le sur le téléphone partagé de votre point de vente." })
    })

  const field = (id: string, label: string, value: string, onChange: (value: string) => void) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={value}
        onChange={(event) => onChange(digitsOnly(event.target.value))}
        className="h-14 w-40 text-center font-heading text-2xl tracking-[0.5em]" />
    </div>
  )

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">{hasPin ? "Changer mon code" : "Créer mon code"}</h2>
      {field("pin", "Code à 4 chiffres", pin, setPin)}
      {field("pin-confirm", "Le même code, encore une fois", confirm, setConfirm)}
      <p className="text-xs text-muted-foreground">Évitez 0000, 1234 et les dates de naissance.</p>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      <Button type="button" className="h-12 font-bold sm:self-start" disabled={isPending || pin.length !== 4 || confirm.length !== 4} onClick={save}>
        Enregistrer mon code
      </Button>
      {saved && (
        <Link href="/settings" className="flex h-12 items-center justify-center rounded-lg border font-semibold transition-transform active:scale-[0.98] sm:self-start sm:px-6">
          Terminé : retour aux réglages
        </Link>
      )}
    </section>
  )
}
