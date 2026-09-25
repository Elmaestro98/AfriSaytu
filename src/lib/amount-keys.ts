// Typing an amount key by key (on-screen keypad or computer keyboard). Whole numbers only.
export const MAX_AMOUNT_DIGITS = 10

export type AmountKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "00" | "back" | "clear"

export function applyAmountKey(value: number, key: AmountKey): number {
  if (key === "clear") return 0
  const digits = value === 0 ? "" : String(value)
  if (key === "back") return digits.length <= 1 ? 0 : Number(digits.slice(0, -1))

  const next = (digits + key).replace(/^0+/, "")
  if (next.length > MAX_AMOUNT_DIGITS) return value
  return next === "" ? 0 : Number(next)
}
