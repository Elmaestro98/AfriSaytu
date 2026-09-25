// Browser only: shrinks an image to at most `max` pixels on its longest side before upload, so a
// logo weighs a few kilobytes on a 3G connection. WebP when the browser can, PNG otherwise.
export async function resizeImage(file: File, max = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file) // refuses anything that is not a readable image
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas unavailable")
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9))
  const webp = await encode("image/webp")
  if (webp?.type === "image/webp") return webp
  const png = await encode("image/png")
  if (!png) throw new Error("Image encoding failed")
  return png
}
