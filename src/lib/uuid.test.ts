import { afterEach, describe, expect, it } from "vitest"

import { newUuid } from "@/lib/uuid"

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const original = Object.getOwnPropertyDescriptor(crypto, "randomUUID")

describe("newUuid", () => {
  afterEach(() => {
    if (original) Object.defineProperty(crypto, "randomUUID", original)
  })

  it("returns a valid UUID v4", () => {
    expect(newUuid()).toMatch(UUID_V4)
  })

  it("still works when randomUUID is missing (http page on a phone)", () => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true })
    const ids = new Set(Array.from({ length: 50 }, () => newUuid()))
    for (const id of ids) expect(id).toMatch(UUID_V4)
    expect(ids.size).toBe(50)
  })
})
