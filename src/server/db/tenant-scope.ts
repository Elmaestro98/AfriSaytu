// Pure query-rewriting rules for tenant isolation. No Prisma import on purpose: this file is
// unit-tested without a database. The Prisma extension in tenant.ts applies it to every query.

export class TenantIsolationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TenantIsolationError"
  }
}

export class ImmutableRecordError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ImmutableRecordError"
  }
}

// Models that carry organizationId. A test compares this list with prisma/schema.prisma.
export const TENANT_MODELS: ReadonlySet<string> = new Set([
  "Branch",
  "Member",
  "MemberBranch",
  "OrgOperator",
  "Account",
  "LedgerEntry",
  "Transaction",
  "InternalMovement",
  "CommissionRule",
  "DailyClosing",
  "ClosingLine",
  "Subscription",
  "Payment",
  "AuditLog",
])

// The tenant root is scoped by its own id, and can be updated but never created or deleted here.
const ORGANIZATION_MODEL = "Organization"

// Rows that must never be deleted (CLAUDE.md, rule 4).
const NEVER_DELETE: ReadonlySet<string> = new Set([
  "Transaction",
  "LedgerEntry",
  "DailyClosing",
  "AuditLog",
])

// Rows that must never be updated at all.
const NEVER_UPDATE: ReadonlySet<string> = new Set(["LedgerEntry", "AuditLog"])

// A validated transaction is never edited. Only the cancellation fields and the closing
// attachment may change.
const TRANSACTION_UPDATABLE_FIELDS: ReadonlySet<string> = new Set([
  "status",
  "cancelReason",
  "cancelledById",
  "cancelledAt",
  "closingId",
])

const UPSERT_FORBIDDEN: ReadonlySet<string> = new Set([
  "Transaction",
  "LedgerEntry",
  "DailyClosing",
  "AuditLog",
])

const READ_OPERATIONS: ReadonlySet<string> = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
])

const UPDATE_OPERATIONS: ReadonlySet<string> = new Set([
  "update",
  "updateMany",
  "updateManyAndReturn",
])

const DELETE_OPERATIONS: ReadonlySet<string> = new Set(["delete", "deleteMany"])

type Args = Record<string, unknown> | undefined

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Adds `key = organizationId` to a where clause. A different value already present means the
// caller tried to reach another tenant: refuse instead of silently overriding.
function scopeWhere(where: unknown, key: string, organizationId: string): Record<string, unknown> {
  const current = isRecord(where) ? where : {}
  if (key in current && current[key] !== organizationId) {
    throw new TenantIsolationError(`Cross-tenant filter on "${key}" is not allowed`)
  }
  return { ...current, [key]: organizationId }
}

function scopeData(data: unknown, organizationId: string): Record<string, unknown> {
  if (!isRecord(data)) {
    throw new TenantIsolationError("Missing data for a tenant write")
  }
  if ("organizationId" in data && data.organizationId !== organizationId) {
    throw new TenantIsolationError('Cross-tenant "organizationId" in data is not allowed')
  }
  return { ...data, organizationId }
}

function assertTransactionUpdate(data: unknown): void {
  if (!isRecord(data)) {
    throw new ImmutableRecordError("Transaction update without data")
  }
  for (const field of Object.keys(data)) {
    if (!TRANSACTION_UPDATABLE_FIELDS.has(field)) {
      throw new ImmutableRecordError(
        `Transaction field "${field}" cannot be modified: cancel and re-enter instead`,
      )
    }
  }
}

export function scopeArgs(
  model: string,
  operation: string,
  args: Args,
  organizationId: string,
): Record<string, unknown> {
  const base: Record<string, unknown> = isRecord(args) ? args : {}

  // Global tables (OperatorCatalog) have no tenant.
  if (model !== ORGANIZATION_MODEL && !TENANT_MODELS.has(model)) {
    return base
  }

  const scopeKey = model === ORGANIZATION_MODEL ? "id" : "organizationId"

  if (DELETE_OPERATIONS.has(operation)) {
    if (model === ORGANIZATION_MODEL || NEVER_DELETE.has(model)) {
      throw new ImmutableRecordError(`${model} rows cannot be deleted`)
    }
    return { ...base, where: scopeWhere(base.where, scopeKey, organizationId) }
  }

  if (UPDATE_OPERATIONS.has(operation)) {
    if (NEVER_UPDATE.has(model)) {
      throw new ImmutableRecordError(`${model} rows cannot be modified`)
    }
    if (model === "Transaction") {
      assertTransactionUpdate(base.data)
    }
    return { ...base, where: scopeWhere(base.where, scopeKey, organizationId) }
  }

  if (READ_OPERATIONS.has(operation)) {
    return { ...base, where: scopeWhere(base.where, scopeKey, organizationId) }
  }

  if (operation === "upsert") {
    if (model === ORGANIZATION_MODEL || UPSERT_FORBIDDEN.has(model)) {
      throw new ImmutableRecordError(`upsert is not allowed on ${model}`)
    }
    return {
      ...base,
      where: scopeWhere(base.where, scopeKey, organizationId),
      create: scopeData(base.create, organizationId),
    }
  }

  if (operation === "create") {
    if (model === ORGANIZATION_MODEL) {
      throw new TenantIsolationError("Organizations are created by the provisioning code only")
    }
    return { ...base, data: scopeData(base.data, organizationId) }
  }

  if (operation === "createMany" || operation === "createManyAndReturn") {
    if (model === ORGANIZATION_MODEL) {
      throw new TenantIsolationError("Organizations are created by the provisioning code only")
    }
    const rows = Array.isArray(base.data) ? base.data : [base.data]
    return { ...base, data: rows.map((row) => scopeData(row, organizationId)) }
  }

  // Unknown operation: refuse rather than let it through unscoped.
  throw new TenantIsolationError(`Operation "${operation}" is not allowed on ${model}`)
}
