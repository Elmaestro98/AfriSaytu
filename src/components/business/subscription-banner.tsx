import { CircleAlert, Clock, Lock } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Banner } from "@/server/plans/banner"

const ICONS = { info: Clock, warning: CircleAlert, danger: Lock } as const

// Status of the subscription, above every signed-in screen.
export function SubscriptionBanner({ banner }: { banner: Banner }) {
  const Icon = ICONS[banner.tone]
  return (
    <div role={banner.tone === "info" ? "status" : "alert"}
      className={cn("flex items-start gap-2 px-4 py-2.5 text-sm font-semibold lg:px-8",
        banner.tone === "info" && "bg-accent text-accent-foreground",
        banner.tone === "warning" && "bg-brand-accent text-brand-accent-foreground",
        banner.tone === "danger" && "bg-destructive text-white")}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{banner.text}</p>
    </div>
  )
}

// Full screen of a suspended account: nothing else is shown, nothing is deleted.
export function SuspendedScreen() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <Lock className="size-8" aria-hidden />
      </span>
      <h1 className="font-heading text-2xl font-bold">Compte suspendu</h1>
      <p className="max-w-sm text-muted-foreground">
        L&apos;accès à ce compte est suspendu. Vos données sont conservées. Contactez le support AfriSaytu pour le rétablir.
      </p>
    </main>
  )
}
