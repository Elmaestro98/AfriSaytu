// Address of an operator logo, or null when it has none. The version (last change) makes the
// browser fetch the new image right after an update, and cache it for long otherwise.
export function operatorLogoSrc(operatorId: string, logoUpdatedAt: Date | null | undefined): string | null {
  return logoUpdatedAt ? `/api/operators/${encodeURIComponent(operatorId)}/logo?v=${logoUpdatedAt.getTime()}` : null
}
