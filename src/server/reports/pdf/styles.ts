import { StyleSheet } from "@react-pdf/renderer"

// Brand colours of the report (CLAUDE.md section 7). The PDF has no CSS variables: plain values.
export const COLORS = {
  primary: "#0B5D4B",
  accent: "#F2A900",
  ink: "#14181F",
  muted: "#5B6470",
  line: "#E3E6E2",
  soft: "#EEF5F2",
  danger: "#B42318",
  white: "#FFFFFF",
} as const

// Built-in PDF fonts: no file to ship, French accents and non-breaking spaces included.
const REGULAR = "Helvetica"
const BOLD = "Helvetica-Bold"

export const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 36, fontFamily: REGULAR, fontSize: 9.5, color: COLORS.ink },
  band: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  logoTile: { width: 46, height: 46, backgroundColor: COLORS.white, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  logo: { height: 38 },
  bandTitle: { fontFamily: BOLD, fontSize: 18, color: COLORS.white },
  bandText: { fontSize: 10, color: COLORS.white, marginTop: 3 },
  bandMonth: { fontFamily: BOLD, fontSize: 13, color: COLORS.accent, marginTop: 4 },
  note: { marginTop: 10, padding: 8, borderRadius: 6, backgroundColor: COLORS.soft, color: COLORS.primary, fontSize: 9 },

  section: { marginTop: 18 },
  h2: { fontFamily: BOLD, fontSize: 12.5, color: COLORS.primary, paddingBottom: 4, marginBottom: 8, borderBottomWidth: 1.5, borderBottomColor: COLORS.accent },
  muted: { color: COLORS.muted },
  small: { fontSize: 8.5, color: COLORS.muted, marginTop: 4 },
  bold: { fontFamily: BOLD },

  kpis: { flexDirection: "row", gap: 8, marginTop: 14 },
  kpi: { flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 9 },
  kpiMain: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  kpiLabel: { fontSize: 7.5, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  kpiValue: { fontFamily: BOLD, fontSize: 12.5, marginTop: 5 },
  kpiHint: { fontSize: 8, color: COLORS.muted, marginTop: 4 },

  table: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 6 },
  headRow: { flexDirection: "row", backgroundColor: COLORS.soft },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.line },
  totalRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.soft },
  th: { fontFamily: BOLD, fontSize: 8.5, color: COLORS.primary, paddingVertical: 5, paddingHorizontal: 6 },
  td: { paddingVertical: 5, paddingHorizontal: 6 },
  num: { textAlign: "right" },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  nameCell: { flexDirection: "row", alignItems: "center" },

  chart: { flexDirection: "row", alignItems: "flex-end", height: 90, gap: 2, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  bar: { flex: 1, backgroundColor: COLORS.primary, borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5 },
  chartAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: 3, fontSize: 7.5, color: COLORS.muted },

  footer: { position: "absolute", bottom: 22, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: COLORS.muted, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 6 },
})
