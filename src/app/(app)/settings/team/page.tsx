import Link from "next/link"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { SummaryStat } from "@/components/business/summary-stat"
import { PAGE } from "@/lib/layout"
import { formatAmount } from "@/lib/money"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { authorize, canAssignRole } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { getCurrentPlan } from "@/server/plans/current"
import { PLAN_LABELS, PLAN_LIMITS, canAddMember } from "@/server/plans/limits"
import { listAssignableBranches, listTeam } from "@/server/team/queries"

import { InviteSheet } from "./invite-sheet"
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

  const [members, branches, plan] = await Promise.all([listTeam(ctx), listAssignableBranches(ctx), getCurrentPlan(ctx)])
  const roles = (["MANAGER", "AGENT"] as const).filter((role) => canAssignRole(ctx.actor.role, role))
  const active = members.filter((member) => member.isActive)
  const managers = active.filter((member) => member.role === "MANAGER").length
  const agents = active.filter((member) => member.role === "AGENT").length
  // Plan usage counts every active member of the organization; a manager only sees their teams.
  const maxMembers = PLAN_LIMITS[plan].maxMembers
  const isOwner = ctx.actor.role === "OWNER"
  const full = isOwner && !canAddMember(plan, active.length)

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Équipe" subtitle="Membres, rôles et accès" backHref="/settings" />
      <main className={cn(PAGE, "gap-6")}>
        <section aria-label="Synthèse" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
          <div className="grid grid-cols-3 gap-4 lg:gap-10">
            <SummaryStat label="Membres actifs" value={isOwner && maxMembers !== null ? `${formatAmount(active.length)} / ${formatAmount(maxMembers)}` : formatAmount(active.length)}
              tone={isOwner && maxMembers !== null && active.length > maxMembers ? "warning" : undefined} />
            <SummaryStat label="Gérants" value={formatAmount(managers)} />
            <SummaryStat label="Agents" value={formatAmount(agents)} />
          </div>
          {full ? (
            <p className="text-sm text-muted-foreground lg:max-w-xs lg:text-right">
              La formule {PLAN_LABELS[plan]} est complète.{" "}
              <Link href="/settings/subscription" className="font-semibold text-primary underline-offset-4 hover:underline">Voir les formules</Link>
            </p>
          ) : (
            roles.length > 0 && <InviteSheet branches={branches} roles={roles} />
          )}
        </section>
        <MemberList members={members} />
      </main>
    </div>
  )
}
