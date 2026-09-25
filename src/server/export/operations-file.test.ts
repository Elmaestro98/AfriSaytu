import { describe, expect, it } from "vitest"

import { CSV_BOM, EXPORT_COLUMNS, exportFileName, toCsv, toExportRecord, type ExportSource } from "@/server/export/operations-file"

const source: ExportSource = {
  createdAt: new Date("2026-09-25T14:32:00.000Z"),
  branchName: "Kiosque Médina",
  authorName: "Moussa Diop",
  operatorName: "Wave",
  type: "DEPOSIT",
  amount: 25_000,
  fee: 0,
  commission: 250,
  noRule: false,
  dailyCommission: false,
  customerPhone: "771234567",
  reference: "WV-892",
  status: "VALID",
  cancelReason: null,
  note: null,
}

describe("toExportRecord", () => {
  it("formats the date in Dakar time and keeps amounts as numbers", () => {
    const record = toExportRecord(source, false)
    expect(record.dateText).toBe("25/09/2026 14:32")
    expect(record.amount).toBe(25_000)
    expect(record.type).toBe("Dépôt")
    expect(record.customer).toBe("77 123 45 67")
  })

  it("masks the customer number for agents", () => {
    expect(toExportRecord(source, true).customer).toBe("77 *** ** 67")
  })

  it("shows a cancelled operation with no commission and its reason", () => {
    const record = toExportRecord({ ...source, status: "CANCELLED", cancelReason: "Erreur" }, false)
    expect(record).toMatchObject({ status: "Annulée", commission: 0, cancelReason: "Erreur" })
  })
})

describe("toCsv", () => {
  it("starts with a BOM, uses ; and CRLF, and keeps accents", () => {
    const csv = toCsv([toExportRecord(source, false)])
    expect(csv.startsWith(CSV_BOM)).toBe(true)
    const [header, line] = csv.slice(1).split("\r\n")
    expect(header.split(";")).toHaveLength(EXPORT_COLUMNS.length)
    expect(header).toContain("Opérateur")
    expect(line).toBe("25/09/2026 14:32;Kiosque Médina;Moussa Diop;Wave;Dépôt;25000;0;250;Par opération;Non;77 123 45 67;WV-892;Validée;;")
  })

  it("quotes cells containing separators, quotes or line breaks", () => {
    const csv = toCsv([toExportRecord({ ...source, note: 'Client "pressé"; revenir\ndemain' }, false)])
    expect(csv).toContain('"Client ""pressé""; revenir\ndemain"')
  })

  it("neutralises cells that Excel would run as formulas", () => {
    const csv = toCsv([toExportRecord({ ...source, reference: "=HYPERLINK(\"x\")" }, false)])
    expect(csv).toContain("'=HYPERLINK")
  })

  it("exports only the header when there is nothing", () => {
    expect(toCsv([]).split("\r\n").filter(Boolean)).toHaveLength(1)
  })
})

describe("commission mode column", () => {
  it("tells an operation paid on the day's total from one paid per operation", () => {
    expect(toExportRecord({ ...source, commission: 0, dailyCommission: true }, false).commissionMode).toBe("Du jour")
    expect(toExportRecord(source, false).commissionMode).toBe("Par opération")
  })
})

describe("exportFileName", () => {
  it("names the operator and the chosen days", () => {
    expect(exportFileName({ operatorCode: "Wave", range: { from: "2026-09-01", to: "2026-09-15" }, period: "today", today: "2026-09-25" }, "xlsx"))
      .toBe("afrisaytu-wave-2026-09-01-au-2026-09-15.xlsx")
  })

  it("keeps only safe characters", () => {
    expect(exportFileName({ operatorCode: "Mixx by Yas", range: null, period: "7d", today: "2026-09-25" }, "csv")).toBe("afrisaytu-mixx-by-yas-7d-2026-09-25.csv")
    expect(exportFileName({ operatorCode: null, range: null, period: "all", today: "2026-09-25" }, "csv")).toBe("afrisaytu-operations-au-2026-09-25.csv")
  })
})

