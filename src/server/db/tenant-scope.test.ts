import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  ImmutableRecordError,
  TENANT_MODELS,
  TenantIsolationError,
  scopeArgs,
} from "@/server/db/tenant-scope"

const ORG_A = "org_a"
const ORG_B = "org_b"

describe("schema guard", () => {
  it("lists exactly the models that carry organizationId", () => {
    const schema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8")
    const withOrganizationId: string[] = []

    for (const match of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
      const [, name, body] = match
      if (/^\s*organizationId\s/m.test(body)) withOrganizationId.push(name)
    }

    expect([...TENANT_MODELS].sort()).toEqual(withOrganizationId.sort())
  })
})

describe("reads", () => {
  it("adds the organization filter to findMany and keeps the existing filter", () => {
    const args = scopeArgs("Transaction", "findMany", { where: { operatorId: "op1" } }, ORG_A)
    expect(args.where).toEqual({ operatorId: "op1", organizationId: ORG_A })
  })

  it("adds the organization filter when there is no where clause", () => {
    const args = scopeArgs("Account", "findMany", undefined, ORG_A)
    expect(args.where).toEqual({ organizationId: ORG_A })
  })

  it("scopes findUnique, count and aggregate", () => {
    for (const operation of ["findUnique", "findUniqueOrThrow", "findFirst", "count", "aggregate", "groupBy"]) {
      const args = scopeArgs("Transaction", operation, { where: { id: "t1" } }, ORG_A)
      expect(args.where).toEqual({ id: "t1", organizationId: ORG_A })
    }
  })

  it("refuses a filter that targets another organization", () => {
    expect(() =>
      scopeArgs("Transaction", "findMany", { where: { organizationId: ORG_B } }, ORG_A),
    ).toThrow(TenantIsolationError)
  })

  it("refuses an organization filter expressed as an operator object", () => {
    expect(() =>
      scopeArgs("Transaction", "findMany", { where: { organizationId: { in: [ORG_A, ORG_B] } } }, ORG_A),
    ).toThrow(TenantIsolationError)
  })

  it("scopes the tenant root by its own id", () => {
    const args = scopeArgs("Organization", "findUnique", { where: { clerkOrgId: "x" } }, ORG_A)
    expect(args.where).toEqual({ clerkOrgId: "x", id: ORG_A })
  })

  it("leaves global tables untouched", () => {
    const args = { where: { code: "WAVE" } }
    expect(scopeArgs("OperatorCatalog", "findMany", args, ORG_A)).toEqual(args)
  })
})

describe("writes", () => {
  it("injects organizationId on create", () => {
    const args = scopeArgs("Branch", "create", { data: { name: "Kiosque" } }, ORG_A)
    expect(args.data).toEqual({ name: "Kiosque", organizationId: ORG_A })
  })

  it("refuses a create that names another organization", () => {
    expect(() =>
      scopeArgs("Branch", "create", { data: { name: "K", organizationId: ORG_B } }, ORG_A),
    ).toThrow(TenantIsolationError)
  })

  it("injects organizationId on every row of createMany", () => {
    const args = scopeArgs("LedgerEntry", "createMany", { data: [{ delta: 1 }, { delta: -1 }] }, ORG_A)
    expect(args.data).toEqual([
      { delta: 1, organizationId: ORG_A },
      { delta: -1, organizationId: ORG_A },
    ])
  })

  it("refuses a createMany row that names another organization", () => {
    expect(() =>
      scopeArgs("LedgerEntry", "createMany", { data: [{ delta: 1 }, { delta: 2, organizationId: ORG_B }] }, ORG_A),
    ).toThrow(TenantIsolationError)
  })

  it("scopes update and updateMany by organization", () => {
    const one = scopeArgs("Branch", "update", { where: { id: "b1" }, data: { name: "N" } }, ORG_A)
    expect(one.where).toEqual({ id: "b1", organizationId: ORG_A })
    const many = scopeArgs("Branch", "updateMany", { where: { isActive: true }, data: { isActive: false } }, ORG_A)
    expect(many.where).toEqual({ isActive: true, organizationId: ORG_A })
  })

  it("scopes upsert on both the lookup and the create part", () => {
    const args = scopeArgs(
      "OrgOperator",
      "upsert",
      { where: { id: "o1" }, create: { operatorId: "op" }, update: {} },
      ORG_A,
    )
    expect(args.where).toEqual({ id: "o1", organizationId: ORG_A })
    expect(args.create).toEqual({ operatorId: "op", organizationId: ORG_A })
  })

  it("refuses to create or delete an organization through the tenant client", () => {
    expect(() => scopeArgs("Organization", "create", { data: { name: "X" } }, ORG_A)).toThrow(TenantIsolationError)
    expect(() => scopeArgs("Organization", "delete", { where: { id: ORG_A } }, ORG_A)).toThrow(ImmutableRecordError)
  })

  it("allows updating the tenant root settings for its own id only", () => {
    const args = scopeArgs("Organization", "update", { where: {}, data: { roundingMode: "FLOOR" } }, ORG_A)
    expect(args.where).toEqual({ id: ORG_A })
    expect(() =>
      scopeArgs("Organization", "update", { where: { id: ORG_B }, data: { name: "Hijack" } }, ORG_A),
    ).toThrow(TenantIsolationError)
  })
})

describe("immutability", () => {
  it("never deletes validated rows", () => {
    for (const model of ["Transaction", "LedgerEntry", "DailyClosing", "AuditLog"]) {
      expect(() => scopeArgs(model, "delete", { where: { id: "x" } }, ORG_A)).toThrow(ImmutableRecordError)
      expect(() => scopeArgs(model, "deleteMany", { where: {} }, ORG_A)).toThrow(ImmutableRecordError)
    }
  })

  it("never modifies ledger entries or audit logs", () => {
    for (const model of ["LedgerEntry", "AuditLog"]) {
      expect(() => scopeArgs(model, "update", { where: { id: "x" }, data: { delta: 5 } }, ORG_A)).toThrow(
        ImmutableRecordError,
      )
      expect(() => scopeArgs(model, "updateMany", { where: {}, data: { delta: 5 } }, ORG_A)).toThrow(
        ImmutableRecordError,
      )
    }
  })

  it("lets a transaction be cancelled but not edited", () => {
    const cancel = scopeArgs(
      "Transaction",
      "update",
      { where: { id: "t1" }, data: { status: "CANCELLED", cancelReason: "Erreur", cancelledById: "m1" } },
      ORG_A,
    )
    expect(cancel.where).toEqual({ id: "t1", organizationId: ORG_A })

    for (const field of ["amount", "fee", "commission", "operatorId", "reference", "customerPhone"]) {
      expect(() => scopeArgs("Transaction", "update", { where: { id: "t1" }, data: { [field]: 1 } }, ORG_A)).toThrow(
        ImmutableRecordError,
      )
    }
  })

  it("forbids upsert on immutable models", () => {
    for (const model of ["Transaction", "LedgerEntry", "DailyClosing", "AuditLog"]) {
      expect(() => scopeArgs(model, "upsert", { where: {}, create: {}, update: {} }, ORG_A)).toThrow(
        ImmutableRecordError,
      )
    }
  })

  it("still allows a closing to change status", () => {
    const args = scopeArgs("DailyClosing", "update", { where: { id: "c1" }, data: { status: "CLOSED" } }, ORG_A)
    expect(args.where).toEqual({ id: "c1", organizationId: ORG_A })
  })
})

describe("unknown operations", () => {
  it("refuses an operation it does not know", () => {
    expect(() => scopeArgs("Transaction", "someNewOperation", {}, ORG_A)).toThrow(TenantIsolationError)
  })
})
