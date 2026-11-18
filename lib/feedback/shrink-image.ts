import { MAX_SCREENSHOT_BYTES } from './screenshot'

export type Encode = (source: Blob, opts: { scale: number; quality: number }) => Promise<Blob>

const KEEP_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const QUALITIES = [0.85, 0.7]
const MAX_ROUNDS = 12

/** Draws the image to a canvas at the given scale and exports it as a JPEG. */
export const canvasEncode: Encode = async (source, { scale, quality }) => {
  const bitmap = await createImageBitmap(source)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))), 'image/jpeg', quality)
  )
}

/**
 * An image the server will take: unchanged when it is already a small enough
 * JPEG, PNG or WebP; otherwise re-encoded as JPEG, lowering the quality and
 * then the size until it fits under MAX_SCREENSHOT_BYTES.
 */
export async function shrinkImage(blob: Blob, encode: Encode = canvasEncode): Promise<Blob> {
  if (blob.size <= MAX_SCREENSHOT_BYTES && KEEP_TYPES.has(blob.type)) return blob

  let scale = 1
  for (let round = 0; round < MAX_ROUNDS; round++) {
    let smallest = Number.POSITIVE_INFINITY
    for (const quality of QUALITIES) {
      const out = await encode(blob, { scale, quality })
      if (out.size <= MAX_SCREENSHOT_BYTES) return out
      smallest = Math.min(smallest, out.size)
    }
    // Area tracks bytes, so scale by the square root of how far over we are (a bit under, to converge).
    scale *= Math.min(0.9, Math.max(0.5, Math.sqrt(MAX_SCREENSHOT_BYTES / smallest) * 0.95))
  }
  throw new Error('Could not shrink the image under the size limit')
}
