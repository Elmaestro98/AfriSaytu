// Senegalese phone numbers: 9 digits. Customer numbers are personal data (law 2008-12):
// they are optional and masked when displayed to agents.

// Accepts "77 123 45 67", "77.123.45.67", "+221 77 123 45 67", "00221771234567".
// Returns the 9 national digits, or null when the number is not valid.
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[\s.\-()]/g, "")

  if (digits.startsWith("+221")) digits = digits.slice(4)
  else if (digits.startsWith("00221")) digits = digits.slice(5)

  return /^\d{9}$/.test(digits) ? digits : null
}

// "771234567" -> "77 123 45 67"
export function formatPhone(digits: string): string {
  if (!/^\d{9}$/.test(digits)) {
    throw new RangeError("A phone number must be 9 digits")
  }
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`
}

// "771234567" -> "77 *** ** 67"
export function maskPhone(digits: string): string {
  if (!/^\d{9}$/.test(digits)) {
    throw new RangeError("A phone number must be 9 digits")
  }
  return `${digits.slice(0, 2)} *** ** ${digits.slice(7)}`
}
