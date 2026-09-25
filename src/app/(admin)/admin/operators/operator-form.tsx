"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { OperatorBadge } from "@/components/business/operator-badge"
import { resizeImage } from "@/lib/resize-image"
import { cn } from "@/lib/utils"

import { saveOperatorAction } from "./actions"

const INPUT = "h-11 w-full rounded-xl border bg-background px-3 text-sm"

type OperatorFormProps = {
  operator?: { id: string; name: string; color: string | null; logoSrc: string | null } // absent: creation
}

// Create or edit a catalogue operator. The logo is resized in the browser (256 px) before upload;
// the server checks it again from its bytes.
export function OperatorForm({ operator }: OperatorFormProps) {
  const router = useRouter()
  const [name, setName] = useState(operator?.name ?? "")
  const [color, setColor] = useState(operator?.color ?? "#0B5D4B")
  const [logo, setLogo] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(operator?.logoSrc ?? null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const pickLogo = async (file: File | undefined) => {
    setMessage(null)
    if (!file) return
    try {
      const resized = await resizeImage(file)
      setLogo(resized)
      setPreview(URL.createObjectURL(resized))
    } catch {
      setLogo(null)
      setMessage({ ok: false, text: "Image illisible : choisissez un fichier PNG, JPG ou WebP." })
    }
  }

  const submit = () => {
    setMessage(null)
    const form = new FormData()
    if (operator) form.set("operatorId", operator.id)
    form.set("name", name)
    form.set("color", color)
    if (logo) form.set("logo", logo, "logo")
    startTransition(async () => {
      const result = await saveOperatorAction(form)
      if (!result.ok) return setMessage({ ok: false, text: result.error })
      setMessage({ ok: true, text: operator ? "Opérateur modifié." : "Opérateur créé : les entreprises peuvent l'activer." })
      if (!operator) {
        setName("")
        setLogo(null)
        setPreview(null)
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <OperatorBadge name={name || "?"} color={color} logoSrc={preview} className="size-14" />
        <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
          Logo {operator ? "(laisser vide pour garder l'actuel)" : "(obligatoire)"}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => pickLogo(event.target.files?.[0])}
            className="text-sm file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:font-semibold" />
        </label>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Nom
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} className={INPUT} placeholder="Ex. Free Money" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Couleur
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-11 w-16 rounded-xl border bg-background p-1" />
        </label>
      </div>
      <button type="button" onClick={submit} disabled={isPending || name.trim().length < 2 || (!operator && !logo)}
        className="h-11 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50">
        {isPending ? "Enregistrement…" : operator ? "Enregistrer" : "Créer l'opérateur"}
      </button>
      {message && (
        <p role={message.ok ? "status" : "alert"}
          className={cn("rounded-lg p-3 text-sm font-medium", message.ok ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive")}>
          {message.text}
        </p>
      )}
    </div>
  )
}
