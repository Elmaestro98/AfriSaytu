import { describe, expect, it } from "vitest"

import { DEFAULT_EFFECTS, resolveEffects, sendFeeFromUv, withSendFeeFromUv } from "@/server/ledger/effects"

describe("resolveEffects", () => {
  it("returns the default matrix without overrides", () => {
    expect(resolveEffects()).toEqual(DEFAULT_EFFECTS)
    expect(resolveEffects(null, undefined)).toEqual(DEFAULT_EFFECTS)
  })

  it("applies the layers in order, type by type", () => {
    const catalog = { SEND: { uv: { fee: 0 } } }
    const organization = { SEND: { uv: { fee: -1 } }, DEPOSIT: { feeInCashDefault: true } }

    expect(resolveEffects(catalog).SEND.uv).toEqual({ amount: -1, fee: 0 })
    const both = resolveEffects(catalog, organization)
    expect(both.SEND.uv).toEqual({ amount: -1, fee: -1 })
    expect(both.DEPOSIT.feeInCashDefault).toBe(true)
    expect(both.WITHDRAWAL).toEqual(DEFAULT_EFFECTS.WITHDRAWAL)
  })

  it("ignores invalid stored configuration", () => {
    expect(resolveEffects({ SEND: { uv: { fee: 5 } } })).toEqual(DEFAULT_EFFECTS)
    expect(resolveEffects("garbage")).toEqual(DEFAULT_EFFECTS)
  })

  it("never makes OTHER automatic nor another type manual", () => {
    expect(resolveEffects({ OTHER: { uv: { amount: 1 } } })).toEqual(DEFAULT_EFFECTS)
    expect(resolveEffects({ DEPOSIT: { manual: true } }).DEPOSIT.manual).toBe(false)
  })

  it("does not mutate the defaults", () => {
    resolveEffects({ SEND: { uv: { fee: 0 } } })
    expect(DEFAULT_EFFECTS.SEND.uv.fee).toBe(-1)
  })
})

describe("SEND fee setting", () => {
  it("is taken from the UV by default", () => {
    expect(sendFeeFromUv(resolveEffects())).toBe(true)
  })

  it("can be switched off and back on for an operator, keeping other settings", () => {
    const off = withSendFeeFromUv({ DEPOSIT: { feeInCashDefault: true } }, false)
    expect(sendFeeFromUv(resolveEffects(off))).toBe(false)
    expect(resolveEffects(off).DEPOSIT.feeInCashDefault).toBe(true)
    expect(sendFeeFromUv(resolveEffects(withSendFeeFromUv(off, true)))).toBe(true)
  })
})
