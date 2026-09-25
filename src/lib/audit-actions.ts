// Sensitive actions written to the audit journal, and their French names (F-64).
export const AUDIT_ACTIONS = {
  "transaction.cancel": "Annulation d'opération",
  "closing.validate": "Validation de clôture",
  "closing.reopen": "Réouverture de clôture",
  "commissionRule.create": "Création de règle de commission",
  "commissionRule.update": "Modification de règle de commission",
  "commissionRule.close": "Fin de règle de commission",
  "data.export": "Export de données",
  "member.invite": "Invitation d'un membre",
  "member.deactivate": "Désactivation d'un membre",
  "branch.create": "Création de point de vente",
  "account.create": "Ajout de compte",
  "account.update": "Modification de compte",
  "operator.activate": "Activation d'opérateur",
  "operator.deactivate": "Désactivation d'opérateur",
  "operator.effects": "Réglage d'opérateur",
} as const

export type AuditActionKey = keyof typeof AUDIT_ACTIONS

export function isAuditAction(value: string): value is AuditActionKey {
  return Object.hasOwn(AUDIT_ACTIONS, value)
}
