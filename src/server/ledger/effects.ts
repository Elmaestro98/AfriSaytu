import { z } from "zod"

import type { TransactionType } from "@/generated/prisma/enums"

// Balance effects of a customer operation (cahier 6.1). The single place where this logic
// lives: the UI shows the result, it never recomputes it.
//
// Default matrix, overridable by the catalogue (OperatorCatalog.defaultEffects) and by each
// organization (OrgOperator.effectsConfig), type by type.

export type Sign = -1 | 0 | 1

export type TypeEffect = {
  uv: { amount: Sign; fee: Sign } // operator electronic balance
  cash: { amount: Sign; fee: Sign } // cash drawer; the fee part only applies if paid in cash
  feeInCashDefault: boolean // pre-ticks "fee paid in cash" on the entry form
  manual: boolean // OTHER: the agent chooses the direction of each balance
}

export type EffectMatrix = Record<TransactionType, TypeEffect>

export const DEFAULT_EFFECTS: EffectMatrix = {
  DEPOSIT: { uv: { amount: -1, fee: 0 }, cash: { amount: 1, fee: 1 }, feeInCashDefault: false, manual: false },
  WITHDRAWAL: { uv: { amount: 1, fee: 0 }, cash: { amount: -1, fee: 0 }, feeInCashDefault: false, manual: false },
  // The operator also takes the fee from the agent's UV (adjustable per operator).
  SEND: { uv: { amount: -1, fee: -1 }, cash: { amount: 1, fee: 1 }, feeInCashDefault: true, manual: false },
  AIRTIME: { uv: { amount: -1, fee: 0 }, cash: { amount: 1, fee: 0 }, feeInCashDefault: false, manual: false },
  BILL: { uv: { amount: -1, fee: 0 }, cash: { amount: 1, fee: 1 }, feeInCashDefault: true, manual: false },
  OTHER: { uv: { amount: 0, fee: 0 }, cash: { amount: 0, fee: 0 }, feeInCashDefault: false, manual: true },
}

const signSchema = z.union([z.literal(-1), z.literal(0), z.literal(1)])

const typeOverrideSchema = z
  .object({
    uv: z.object({ amount: signSchema, fee: signSchema }).partial(),
    cash: z.object({ amount: signSchema, fee: signSchema }).partial(),
    feeInCashDefault: z.boolean(),
  })
  .partial()

// `manual` is not overridable: only OTHER is manual.
const overrideSchema = z.partialRecord(
  z.enum(["DEPOSIT", "WITHDRAWAL", "SEND", "AIRTIME", "BILL"]),
  typeOverrideSchema,
)

export type EffectOverride = z.infer<typeof overrideSchema>

// Invalid stored JSON is ignored rather than trusted: the defaults stay in force.
export function parseEffectOverride(value: unknown): EffectOverride {
  const parsed = overrideSchema.safeParse(value ?? {})
  return parsed.success ? parsed.data : {}
}

export function resolveEffects(...layers: unknown[]): EffectMatrix {
  const matrix: EffectMatrix = structuredClone(DEFAULT_EFFECTS)
  for (const layer of layers) {
    const override = parseEffectOverride(layer)
    for (const [type, change] of Object.entries(override) as [TransactionType, z.infer<typeof typeOverrideSchema>][]) {
      const current = matrix[type]
      matrix[type] = {
        ...current,
        uv: { ...current.uv, ...change.uv },
        cash: { ...current.cash, ...change.cash },
        feeInCashDefault: change.feeInCashDefault ?? current.feeInCashDefault,
      }
    }
  }
  return matrix
}

// The one setting exposed in the UI today: is the SEND fee taken from the agent's UV?
export function sendFeeFromUv(matrix: EffectMatrix): boolean {
  return matrix.SEND.uv.fee === -1
}

export function withSendFeeFromUv(override: unknown, fromUv: boolean): EffectOverride {
  const current = parseEffectOverride(override)
  return { ...current, SEND: { ...current.SEND, uv: { ...current.SEND?.uv, fee: fromUv ? -1 : 0 } } }
}
