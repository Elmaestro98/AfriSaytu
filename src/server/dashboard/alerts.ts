import { formatFCFA } from "@/lib/money"

// Pure: the "À surveiller" list of a dashboard, most urgent first.

export type Alert = {
  key: string
  level: "danger" | "warning"
  title: string
  detail: string
  href: string
}

export type AlertInput = {
  lowBalances: readonly { label: string; branchName: string; missing: number }[]
  noRuleCount: number
  closingsWithDifference: readonly { branchName: string; difference: number }[]
  staleBranches: readonly { name: string; hoursOpen: number }[] // day open for too long
  showBranch: boolean
  canManageRules: boolean
}

export const STALE_HOURS = 24

export function buildAlerts(input: AlertInput): Alert[] {
  const alerts: Alert[] = []

  for (const closing of input.closingsWithDifference) {
    alerts.push({
      key: `closing-${closing.branchName}`,
      level: "danger",
      title: `Écart de clôture : ${closing.difference > 0 ? "+" : ""}${formatFCFA(closing.difference)}`,
      detail: closing.branchName,
      href: "/supervision",
    })
  }

  for (const balance of input.lowBalances) {
    alerts.push({
      key: `low-${balance.branchName}-${balance.label}`,
      level: "warning",
      title: `${balance.label} : solde bas`,
      detail: `Manque ${formatFCFA(balance.missing)}${input.showBranch ? ` · ${balance.branchName}` : ""}`,
      href: "/cash",
    })
  }

  for (const branch of input.staleBranches) {
    alerts.push({
      key: `stale-${branch.name}`,
      level: "warning",
      title: "Journée non clôturée",
      detail: `${branch.name} · ouverte depuis ${Math.floor(branch.hoursOpen)} h`,
      href: "/closing",
    })
  }

  if (input.noRuleCount > 0 && input.canManageRules) {
    alerts.push({
      key: "no-rule",
      level: "warning",
      title: `${input.noRuleCount} opération${input.noRuleCount > 1 ? "s" : ""} sans règle de commission`,
      detail: "Commission comptée à 0 : ajoutez la règle manquante",
      href: "/settings/commissions",
    })
  }

  return alerts
}
