import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"

import { describe, expect, it } from "vitest"

import { isSaasAdmin, parseAdminIds } from "@/server/admin/identity"

const SRC = join(process.cwd(), "src")

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === "generated" ? [] : sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

const toPosix = (path: string) => relative(SRC, path).split(sep).join("/")

describe("unscoped database access", () => {
  // Files allowed to reach the database without the organization filter.
  const ALLOWED = new Set(["server/db/client.ts", "server/db/index.ts", "server/onboarding/queries.ts", "app/(app)/onboarding/actions.ts", "server/admin/db.ts"])

  it("is limited to the db module, onboarding and the admin console", () => {
    const users = sourceFiles(SRC).filter((path) => readFileSync(path, "utf8").includes("getBaseClient")).map(toPosix)
    expect(users.filter((path) => !ALLOWED.has(path))).toEqual([])
  })

  it("is only handed to the admin console through the admin check", () => {
    const users = sourceFiles(SRC).filter((path) => readFileSync(path, "utf8").includes("getAdminDb")).map(toPosix)
    expect(users.every((path) => path.startsWith("server/admin/") || path.startsWith("app/(admin)/"))).toBe(true)
  })
})

describe("SaaS admin identity", () => {
  it("reads a comma separated list of Clerk user ids, ignoring anything else", () => {
    expect([...parseAdminIds(" user_abc123 , user_XYZ9,,not-an-id, user_")]).toEqual(["user_abc123", "user_XYZ9"])
  })

  it("refuses everyone when the variable is missing or empty", () => {
    expect(isSaasAdmin("user_abc123", undefined)).toBe(false)
    expect(isSaasAdmin("user_abc123", "")).toBe(false)
  })

  it("recognizes a listed user only", () => {
    expect(isSaasAdmin("user_abc123", "user_abc123,user_def")).toBe(true)
    expect(isSaasAdmin("user_other", "user_abc123")).toBe(false)
    expect(isSaasAdmin(null, "user_abc123")).toBe(false)
  })
})
