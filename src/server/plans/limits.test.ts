import { describe, expect, it } from "vitest"

import { canAddBranch, canAddMember } from "@/server/plans/limits"

describe("branch limits", () => {
  it("allows one branch on Basic and Pro", () => {
    expect(canAddBranch("BASIC", 0)).toBe(true)
    expect(canAddBranch("BASIC", 1)).toBe(false)
    expect(canAddBranch("PRO", 0)).toBe(true)
    expect(canAddBranch("PRO", 1)).toBe(false)
  })

  it("allows up to five branches on Business", () => {
    expect(canAddBranch("BUSINESS", 4)).toBe(true)
    expect(canAddBranch("BUSINESS", 5)).toBe(false)
  })
})

describe("member limits", () => {
  it("allows a single user on Basic", () => {
    expect(canAddMember("BASIC", 1)).toBe(false)
  })

  it("allows up to five users on Pro", () => {
    expect(canAddMember("PRO", 4)).toBe(true)
    expect(canAddMember("PRO", 5)).toBe(false)
  })

  it("has no user limit on Business", () => {
    expect(canAddMember("BUSINESS", 10_000)).toBe(true)
  })
})
