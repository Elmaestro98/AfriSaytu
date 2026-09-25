import ExcelJS from "exceljs"

import { EXPORT_COLUMNS, type ExportRecord } from "@/server/export/operations-file"

const PRIMARY = "FF0B5D4B" // brand primary, mirrors --primary

// Excel workbook of the operations export: a styled header, frozen and filterable, real numbers
// with thousands separators, and a real date column.
export async function toXlsx(records: readonly ExportRecord[], title: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "AfriSaytu"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("Opérations", { views: [{ state: "frozen", ySplit: 1 }] })
  sheet.columns = EXPORT_COLUMNS.map((column) =>
    column.key === "dateText"
      ? { header: column.header, key: "date", width: column.width, style: { numFmt: "dd/mm/yyyy hh:mm" } }
      : { header: column.header, key: column.key, width: column.width, style: column.numeric ? { numFmt: "#,##0" } : {} },
  )

  for (const record of records) {
    sheet.addRow({ ...record, date: record.date })
  }

  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: "FFFFFFFF" } }
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY } }
  header.alignment = { vertical: "middle" }
  header.height = 22
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: EXPORT_COLUMNS.length } }
  workbook.title = title

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
