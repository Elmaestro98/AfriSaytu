import { dayKey } from "@/lib/dates"
import { getBaseClient } from "@/server/db/client"
import { withTenant } from "@/server/db/tenant"
import { recipients } from "@/server/notifications/kinds"
import { closingReminderMessage, subscriptionMessage } from "@/server/notifications/messages"
import { SUBSCRIPTION_REMINDER_DAYS } from "@/server/notifications/rules"
import { claimOnce, loadCandidates, pushConfigured, pushToMembers } from "@/server/notifications/send"
import { getSubscriptionState } from "@/server/plans/current"

// Daily notifications (Vercel Cron, 21:00 in Dakar = UTC): closing reminders and subscription
// deadlines. The only unscoped read is the list of organizations that have a device; everything
// else runs through the tenant client of each organization, one at a time.

type Db = ReturnType<typeof withTenant>

async function closingReminders(db: Db, organizationId: string, now: Date): Promise<number> {
  const branches = await db.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } })
  const candidates = await loadCandidates(db)
  let sent = 0
  for (const branch of branches) {
    // Operations not yet attached to a closing: the day (or more) is still open.
    const pending = await db.transaction.count({ where: { branchId: branch.id, status: "VALID", closingId: null } })
    if (pending === 0) continue
    const members = recipients(candidates, { kind: "CLOSING_REMINDER", branchId: branch.id })
    if (members.length === 0 || !(await claimOnce(db, organizationId, `closing-reminder:${branch.id}:${dayKey(now)}`))) continue
    sent += await pushToMembers(db, members, closingReminderMessage({ branchId: branch.id, branchName: branch.name, pending }))
  }
  return sent
}

async function subscriptionReminder(db: Db, organizationId: string, now: Date): Promise<number> {
  const state = await getSubscriptionState({ db }, now)
  if (state.status !== "TRIAL" && state.status !== "ACTIVE" && state.status !== "PAST_DUE") return 0
  if (state.daysLeft === null || !state.deadline || !SUBSCRIPTION_REMINDER_DAYS.includes(state.daysLeft)) return 0
  const members = recipients(await loadCandidates(db), { kind: "SUBSCRIPTION", branchId: null })
  if (members.length === 0 || !(await claimOnce(db, organizationId, `subscription:${state.status}:${dayKey(state.deadline)}:${state.daysLeft}`))) return 0
  return pushToMembers(db, members, subscriptionMessage({ daysLeft: state.daysLeft, stage: state.status }))
}

export async function runDailyNotifications(now = new Date()): Promise<{ organizations: number; sent: number }> {
  if (!pushConfigured()) return { organizations: 0, sent: 0 }
  const base = getBaseClient()
  const organizations = await base.pushSubscription.findMany({ distinct: ["organizationId"], select: { organizationId: true } })

  let sent = 0
  for (const { organizationId } of organizations) {
    const db = withTenant(base, organizationId)
    // One organization's failure never deprives the others of their notifications.
    try {
      sent += await closingReminders(db, organizationId, now)
      sent += await subscriptionReminder(db, organizationId, now)
    } catch (error) {
      console.error("Daily notifications failed for an organization", error)
    }
  }
  return { organizations: organizations.length, sent }
}
