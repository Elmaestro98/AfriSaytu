// Pure checks on an uploaded operator logo. The type is read from the first bytes of the file,
// never trusted from its name or from the browser. SVG is refused: it can carry scripts.

export const MAX_LOGO_BYTES = 100 * 1024
export type LogoMimeType = "image/png" | "image/jpeg" | "image/webp"

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

export function detectImageType(bytes: Uint8Array): LogoMimeType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png"
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg"
  // "RIFF" <size> "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp"
  return null
}

export type LogoCheck = { ok: true; mimeType: LogoMimeType } | { ok: false; error: string }

export function checkLogo(bytes: Uint8Array): LogoCheck {
  if (bytes.length === 0) return { ok: false, error: "Choisissez le logo de l'opérateur." }
  if (bytes.length > MAX_LOGO_BYTES) return { ok: false, error: "Logo trop lourd (100 Ko au maximum)." }
  const mimeType = detectImageType(bytes)
  if (!mimeType) return { ok: false, error: "Le logo doit être une image PNG, JPG ou WebP." }
  return { ok: true, mimeType }
}
