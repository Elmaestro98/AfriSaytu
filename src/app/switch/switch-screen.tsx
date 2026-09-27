"use client"

import { ChevronLeft, Delete, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { BrandMark } from "@/components/business/brand-mark"
import { Button } from "@/components/ui/button"
import { formatTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { SwitchScreenData } from "@/server/devices/switch"

import { unlockAction } from "./actions"

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const

const initials = (name: string) => name.split(" ").slice(0, 2).map((word) => word[0]).join("").toUpperCase()

export function SwitchScreen({ deviceName, branchName, agents }: SwitchScreenData) {
  const router = useRouter()
  const [chosen, setChosen] = useState<{ id: string; name: string } | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [isPending, startTransition] = useTransition()

  const press = (key: (typeof KEYS)[number]) => {
    if (!chosen || isPending || key === "") return
    setError(null)
    if (key === "back") return setPin((current) => current.slice(0, -1))
    const next = (pin + key).slice(0, 4)
    setPin(next)
    if (next.length === 4) {
      startTransition(async () => {
        const result = await unlockAction({ memberId: chosen.id, pin: next })
        if (result.ok) {
          router.replace("/dashboard")
          router.refresh()
        } else {
          setPin("")
          setError(result.error)
        }
      })
    }
  }

  return (
    <main className="flex min-h-svh flex-col bg-primary text-primary-foreground">
      <header className="flex flex-col items-center gap-2 px-4 pt-10 pb-6 text-center">
        <BrandMark className="size-14" />
        <h1 className="font-heading text-3xl font-extrabold">{chosen ? chosen.name : "Qui travaille ?"}</h1>
        <p className="text-sm opacity-80">{chosen ? "Tapez votre code à 4 chiffres" : `${branchName} · ${deviceName}`}</p>
      </header>

      <section className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-4 rounded-t-3xl bg-background px-4 pt-6 pb-8 text-foreground">
        {!chosen ? (
          <>
            {agents.length === 0 ? (
              <p className="rounded-xl bg-muted p-4 text-sm">
                Aucun agent n&apos;a encore de code pour ce point de vente. Chaque agent crée le sien depuis son propre compte :
                Réglages → Mon code.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3">
                {agents.map((agent) => (
                  <li key={agent.id}>
                    <button type="button" disabled={agent.lockedUntil !== null} onClick={() => { setChosen(agent); setPin(""); setError(null) }}
                      className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-3 font-semibold shadow-xs transition-transform active:scale-95 disabled:opacity-50">
                      <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-accent font-heading text-lg font-bold text-accent-foreground">{initials(agent.name)}</span>
                      <span className="text-center leading-tight">{agent.name}</span>
                      {agent.lockedUntil && <span className="text-xs font-medium text-destructive">bloqué jusqu&apos;à {formatTime(agent.lockedUntil)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto flex flex-col gap-2 pt-6">
              {leaving ? (
                <div className="flex flex-col gap-2 rounded-xl bg-muted p-3">
                  <p className="text-sm">Ce téléphone ne sera plus partagé et sera déconnecté : il faudra le mot de passe du compte pour revenir.</p>
                  {/* A plain form post: handled in one go on the server, then the sign-out page. */}
                  <form method="post" action="/switch/leave" className="flex gap-2">
                    <Button type="submit" variant="destructive" className="h-11 flex-1">Quitter</Button>
                    <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setLeaving(false)}>Annuler</Button>
                  </form>
                </div>
              ) : (
                <Button type="button" variant="ghost" className="h-11 text-muted-foreground" onClick={() => setLeaving(true)}>
                  <LogOut className="size-4" aria-hidden /> Quitter le mode partagé
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-center gap-4 py-2" aria-label={`${pin.length} chiffres sur 4`}>
              {[0, 1, 2, 3].map((index) => (
                <span key={index} className={cn("size-4 rounded-full border-2 border-primary transition-colors", index < pin.length && "bg-primary")} />
              ))}
            </div>
            <p role="alert" className="min-h-10 text-center text-sm font-medium text-destructive">{error ?? (isPending ? "Vérification…" : "")}</p>
            <div className="grid grid-cols-3 gap-3">
              {KEYS.map((key, index) =>
                key === "" ? <span key={index} /> : (
                  <button key={index} type="button" disabled={isPending} onClick={() => press(key)} aria-label={key === "back" ? "Effacer" : key}
                    className="flex h-16 items-center justify-center rounded-2xl bg-muted font-heading text-2xl font-bold transition-transform active:scale-95 disabled:opacity-50">
                    {key === "back" ? <Delete className="size-6" aria-hidden /> : key}
                  </button>
                ),
              )}
            </div>
            <Button type="button" variant="ghost" className="mt-2 h-11" onClick={() => { setChosen(null); setPin(""); setError(null) }}>
              <ChevronLeft className="size-4" aria-hidden /> Ce n&apos;est pas moi
            </Button>
          </>
        )}
      </section>
    </main>
  )
}
