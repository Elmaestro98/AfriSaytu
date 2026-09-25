"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { Button } from "@/components/ui/button"
import { formatTime } from "@/lib/dates"

// "Données à 14:32" and a button to reload the figures without leaving the page.
export function RefreshButton({ loadedAt }: { loadedAt: Date }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm whitespace-nowrap text-muted-foreground">Données à {formatTime(loadedAt)}</span>
      <Button type="button" variant="outline" className="h-11" disabled={isPending} onClick={() => startTransition(() => router.refresh())}>
        <RefreshCw className={isPending ? "size-4 animate-spin" : "size-4"} aria-hidden /> Actualiser
      </Button>
    </div>
  )
}
