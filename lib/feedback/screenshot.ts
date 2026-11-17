/** Largest bug report screenshot the server accepts: 500 KB, as 500 * 1024 bytes. */
export const MAX_SCREENSHOT_BYTES = 512_000

/** Elements with this attribute (such as the admin tab) are left out of screen captures. */
export const CAPTURE_SKIP_ATTR = 'data-capture-skip'

export type ScreenshotType = 'image/jpeg' | 'image/png' | 'image/webp'

const ascii = (bytes: Uint8Array, at: number, text: string) =>
  [...text].every((c, i) => bytes[at + i] === c.charCodeAt(0))

/** The image type from the file's own signature, not its declared type; null for anything else. */
export function detectImageType(bytes: Uint8Array): ScreenshotType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 'PNG\r\n\x1a\n')) return 'image/png'
  if (bytes.length >= 12 && ascii(bytes, 0, 'RIFF') && ascii(bytes, 8, 'WEBP')) return 'image/webp'
  return null
}
