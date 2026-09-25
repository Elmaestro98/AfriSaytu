import type { PrismaClient } from "@/generated/prisma/client"
import { isHexColor, operatorCode, removalOf, type OperatorUsage } from "@/server/operators/catalog-rules"
import { checkLogo } from "@/server/operators/logo-image"
import type { ActionResult } from "@/server/result"

// The global operator catalogue, managed by the SaaS admin only (F-10). Every organization sees
// it and chooses which operators it uses (OrgOperator, F-11). Called with getAdminDb().

export type CatalogOperator = {
  id: string
  name: string
  code: string
  color: string | null
  isActive: boolean
  logoUpdatedAt: Date | null
  usage: OperatorUsage
}

export async function listCatalog(db: PrismaClient): Promise<CatalogOperator[]> {
  const rows = await db.operatorCatalog.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      color: true,
      isActive: true,
      logo: { select: { updatedAt: true } },
      _count: { select: { orgOperators: true, accounts: true, transactions: true, commissionRules: true } },
    },
  })
  return rows.map(({ logo, _count, ...row }) => ({
    ...row,
    logoUpdatedAt: logo?.updatedAt ?? null,
    usage: { organizations: _count.orgOperators, accounts: _count.accounts, transactions: _count.transactions, rules: _count.commissionRules },
  }))
}

export type OperatorFields = { name: string; color: string; logo: Uint8Array | null }

function checkFields(fields: OperatorFields, logoRequired: boolean): { ok: false; error: string } | { ok: true; logo: { mimeType: string; data: Uint8Array<ArrayBuffer> } | null } {
  const name = fields.name.trim()
  if (name.length < 2 || name.length > 40) return { ok: false, error: "Nom entre 2 et 40 caractères." }
  if (!isHexColor(fields.color)) return { ok: false, error: "Couleur invalide." }
  if (!fields.logo || fields.logo.length === 0) {
    return logoRequired ? { ok: false, error: "Le logo de l'opérateur est obligatoire." } : { ok: true, logo: null }
  }
  const check = checkLogo(fields.logo)
  if (!check.ok) return check
  return { ok: true, logo: { mimeType: check.mimeType, data: new Uint8Array(fields.logo) } }
}

async function nameTaken(db: PrismaClient, name: string, exceptId?: string): Promise<boolean> {
  const same = await db.operatorCatalog.count({
    where: { name: { equals: name.trim(), mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
  })
  return same > 0
}

// New operator: name, colour and logo (required), default balance effects (ledger/effects).
export async function createOperator(db: PrismaClient, fields: OperatorFields): Promise<ActionResult> {
  const check = checkFields(fields, true)
  if (!check.ok) return check
  if (await nameTaken(db, fields.name)) return { ok: false, error: "Un opérateur porte déjà ce nom." }

  const codes = await db.operatorCatalog.findMany({ select: { code: true } })
  const code = operatorCode(fields.name, new Set(codes.map((row) => row.code)))
  await db.$transaction(async (tx) => {
    const created = await tx.operatorCatalog.create({ data: { name: fields.name.trim(), code, color: fields.color, isActive: true }, select: { id: true } })
    if (check.logo) await tx.operatorLogo.create({ data: { operatorId: created.id, ...check.logo } })
  })
  return { ok: true }
}

// Name, colour, and the logo when a new one is sent (also how Wave, OM and Mixx get theirs).
export async function updateOperator(db: PrismaClient, operatorId: string, fields: OperatorFields): Promise<ActionResult> {
  const check = checkFields(fields, false)
  if (!check.ok) return check
  const operator = await db.operatorCatalog.findUnique({ where: { id: operatorId }, select: { id: true } })
  if (!operator) return { ok: false, error: "Opérateur introuvable." }
  if (await nameTaken(db, fields.name, operatorId)) return { ok: false, error: "Un opérateur porte déjà ce nom." }

  await db.$transaction(async (tx) => {
    await tx.operatorCatalog.update({ where: { id: operatorId }, data: { name: fields.name.trim(), color: fields.color } })
    if (check.logo) {
      await tx.operatorLogo.upsert({ where: { operatorId }, create: { operatorId, ...check.logo }, update: check.logo })
    }
  })
  return { ok: true }
}

// Deleted if no organization ever used it, otherwise switched off everywhere (history kept).
export async function removeOperator(db: PrismaClient, operatorId: string): Promise<ActionResult & { removal?: "DELETE" | "DEACTIVATE" }> {
  const [operator] = (await listCatalog(db)).filter((row) => row.id === operatorId)
  if (!operator) return { ok: false, error: "Opérateur introuvable." }

  const removal = removalOf(operator.usage)
  if (removal === "DELETE") {
    await db.operatorCatalog.delete({ where: { id: operatorId } }) // its logo goes with it (cascade)
  } else {
    if (!operator.isActive) return { ok: false, error: "Cet opérateur est déjà désactivé." }
    await db.operatorCatalog.update({ where: { id: operatorId }, data: { isActive: false } })
  }
  return { ok: true, removal }
}

export async function reactivateOperator(db: PrismaClient, operatorId: string): Promise<ActionResult> {
  const updated = await db.operatorCatalog.updateMany({ where: { id: operatorId, isActive: false }, data: { isActive: true } })
  return updated.count === 1 ? { ok: true } : { ok: false, error: "Cet opérateur est déjà actif." }
}
