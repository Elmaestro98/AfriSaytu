import { CircleCheck, CloudOff } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ok: recorded; offline: kept on this phone, sent when the network is back; error: refused.
export type Feedback = { kind: "ok" | "offline" | "error"; text: string; warning?: string | null }

// The answer to the last entry, above the validate button.
export function EntryFeedback({ feedback, duplicate, isPending, onConfirmDuplicate, onDismiss }: {
  feedback: Feedback
  duplicate: boolean
  isPending: boolean
  onConfirmDuplicate: () => void
  onDismiss: () => void
}) {
  return (
    <div role={feedback.kind === "error" ? "alert" : "status"}
      className={cn("mb-3 rounded-xl p-3 text-sm font-semibold",
        feedback.kind === "ok" ? "bg-accent text-accent-foreground" : feedback.kind === "offline" ? "bg-brand-accent/15 text-foreground" : "bg-destructive/10 text-destructive")}>
      <p className="flex items-start gap-2">
        {feedback.kind === "ok" && <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}
        {feedback.kind === "offline" && <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />}
        {feedback.text}
      </p>
      {feedback.warning && <p className="mt-1 font-normal">{feedback.warning}</p>}
      {feedback.kind === "ok" && (
        <Link href="/operations" className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
          Voir ou annuler
        </Link>
      )}
      {duplicate && (
        <div className="mt-3 flex gap-2">
          <Button type="button" className="h-11 flex-1" disabled={isPending} onClick={onConfirmDuplicate}>Enregistrer quand même</Button>
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={onDismiss}>Annuler</Button>
        </div>
      )}
    </div>
  )
}

export function OfflineBanner() {
  return (
    <p role="status" className="mb-5 flex items-start gap-2 rounded-xl bg-brand-accent/15 p-3 text-sm font-medium">
      <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
      Hors ligne : vos opérations sont gardées sur ce téléphone et envoyées au retour du réseau. Les soldes affichés ne les comptent pas encore.
    </p>
  )
}
