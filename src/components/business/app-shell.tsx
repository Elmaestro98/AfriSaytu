import { unstable_rethrow } from "next/navigation"
import type { ReactNode } from "react"

import { BottomNav } from "@/components/business/bottom-nav"
import type { NavKey } from "@/components/business/nav-items"
import { OfflineSync } from "@/components/business/offline/offline-sync"
import { SharedDeviceBar } from "@/components/business/shared-device-bar"
import { SideNav } from "@/components/business/side-nav"
import { SubscriptionBanner, SuspendedScreen } from "@/components/business/subscription-banner"
import { roleLabel } from "@/lib/roles"
import { requireActor } from "@/server/auth/actor"
import { authorize, type Action } from "@/server/auth/permissions"
import { subscriptionBanner, type Banner } from "@/server/plans/banner"
import { getSubscriptionState } from "@/server/plans/current"
import type { Access } from "@/server/plans/lifecycle"

type Navigation = {
  items: NavKey[]
  organizationName: string
  memberName: string
  memberId: string
  roleLabel: string
  access: Access
  banner: Banner | null
  shared: boolean // a shared phone: an agent chosen with their code is at the controls
}

async function loadNavigation(): Promise<Navigation | null> {
  try {
    const ctx = await requireActor()
    const can = (action: Action) => authorize(ctx.actor, action).allowed
    const [organization, subscription] = await Promise.all([
      ctx.db.organization.findFirst({ select: { name: true } }),
      getSubscriptionState(ctx),
    ])
    // Read only: entering an operation would be refused, so its button is not offered.
    const canWrite = subscription.access === "FULL"
    return {
      items: [
        "home",
        ...(can("transaction:view") ? (["operations"] as const) : []),
        ...(can("transaction:create") ? (canWrite ? (["entry", "cash"] as const) : (["cash"] as const)) : []),
        ...(can("closing:validate") ? (["closing"] as const) : []),
        ...(can("transaction:view") ? (["stats"] as const) : []),
        ...(ctx.actor.role !== "AGENT" ? (["supervision"] as const) : []),
        "settings", // everyone: at least their notifications
      ],
      organizationName: organization?.name ?? "",
      memberName: ctx.memberName,
      memberId: ctx.actor.memberId,
      roleLabel: roleLabel(ctx.actor.role),
      access: subscription.access,
      banner: subscriptionBanner(subscription, ctx.actor.role === "OWNER"),
      shared: Boolean(ctx.sharedDevice),
    }
  } catch (error) {
    unstable_rethrow(error) // a shared phone with nobody at the controls goes to "Qui travaille ?"
    return null // not a member yet, or deactivated: the page itself explains it
  }
}

// Frame of the signed-in screens. Phone: the page and a bottom bar. Desktop: a side bar and the
// page next to it. The pages still check every right themselves.
export async function AppShell({ children }: { children: ReactNode }) {
  const navigation = await loadNavigation()
  if (!navigation) return <div className="flex flex-1 flex-col">{children}</div>
  if (navigation.access === "BLOCKED") return <div className="flex flex-1 flex-col"><SuspendedScreen /></div>

  return (
    <div className="flex flex-1 lg:min-h-svh">
      <SideNav
        items={navigation.items}
        organizationName={navigation.organizationName}
        memberName={navigation.memberName}
        roleLabel={navigation.roleLabel}
        shared={navigation.shared}
      />
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        {navigation.shared && <SharedDeviceBar agentName={navigation.memberName} />}
        {navigation.banner && <SubscriptionBanner banner={navigation.banner} />}
        <OfflineSync memberId={navigation.memberId} />
        {children}
      </div>
      <BottomNav items={navigation.items} />
    </div>
  )
}
