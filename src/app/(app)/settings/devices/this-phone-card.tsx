"use client"

import { ChevronDown, Smartphone } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { declareThisDeviceAction } from "./actions"

// Whether THIS phone is shared, and the form that makes it so.
export function ThisPhoneCard({ thisPhone, branches }: { thisPhone: { name: string; branchName: string } | null; branches: readonly { id: string; name: string }[] }) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const declare = () =>
    startTransition(async () => {
      setError(null)
      const result = await declareThisDeviceAction({ branchId, name: name || undefined })
      if (!result.ok) return setError(result.error)
      setName("")
      toast.success("Ce téléphone est maintenant partagé", { description: branches.find((branch) => branch.id === branchId)?.name })
    })

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Smartphone className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-lg font-bold">Ce téléphone</h2>
          <p className="text-sm text-muted-foreground">
            {thisPhone ? `Téléphone partagé de ${thisPhone.branchName} (« ${thisPhone.name} »).` : "Ce téléphone n'est pas partagé : il reste à votre nom."}
          </p>
        </div>
      </div>

      {branches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun point de vente à gérer.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {branches.length > 1 && (
            <label className="relative flex flex-col gap-1.5 text-sm font-medium">
              {thisPhone ? "Le déplacer vers" : "Point de vente"}
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)}
                className="h-11 w-full appearance-none rounded-xl border bg-background pr-9 pl-3 text-sm font-semibold">
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
              <ChevronDown aria-hidden className="pointer-events-none absolute right-3 bottom-3.5 size-4" />
            </label>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="device-name">Nom du téléphone (facultatif)</Label>
            <Input id="device-name" value={name} maxLength={40} placeholder="ex. Téléphone du comptoir" onChange={(event) => setName(event.target.value)} className="h-11" />
          </div>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="button" className="h-12 font-bold" disabled={isPending || !branchId} onClick={declare}>
            {thisPhone ? "Déclarer de nouveau ce téléphone" : "Faire de ce téléphone un téléphone partagé"}
          </Button>
        </div>
      )}
    </section>
  )
}
