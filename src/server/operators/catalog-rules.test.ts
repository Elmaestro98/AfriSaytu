import { describe, expect, it } from "vitest"

import { isHexColor, operatorCode, removalOf } from "@/server/operators/catalog-rules"
import { checkLogo, detectImageType, MAX_LOGO_BYTES } from "@/server/operators/logo-image"

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])
const WEBP = new Uint8Array([...Buffer.from("RIFF"), 1, 2, 3, 4, ...Buffer.from("WEBP"), 0])
const SVG = new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))

describe("logo checks", () => {
  it("recognizes PNG, JPEG and WebP from their bytes", () => {
    expect(detectImageType(PNG)).toBe("image/png")
    expect(detectImageType(JPEG)).toBe("image/jpeg")
    expect(detectImageType(WEBP)).toBe("image/webp")
  })

  it("refuses SVG and anything that is not an image, whatever the file name", () => {
    expect(checkLogo(SVG).ok).toBe(false)
    expect(checkLogo(new Uint8Array(Buffer.from("GIF89a"))).ok).toBe(false)
  })

  it("refuses an empty or too heavy file", () => {
    expect(checkLogo(new Uint8Array()).ok).toBe(false)
    const heavy = new Uint8Array(MAX_LOGO_BYTES + 1)
    heavy.set(PNG)
    expect(checkLogo(heavy)).toEqual({ ok: false, error: "Logo trop lourd (100 Ko au maximum)." })
  })

  it("accepts a valid image", () => {
    expect(checkLogo(PNG)).toEqual({ ok: true, mimeType: "image/png" })
  })
})

describe("operatorCode", () => {
  it("builds a code from the name, without accents", () => {
    expect(operatorCode("Free Money", new Set())).toBe("FREE_MONEY")
    expect(operatorCode("  Kash é-Paiement ", new Set())).toBe("KASH_E_PAIEMENT")
  })

  it("never duplicates an existing code", () => {
    expect(operatorCode("Wave", new Set(["WAVE"]))).toBe("WAVE_2")
    expect(operatorCode("Wave", new Set(["WAVE", "WAVE_2"]))).toBe("WAVE_3")
  })

  it("falls back when the name has no letter or digit", () => {
    expect(operatorCode("***", new Set())).toBe("OPERATEUR")
  })
})

describe("isHexColor", () => {
  it("accepts #RRGGBB only", () => {
    expect(isHexColor("#0B5D4B")).toBe(true)
    expect(["0B5D4B", "#fff", "red", "#0B5D4BZ"].some(isHexColor)).toBe(false)
  })
})

describe("removalOf", () => {
  it("deletes an operator nobody ever used", () => {
    expect(removalOf({ organizations: 0, accounts: 0, transactions: 0, rules: 0 })).toBe("DELETE")
  })

  it("only switches off an operator with any use, to keep the history", () => {
    expect(removalOf({ organizations: 1, accounts: 0, transactions: 0, rules: 0 })).toBe("DEACTIVATE")
    expect(removalOf({ organizations: 0, accounts: 0, transactions: 3, rules: 0 })).toBe("DEACTIVATE")
  })
})
