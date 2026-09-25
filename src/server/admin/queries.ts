import type { PrismaClient } from "@/generated/prisma/client"
import type { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/enums"
import { subscriptionState, type SubscriptionState } from "@/server/plans/lifecycle"
import { PLAN_MONTHLY_PRICE } from "@/server/plans/limits"

// Read side of the SaaS admin console (F-63): aggregates only, never the detail of a client's
// operations. Called with the client from getAdminDb(), after the admin check.

const DAY_MS = 24 * 60 * 60 * 1000

export type AdminOrganizationRow = {
  id: string
  name: string
  createdAt: Date
  plan: SubscriptionPlan | null
  state: SubscriptionState
  branches: number
  members: number
  operations30d: number
  lastActivity: Date | null
}

export type AdminOverview = {
  rows: AdminOrganizationRow[]
  byStatus: Record<SubscriptionStatus, number>
  monthlyRevenue: number // indicative: monthly price of every client in a paid period
}

type CountRow = { organizationId: string; _count: { _all: number } }

function countsBy(rows: readonly CountRow[]): Map<string, number> {
  return new Map(rows.map((row) => [row.organizationId, row._count._all]))
}

export async function loadAdminOverview(db: PrismaClient, now = new Date()): Promise<AdminOverview> {
  const [organizations, subscriptions, branches, members, recent, last] = await Promise.all([
    db.organization.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, createdAt: true } }),
    // Latest row per organization = the subscription in force.
    db.subscription.findMany({
      orderBy: { createdAt: "desc" },
      distinct: ["organizationId"],
      select: { organizationId: true, plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
    }),
    db.branch.groupBy({ by: ["organizationId"], where: { isActive: true }, _count: { _all: true } }),
    db.member.groupBy({ by: ["organizationId"], where: { isActive: true }, _count: { _all: true } }),
    db.transaction.groupBy({
      by: ["organizationId"],
      where: { status: "VALID", createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } },
      _count: { _all: true },
    }),
    db.transaction.groupBy({ by: ["organizationId"], _max: { createdAt: true } }),
  ])

  const subscriptionOf = new Map(subscriptions.map((row) => [row.organizationId, row]))
  const branchCount = countsBy(branches)
  const memberCount = countsBy(members)
  const recentCount = countsBy(recent)
  const lastActivity = new Map(last.map((row) => [row.organizationId, row._max.createdAt]))

  const rows = organizations.map((organization) => {
    const subscription = subscriptionOf.get(organization.id) ?? null
    return {
      ...organization,
      plan: subscription?.plan ?? null,
      state: subscriptionState(subscription, now),
      branches: branchCount.get(organization.id) ?? 0,
      members: memberCount.get(organization.id) ?? 0,
      operations30d: recentCount.get(organization.id) ?? 0,
      lastActivity: lastActivity.get(organization.id) ?? null,
    }
  })

  const byStatus: Record<SubscriptionStatus, number> = { TRIAL: 0, ACTIVE: 0, PAST_DUE: 0, READ_ONLY: 0, SUSPENDED: 0 }
  for (const row of rows) byStatus[row.state.status] += 1

  return {
    rows,
    byStatus,
    monthlyRevenue: rows.reduce((sum, row) => sum + (row.state.status === "ACTIVE" && row.plan ? PLAN_MONTHLY_PRICE[row.plan] : 0), 0),
  }
}

export type AdminOrganizationDetail = AdminOrganizationRow & {
  phone: string | null
  email: string | null
  owner: { name: string; phone: string | null } | null
  subscriptions: { id: string; createdAt: Date; plan: SubscriptionPlan; status: SubscriptionStatus; trialEndsAt: Date | null; currentPeriodEnd: Date | null }[]
  payments: { id: string; createdAt: Date; amount: number; provider: string; providerRef: string | null; status: string }[]
}

export async function loadAdminOrganization(db: PrismaClient, organizationId: string, now = new Date()): Promise<AdminOrganizationDetail | null> {
  const overview = await loadAdminOverview(db, now)
  const row = overview.rows.find((candidate) => candidate.id === organizationId)
  if (!row) return null

  const [organization, owner, subscriptions, payments] = await Promise.all([
    db.organization.findUnique({ where: { id: organizationId }, select: { phone: true, email: true } }),
    db.member.findFirst({ where: { organizationId, role: "OWNER" }, orderBy: { createdAt: "asc" }, select: { name: true, phone: true } }),
    db.subscription.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, createdAt: true, plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
    }),
    db.payment.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, createdAt: true, amount: true, provider: true, providerRef: true, status: true },
    }),
  ])

  return { ...row, phone: organization?.phone ?? null, email: organization?.email ?? null, owner, subscriptions, payments }
}
