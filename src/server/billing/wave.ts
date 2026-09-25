// Payment of the subscription through the SaaS owner's Wave merchant link (not an API: AfriSaytu
// never moves money itself). The link comes from NEXT_PUBLIC_WAVE_PAYMENT_URL.

const WAVE_ORIGIN = "https://pay.wave.com"

// The link with the amount pre-filled, or null when the configured link is missing or is not a
// Wave link: a typo must never send clients to another site.
export function waveCheckoutUrl(base: string | undefined, amount: number): string | null {
  if (!base || !Number.isSafeInteger(amount) || amount <= 0) return null
  let url: URL
  try {
    url = new URL(base.trim())
  } catch {
    return null
  }
  if (url.origin !== WAVE_ORIGIN || url.username || url.password) return null
  url.searchParams.set("amount", String(amount))
  return url.toString()
}
