"use client"

import { Clock, Pencil } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { minutesToTime } from "@/lib/dates"

import { updateBranchHoursAction } from "./actions"

// "Ferme à 21:00" with an inline editor. The closing time tells the liquidity forecast whether a
// balance lasts until the end of the day.
export function BranchHours({ branchId, closesAt }: { branchId: string; closesAt: number }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(minutesToTime(closesAt))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const save = () =>
    startTransition(async () => {
      setError(null)
      const result = await updateBranchHoursAction({ branchId, closesAt: value })
      if (result.ok) {
        setEditing(false)
        toast.success(`Fermeture à ${value}`, { description: "La prévision des soldes en tient compte." })
      }
      else setError(result.error)
    })

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <p className="flex items-center gap-2 text-sm">
          <Clock className="size-4 text-muted-foreground" aria-hidden /> Ferme à <span className="font-semibold tabular-nums">{minutesToTime(closesAt)}</span>
        </p>
        <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Modifier l'heure de fermeture" onClick={() => setEditing(true)}>
          <Pencil className="size-4" aria-hidden />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 border-b px-4 py-3">
      <Label htmlFor={`closes-${branchId}`}>Heure de fermeture</Label>
      <p className="text-xs text-muted-foreground">Sert à prévoir si les soldes tiendront jusqu&apos;à la fin de la journée.</p>
      <div className="flex gap-2">
        <Input id={`closes-${branchId}`} type="time" step={900} value={value} onChange={(event) => setValue(event.target.value)} className="h-11 w-32 text-base" />
        <Button type="button" className="h-11" disabled={isPending} onClick={save}>Enregistrer</Button>
        <Button type="button" variant="ghost" className="h-11" disabled={isPending} onClick={() => { setValue(minutesToTime(closesAt)); setError(null); setEditing(false) }}>
          Annuler
        </Button>
      </div>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  )
}
