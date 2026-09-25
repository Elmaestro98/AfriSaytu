import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { PAGE } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { authorize, canAssignRole } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { listAssignableBranches, listTeam } from "@/server/team/queries"

import { InviteForm } from "./invite-form"
import { MemberList } from "./member-list"

export default async function TeamPage() {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }

  // The role is checked on the server: an agent typing this address is sent back.
  if (!authorize(ctx.actor, "member:manage").allowed) redirect("/dashboard")

  const [members, branches] = await Promise.all([listTeam(ctx), listAssignableBranches(ctx)])
  const roles = (["MANAGER", "AGENT"] as const).filter((role) => canAssignRole(ctx.actor.role, role))
  const activeCount = members.filter((member) => member.isActive).length

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title="Équipe"
        subtitle={`${activeCount} membre${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""}`}
        backHref="/settings"
      />
      <main className={cn(PAGE, "gap-8", "lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start")}>
        <InviteForm branches={branches} roles={roles} />
        <MemberList members={members} />
      </main>
    </div>
  )
}
