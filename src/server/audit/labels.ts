import { formatFCFA } from "@/lib/money"
import { TYPE_LABELS, type TransactionTypeKey } from "@/lib/operation-types"
import { ROLE_LABELS, roleLabel, type RoleKey } from "@/lib/roles"
import { AUDIT_ACTIONS, isAuditAction, type AuditActionKey } from "@/lib/audit-actions"

// Pure: turns an audit row into a French sentence for the journal screen (F-64).

type Json = Record<string, unknown>

function asObject(value: unknown): Json {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {}
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function signedFCFA(amount: number): string {
  return `${amount > 0 ? "+" : ""}${formatFCFA(amount)}`
}

// One line of detail drawn from the stored before/after values, or null when there is nothing
// useful to add. Unknown or malformed values are ignored, never shown raw.
function detailOf(action: AuditActionKey, before: Json, after: Json): string | null {
  switch (action) {
    case "transaction.cancel": {
      const amount = integer(before.amount)
      const type = text(before.type)
      const typeLabel = type && Object.hasOwn(TYPE_LABELS, type) ? TYPE_LABELS[type as TransactionTypeKey] : null
      if (amount === null) return typeLabel
      return typeLabel ? `${typeLabel} de ${formatFCFA(amount)}` : formatFCFA(amount)
    }
    case "closing.validate": {
      const difference = integer(after.totalDifference)
      if (difference === null) return null
      return difference === 0 ? "Aucun écart" : `Écart ${signedFCFA(difference)}`
    }
    case "data.export": {
      const format = text(after.format)
      const count = integer(after.count)
      if (!format || count === null) return null
      return `${count} opération${count > 1 ? "s" : ""} en ${format.toUpperCase()}`
    }
    case "member.invite": {
      const email = text(after.email)
      const role = text(after.role)
      const label = role && Object.hasOwn(ROLE_LABELS, role) ? roleLabel(role as RoleKey) : null
      return [email, label].filter(Boolean).join(" · ") || null
    }
    case "branch.create":
      return text(after.name)
    case "account.create": {
      const opening = integer(after.openingBalance)
      return opening === null ? null : `Solde d'ouverture ${formatFCFA(opening)}`
    }
    case "account.update": {
      const threshold = integer(after.alertThreshold)
      const previous = integer(before.alertThreshold)
      if (threshold === previous) return null
      return threshold === null ? "Seuil d'alerte retiré" : `Seuil d'alerte ${formatFCFA(threshold)}`
    }
    case "operator.effects":
      return after.sendFeeFromUv === true ? "Frais d'envoi prélevés sur l'UV" : after.sendFeeFromUv === false ? "Frais d'envoi non prélevés sur l'UV" : null
    default:
      return null
  }
}

export type AuditDescription = { title: string; detail: string | null }

export function describeAudit(entry: { action: string; before: unknown; after: unknown }): AuditDescription {
  if (!isAuditAction(entry.action)) return { title: entry.action, detail: null }
  return { title: AUDIT_ACTIONS[entry.action], detail: detailOf(entry.action, asObject(entry.before), asObject(entry.after)) }
}
