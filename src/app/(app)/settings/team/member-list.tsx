"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { roleLabel } from "@/lib/roles"
import { cn } from "@/lib/utils"
import type { TeamMemberRow } from "@/server/team/queries"

import { changeRoleAction, deactivateMemberAction } from "./actions"

const ROLE_AVATAR: Record<TeamMemberRow["role"], string> = {
  OWNER: "bg-primary text-primary-foreground",
  MANAGER: "bg-brand-accent text-brand-accent-foreground",
  AGENT: "bg-accent text-accent-foreground",
}

function initials(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

// What is being confirmed on a member: their deactivation, or a switch to another role.
type Pending = { memberId: string; change: "deactivate" | TeamMemberRow["roleChoices"][number] }

export function MemberList({ members }: { members: readonly TeamMemberRow[] }) {
  const [confirming, setConfirming] = useState<Pending | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const confirm = ({ memberId, change }: Pending) => {
    setError(null)
    startTransition(async () => {
      const result =
        change === "deactivate" ? await deactivateMemberAction({ memberId }) : await changeRoleAction({ memberId, role: change })
      if (!result.ok) setError(result.error)
      setConfirming(null)
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-bold">Membres</h2>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {members.map((member) => (
          <li
            key={member.id}
            className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", !member.isActive && "opacity-60")}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full font-heading font-bold",
                  ROLE_AVATAR[member.role],
                )}
              >
                {initials(member.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold">
                  {member.name}
                  {member.isSelf && <span className="font-normal text-muted-foreground"> (vous)</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {roleLabel(member.role)}
                  {member.branchNames.length > 0 && ` · ${member.branchNames.join(", ")}`}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  member.isActive ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {member.isActive ? "Actif" : "Désactivé"}
              </span>
            </div>

            {confirming?.memberId === member.id ? (
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={confirming.change === "deactivate" ? "destructive" : "default"}
                  className="h-11 flex-1"
                  disabled={isPending}
                  onClick={() => confirm(confirming)}
                >
                  {isPending ? "Enregistrement…" : "Confirmer"}
                </Button>
                <Button type="button" variant="outline" className="h-11 flex-1" disabled={isPending} onClick={() => setConfirming(null)}>
                  Annuler
                </Button>
              </div>
            ) : (
              (member.roleChoices.length > 0 || member.canDeactivate) && (
                <div className="flex flex-wrap gap-3">
                  {member.roleChoices.map((role) => (
                    <Button key={role} type="button" variant="outline" className="h-11 flex-1"
                      onClick={() => setConfirming({ memberId: member.id, change: role })}>
                      {role === "MANAGER" ? "Nommer gérant" : "Repasser agent"}
                    </Button>
                  ))}
                  {member.canDeactivate && (
                    <Button type="button" variant="outline" className="h-11 flex-1"
                      onClick={() => setConfirming({ memberId: member.id, change: "deactivate" })}>
                      Désactiver
                    </Button>
                  )}
                </div>
              )
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
