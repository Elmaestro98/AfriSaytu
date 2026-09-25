"use client"

import { UserPlus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query"
import type { InviteMemberInput } from "@/schemas/team"
import type { BranchOption } from "@/server/team/queries"

import { InviteForm } from "./invite-form"

// "Inviter un membre": the invitation form in a side panel (bottom sheet on a phone). It stays
// open after a success, to invite several people in a row.
export function InviteSheet({ branches, roles }: { branches: readonly BranchOption[]; roles: readonly InviteMemberInput["role"][] }) {
  const [open, setOpen] = useState(false)
  const desktop = useMediaQuery(DESKTOP_QUERY)

  return (
    <>
      <Button type="button" className="h-11 gap-2 px-4 font-bold" onClick={() => setOpen(true)}>
        <UserPlus className="size-5" aria-hidden />
        Inviter un membre
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={desktop ? "right" : "bottom"}
          className="max-h-[92svh] overflow-y-auto rounded-t-2xl lg:max-h-none lg:w-full lg:max-w-md lg:rounded-none">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl font-bold">Inviter un membre</SheetTitle>
            <SheetDescription>La personne reçoit un e-mail pour créer son accès, rattaché aux points de vente choisis.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{open && <InviteForm branches={branches} roles={roles} />}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}
