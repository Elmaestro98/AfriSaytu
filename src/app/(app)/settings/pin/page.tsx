import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { PAGE_NARROW } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { hasOwnPin } from "@/server/devices/queries"

import { PinForm } from "./pin-form"

// Réglages -> Mon code de changement rapide (agents): the code typed on the branch's shared phone.
export default async function PinPage() {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  if (ctx.actor.role !== "AGENT") redirect("/settings")
  const hasPin = await hasOwnPin(ctx)

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Mon code" subtitle="Changement rapide d'agent" backHref="/settings" />
      <main className={cn(PAGE_NARROW, "gap-5")}>
        <section className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
          <h2 className="font-heading text-lg font-bold">À quoi sert ce code ?</h2>
          <p className="text-sm text-muted-foreground">
            Sur le téléphone partagé de votre point de vente, touchez votre nom puis tapez ce code : vos opérations sont enregistrées à
            votre nom, sans vous reconnecter. Gardez-le pour vous : quelqu&apos;un qui le connaît peut saisir en votre nom.
          </p>
          <p className={cn("mt-1 text-sm font-semibold", hasPin ? "text-primary" : "text-brand-accent-strong")}>
            {hasPin ? "✓ Votre code est créé. Vous pouvez le changer ci-dessous." : "Vous n'avez pas encore de code."}
          </p>
        </section>
        <PinForm hasPin={hasPin} />
      </main>
    </div>
  )
}
