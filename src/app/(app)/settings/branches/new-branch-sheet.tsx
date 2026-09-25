"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query"
import type { ActiveOperator } from "@/server/onboarding/queries"

import { NewBranchForm } from "./new-branch-form"

// "Nouveau point de vente": the creation form in a side panel (bottom sheet on a phone), so the
// list of branches stays in place behind it.
export function NewBranchSheet({ operators }: { operators: readonly ActiveOperator[] }) {
  const [open, setOpen] = useState(false)
  const desktop = useMediaQuery(DESKTOP_QUERY)

  return (
    <>
      <Button type="button" className="h-11 gap-2 px-4 font-bold" onClick={() => setOpen(true)}>
        <Plus className="size-5" aria-hidden />
        Nouveau point de vente
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={desktop ? "right" : "bottom"}
          className="max-h-[92svh] overflow-y-auto rounded-t-2xl lg:max-h-none lg:w-full lg:max-w-lg lg:rounded-none">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl font-bold">Nouveau point de vente</SheetTitle>
            <SheetDescription>Son nom, ses opérateurs et sa caisse, avec les soldes de départ.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {open && <NewBranchForm operators={operators} onDone={() => setOpen(false)} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
