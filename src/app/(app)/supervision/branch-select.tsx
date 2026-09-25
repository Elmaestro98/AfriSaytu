"use client"

import { ChevronDown, Store } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

type BranchSelectProps = {
  branches: readonly { id: string; name: string }[]
  value: string | null
}

// Chooses the branch in view; kept in the page address like the period.
export function BranchSelect({ branches, value }: BranchSelectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const change = (branch: string) => {
    const next = new URLSearchParams(params)
    if (branch) next.set("branch", branch)
    else next.delete("branch")
    const query = next.toString()
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }))
  }

  return (
    <label className="relative inline-flex">
      <span className="sr-only">Point de vente</span>
      <Store aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
      <select value={value ?? ""} onChange={(event) => change(event.target.value)} disabled={isPending}
        className="h-11 cursor-pointer appearance-none rounded-xl border bg-card pr-10 pl-10 text-sm font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60">
        <option value="">Tous les points de vente ({branches.length})</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>{branch.name}</option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
    </label>
  )
}
