import type { TransactionType } from "@/generated/prisma/enums"
import { TIME_ZONE } from "@/lib/dates"
import { formatPhone, maskPhone } from "@/lib/phone"
import { TYPE_LABELS } from "@/lib/operation-types"

// Pure: rows and CSV of the operations export (F-53). Opens correctly in Excel: UTF-8 with BOM
// for the accents, ";" separator (French Excel), amounts as plain whole numbers.

export type ExportSource = {
  createdAt: Date
  branchName: string
  authorName: string
  operatorName: string
  type: TransactionType
  amount: number
  fee: number
  commission: number
  noRule: boolean
  dailyCommission: boolean // earns via the day's total of the branch (daily-volume operator)
  customerPhone: string | null
  reference: string | null
  status: "VALID" | "CANCELLED"
  cancelReason: string | null
  note: string | null
}

export type ExportRecord = {
  date: Date
  dateText: string // 25/09/2026 14:32, Dakar time
  branch: string
  agent: string
  operator: string
  type: string
  amount: number
  fee: number
  commission: number
  commissionMode: string
  withoutRule: string
  customer: string
  reference: string
  status: string
  cancelReason: string
  note: string
}

export const EXPORT_COLUMNS: { key: Exclude<keyof ExportRecord, "date">; header: string; numeric?: boolean; width: number }[] = [
  { key: "dateText", header: "Date", width: 18 },
  { key: "branch", header: "Point de vente", width: 22 },
  { key: "agent", header: "Agent", width: 22 },
  { key: "operator", header: "Opérateur", width: 16 },
  { key: "type", header: "Type", width: 12 },
  { key: "amount", header: "Montant (FCFA)", numeric: true, width: 16 },
  { key: "fee", header: "Frais client (FCFA)", numeric: true, width: 18 },
  { key: "commission", header: "Commission (FCFA)", numeric: true, width: 18 },
  { key: "commissionMode", header: "Mode de commission", width: 18 },
  { key: "withoutRule", header: "Sans règle", width: 12 },
  { key: "customer", header: "N° client", width: 16 },
  { key: "reference", header: "Référence", width: 18 },
  { key: "status", header: "Statut", width: 12 },
  { key: "cancelReason", header: "Motif d'annulation", width: 28 },
  { key: "note", header: "Note", width: 28 },
]

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

// Customer numbers stay personal data in the file: masked for agents, like on screen.
export function toExportRecord(source: ExportSource, maskCustomer: boolean): ExportRecord {
  const phone = source.customerPhone
  return {
    date: source.createdAt,
    dateText: dateFormat.format(source.createdAt).replace(",", ""),
    branch: source.branchName,
    agent: source.authorName,
    operator: source.operatorName,
    type: TYPE_LABELS[source.type],
    amount: source.amount,
    fee: source.fee,
    commission: source.status === "CANCELLED" ? 0 : source.commission,
    commissionMode: source.dailyCommission ? "Du jour" : "Par opération",
    withoutRule: source.noRule ? "Oui" : "Non",
    customer: phone ? (maskCustomer ? maskPhone(phone) : formatPhone(phone)) : "",
    reference: source.reference ?? "",
    status: source.status === "CANCELLED" ? "Annulée" : "Validée",
    cancelReason: source.cancelReason ?? "",
    note: source.note ?? "",
  }
}

function csvCell(value: string | number): string {
  const text = String(value)
  // Quote when needed; neutralise formulas (a cell starting with = + - @ would run in Excel).
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export const CSV_BOM = "﻿"

export function toCsv(records: readonly ExportRecord[]): string {
  const header = EXPORT_COLUMNS.map((column) => csvCell(column.header)).join(";")
  const lines = records.map((record) => EXPORT_COLUMNS.map((column) => csvCell(record[column.key])).join(";"))
  return CSV_BOM + [header, ...lines].join("\r\n") + "\r\n"
}

// "afrisaytu-wave-2026-09-01-au-2026-09-15.xlsx": what was exported, in the file name.
// Only letters, digits and dashes: safe in a download header and on every system.
export function exportFileName(parts: { operatorCode: string | null; range: { from: string; to: string } | null; period: string; today: string }, format: "csv" | "xlsx"): string {
  const slug = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  const what = parts.operatorCode ? slug(parts.operatorCode) : "operations"
  const when = parts.range ? `${parts.range.from}-au-${parts.range.to}` : parts.period === "all" ? `au-${parts.today}` : `${slug(parts.period)}-${parts.today}`
  return `afrisaytu-${what}-${when}.${format}`
}

