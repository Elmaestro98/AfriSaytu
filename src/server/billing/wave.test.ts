import { describe, expect, it } from "vitest"

import { waveCheckoutUrl } from "@/server/billing/wave"

const LINK = "https://pay.wave.com/m/M_sn_exr2gw75QE_L/c/sn/"

describe("waveCheckoutUrl", () => {
  it("pre-fills the amount on the merchant link", () => {
    expect(waveCheckoutUrl(LINK, 5_000)).toBe(`${LINK}?amount=5000`)
  })

  it("replaces an amount already in the link", () => {
    expect(waveCheckoutUrl(`${LINK}?amount=1`, 15_000)).toBe(`${LINK}?amount=15000`)
  })

  it("refuses a missing, malformed or non-Wave link", () => {
    expect(waveCheckoutUrl(undefined, 5_000)).toBeNull()
    expect(waveCheckoutUrl("pay.wave.com/m/x", 5_000)).toBeNull()
    expect(waveCheckoutUrl("https://pay.wave.com.evil.sn/m/x", 5_000)).toBeNull()
    expect(waveCheckoutUrl("http://pay.wave.com/m/x", 5_000)).toBeNull()
  })

  it("refuses a wrong amount", () => {
    expect(waveCheckoutUrl(LINK, 0)).toBeNull()
    expect(waveCheckoutUrl(LINK, 12.5)).toBeNull()
  })
})
