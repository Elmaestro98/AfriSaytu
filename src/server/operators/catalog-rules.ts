// Pure rules of the global operator catalogue, managed by the SaaS admin (F-10, F-11).

// A stable code from the name: "Free Money" -> "FREE_MONEY", accents removed, never a duplicate.
export function operatorCode(name: string, taken: ReadonlySet<string>): string {
  const base =
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30) || "OPERATEUR"
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}_${suffix}`)) suffix += 1
  return `${base}_${suffix}`
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

export type OperatorUsage = { organizations: number; accounts: number; transactions: number; rules: number }

// Removing an operator: a real delete only if no organization ever used it; otherwise it is
// switched off everywhere (hidden at entry, history kept: F-11).
export function removalOf(usage: OperatorUsage): "DELETE" | "DEACTIVATE" {
  return usage.organizations + usage.accounts + usage.transactions + usage.rules === 0 ? "DELETE" : "DEACTIVATE"
}
