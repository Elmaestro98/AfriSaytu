import type { SubscriptionState } from "@/server/plans/lifecycle"

// Badge colors of the effective subscription status, in the admin console.
export const STATUS_TONE: Record<SubscriptionState["status"], string> = {
  TRIAL: "bg-accent text-accent-foreground",
  ACTIVE: "bg-primary text-primary-foreground",
  PAST_DUE: "bg-brand-accent text-brand-accent-foreground",
  READ_ONLY: "bg-destructive/10 text-destructive",
  SUSPENDED: "bg-destructive text-white",
}
