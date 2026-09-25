// Global operator catalogue (managed by the SaaS admin). Identity data only: name, code, colour.
// No fee or commission tariff lives here: every tariff comes from the organization's rules.

export type OperatorSeed = {
  code: string
  name: string
  color: string // hex, used as the operator theme colour in the UI
}

export const OPERATOR_CATALOG: readonly OperatorSeed[] = [
  { code: "WAVE", name: "Wave", color: "#1FA2E8" },
  { code: "ORANGE_MONEY", name: "Orange Money", color: "#FF7900" },
  { code: "MIXX", name: "Mixx by Yas", color: "#D6247C" },
]
