"use client"

import { MapPin } from "lucide-react"
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

const CONFIRM_TEXT = (member: TeamMemberRow, change: Pending["change"]) =>
  change === "deactivate"
    ? `${member.name} n'aura plus accès à l'application. Ses opérations restent dans l'historique.`
    : change === "MANAGER"
      ? `${member.name} deviendra gérant de ses points de vente : clôtures, équipe, réglages.`
      : `${member.name} redeviendra agent et ne verra plus que ses propres opérations.`

function MemberCard({ member, confirming, isPending, onAsk, onConfirm }: {
  member: TeamMemberRow
  confirming: Pending | null
  isPending: boolean
  onAsk: (pending: Pending | null) => void
  onConfirm: (pending: Pending) => void
}) {
  const actions = member.roleChoices.length > 0 || member.canDeactivate
  return (
    <li className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs", !member.isActive && "opacity-70")}>
      <div className="flex items-center gap-3">
        <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-full font-heading font-bold", ROLE_AVATAR[member.role])}>
          {initials(member.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {member.name}
            {member.isSelf && <span className="font-normal text-muted-foreground"> (vous)</span>}
          </p>
          <p className="text-sm text-muted-foreground">{roleLabel(member.role)}</p>
        </div>
        {!member.isActive && <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Désactivé</span>}
      </div>

      {member.branchNames.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Points de vente">
          {member.branchNames.map((name) => (
            <li key={name} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
              <MapPin className="size-3" aria-hidden />
              {name}
            </li>
          ))}
        </ul>
      )}

      {confirming?.memberId === member.id ? (
        <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
          <p className="text-sm">{CONFIRM_TEXT(member, confirming.change)}</p>
          <div className="flex gap-3">
            <Button type="button" variant={confirming.change === "deactivate" ? "destructive" : "default"} className="h-11 flex-1"
              disabled={isPending} onClick={() => onConfirm(confirming)}>
              {isPending ? "Enregistrement…" : "Confirmer"}
            </Button>
            <Button type="button" variant="outline" className="h-11 flex-1 bg-card" disabled={isPending} onClick={() => onAsk(null)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        actions && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {member.roleChoices.map((role) => (
              <Button key={role} type="button" variant="outline" className="h-11 flex-1"
                onClick={() => onAsk({ memberId: member.id, change: role })}>
                {role === "MANAGER" ? "Nommer gérant" : "Repasser agent"}
              </Button>
            ))}
            {member.canDeactivate && (
              <Button type="button" variant="ghost" className="h-11 flex-1 text-muted-foreground hover:text-destructive"
                onClick={() => onAsk({ memberId: member.id, change: "deactivate" })}>
                Désactiver
              </Button>
            )}
          </div>
        )
      )}
    </li>
  )
}

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

  const groups = [
    { title: "Actifs", rows: members.filter((member) => member.isActive) },
    { title: "Désactivés", rows: members.filter((member) => !member.isActive) },
  ].filter((group) => group.rows.length > 0)

  return (
    <div className="flex flex-col gap-6">
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}
      {groups.map((group) => (
        <section key={group.title} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{group.title} ({group.rows.length})</h2>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.rows.map((member) => (
              <MemberCard key={member.id} member={member} confirming={confirming} isPending={isPending} onAsk={setConfirming} onConfirm={confirm} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
