import ExcelJS from "exceljs"
import { describe, expect, it } from "vitest"

import { EXPORT_COLUMNS, toExportRecord } from "@/server/export/operations-file"
import { toXlsx } from "@/server/export/operations-xlsx"

describe("toXlsx", () => {
  it("writes a workbook Excel can read back: header, real numbers and dates", async () => {
    const record = toExportRecord(
      {
        createdAt: new Date("2026-09-25T14:32:00.000Z"),
        branchName: "Kiosque Médina",
        authorName: "Moussa Diop",
        operatorName: "Wave",
        type: "WITHDRAWAL",
        amount: 1_250_000,
        fee: 0,
        commission: 1_500,
        noRule: false,
        customerPhone: null,
        reference: null,
        status: "VALID",
        cancelReason: null,
        note: null,
      },
      false,
    )

    const buffer = await toXlsx([record], "Test")
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    const sheet = workbook.getWorksheet("Opérations")!

    expect(sheet.getRow(1).getCell(1).value).toBe("Date")
    expect(sheet.getRow(1).getCell(4).value).toBe("Opérateur")
    expect(sheet.rowCount).toBe(2)

    const amountColumn = EXPORT_COLUMNS.findIndex((column) => column.key === "amount") + 1
    expect(sheet.getRow(2).getCell(amountColumn).value).toBe(1_250_000)
    expect(sheet.getRow(2).getCell(amountColumn).numFmt).toBe("#,##0")
    expect(sheet.getRow(2).getCell(1).value).toEqual(new Date("2026-09-25T14:32:00.000Z"))
    expect(sheet.getRow(2).getCell(5).value).toBe("Retrait")
  })
})
