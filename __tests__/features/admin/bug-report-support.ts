/**
 * Shared helpers for the bug report tests (features/admin/bug-report-screenshot.feature, work 222).
 *
 * PINNED CONTRACT (what the implementation must provide)
 *
 * Sending: POST /api/feedback (app/api/feedback/route.ts, existing) also accepts multipart/form-data.
 *   Fields: category ("bug"), message, pageUrl, userAgent (optional), context (a JSON string, below),
 *   screenshot (optional file). The JSON body keeps working exactly as before.
 *   Success: 200 { success: true, id }.
 *   A screenshot from a user whose role is not admin: 403, nothing saved.
 *   The screenshot must be a real JPEG, PNG or WebP (checked by its bytes, not only its declared type)
 *   of at most MAX_SCREENSHOT_BYTES; anything else is refused (400, or 413 for size) and nothing is saved.
 *   Treat any non-string form entry as the file (don't rely on `instanceof File`).
 *   The Discord notice for a report with a screenshot mentions "screenshot" (e.g. a field named
 *   "Screenshot").
 *
 * Context (the `context` field, stored and returned as an object):
 *   { pageUrl: string, viewport: { width, height }, theme: { themeName, mode }, buildVersion: string,
 *     consoleErrors: string[] }   (at most 10 console errors, oldest first, newest last)
 *
 * Reading:
 *   GET /api/feedback (existing, editors and admins): every item gains `hasScreenshot: boolean` and
 *     `context` (the object above, or null). No image bytes in the list.
 *   GET /api/feedback/[feedbackId]/screenshot (new, editors and admins; app/api/feedback/[feedbackId]/screenshot/route.ts):
 *     the stored bytes, unchanged, with the stored Content-Type. 404 when there is none; 401/403 otherwise.
 *   MCP (lib/mcp/tools.ts): list_feedback items gain `hasScreenshot: boolean`. New tool
 *     get_feedback_screenshot({ feedbackId }) returns content with one { type: 'image', data: <base64>,
 *     mimeType } item and one { type: 'text' } item whose JSON has id (or feedbackId), message, pageUrl
 *     and context. Only for feedback belonging to the agent's user; anything else is a tool error
 *     (isError: true) with no image.
 *
 * Client modules:
 *   lib/feedback/screenshot.ts      export const MAX_SCREENSHOT_BYTES (500 KB: 500_000 to 512_000)
 *   lib/feedback/capture-screen.ts  export async function captureScreen(): Promise<Blob> (rejects when it can't)
 *   lib/feedback/shrink-image.ts    export async function shrinkImage(blob: Blob, encode?: Encode): Promise<Blob>
 *     type Encode = (source: Blob, opts: { scale: number; quality: number }) => Promise<Blob>
 *     (the default encoder draws to a canvas and exports image/jpeg). For an image over the limit the
 *     result is an image/jpeg of at most MAX_SCREENSHOT_BYTES, scaled down (scale < 1) as needed.
 *   lib/feedback/bug-context.ts     export function installConsoleErrorCapture(): void (records
 *     console.error calls; safe to call more than once) and export function collectBugContext(): context
 *     above. buildVersion is process.env.NEXT_PUBLIC_BUILD_VERSION; theme is getThemePreference().
 *
 * UI (components/features/admin-quick-panel/AdminQuickPanel.tsx, existing):
 *   The admin drawer has a button "Report a bug". It installs the console error capture on mount.
 *   Tapping it closes the drawer, then calls captureScreen(), then opens a dialog named "Report a bug"
 *   with an <img alt="Screenshot preview">, one textbox (the message), buttons "Retake", "Use a photo"
 *   and "Send", and an <input type="file"> inside the dialog. "Retake" hides the sheet (unmount,
 *   display:none, visibility:hidden or the hidden attribute) while captureScreen() runs again.
 *   A failed capture shows text matching /capture didn.t work/i, keeps "Use a photo", and Send still works
 *   (no screenshot field). Send is disabled while the message is empty. The image is passed through
 *   shrinkImage() before upload. Success closes the sheet and shows "Bug report sent".
 *   A failed send keeps the sheet open with the message and image and shows text matching /didn.t send/i.
 *
 * Admin feedback page (app/(app)/admin/feedback/page.tsx, existing): an expanded item with a screenshot
 *   shows an <img> whose src is /api/feedback/<id>/screenshot; tapping it opens a dialog with the full-size
 *   image (an <img> with the same src). The context values are shown as text.
 */

import { File as NodeFile } from 'node:buffer'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Synthetic image bytes: the real file signatures, then a deterministic filler.
// ---------------------------------------------------------------------------
type Bytes = Uint8Array<ArrayBuffer>

function fill(out: Bytes, from: number, seed: number) {
  for (let i = from; i < out.length; i++) out[i] = (i * 31 + seed * 7 + 11) & 0xff
  return out
}

export function pngBytes(size = 4000, seed = 1): Bytes {
  const out = new Uint8Array(size)
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  return fill(out, 16, seed)
}

export function jpegBytes(size = 4000, seed = 2): Bytes {
  const out = new Uint8Array(size)
  out.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00])
  fill(out, 11, seed)
  out[size - 2] = 0xff
  out[size - 1] = 0xd9
  return out
}

export function webpBytes(size = 4000, seed = 3): Bytes {
  const out = new Uint8Array(size)
  const ascii = (s: string, at: number) => out.set([...s].map((c) => c.charCodeAt(0)), at)
  ascii('RIFF', 0)
  new DataView(out.buffer).setUint32(4, size - 8, true)
  ascii('WEBP', 8)
  ascii('VP8 ', 12)
  return fill(out, 16, seed)
}

export function gifBytes(size = 4000, seed = 4): Bytes {
  const out = new Uint8Array(size)
  out.set([...'GIF89a'].map((c) => c.charCodeAt(0)))
  return fill(out, 6, seed)
}

export const textBytes = (s: string): Bytes => new Uint8Array(new TextEncoder().encode(s))

// ---------------------------------------------------------------------------
// Multipart bodies, built by hand so they work the same under node and jsdom.
// ---------------------------------------------------------------------------
export type FilePart = { bytes: Bytes; type: string; filename?: string }
export type Fields = Record<string, string | FilePart | undefined>

export function multipart(fields: Fields): { body: Bytes; contentType: string } {
  const boundary = `----bugreport${Math.random().toString(16).slice(2)}`
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) continue
    if (typeof value === 'string') {
      parts.push(enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`))
    } else {
      const filename = value.filename ?? 'screenshot'
      parts.push(
        enc.encode(
          `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${value.type}\r\n\r\n`
        ),
        value.bytes,
        enc.encode('\r\n')
      )
    }
  }
  parts.push(enc.encode(`--${boundary}--\r\n`))
  const body = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    body.set(p, at)
    at += p.length
  }
  return { body, contentType: `multipart/form-data; boundary=${boundary}` }
}

export function multipartRequest(fields: Fields, url = 'http://localhost/api/feedback') {
  const { body, contentType } = multipart(fields)
  return new NextRequest(url, { method: 'POST', headers: { 'content-type': contentType }, body })
}

/**
 * Runs a route handler so undici's request.formData() can build the file entry under jsdom.
 * Node 26's undici checks the file against the global File, so that is Node's File for the call.
 * Node 20's undici builds the file with the File it saw when it loaded (jsdom's, here) and then checks it
 * by its arrayBuffer() method, which jsdom's Blob lacks, so jsdom's Blob gets that standard method for the
 * call. Node (production) is unaffected either way.
 */
export async function withNodeFile<T>(fn: () => Promise<T>): Promise<T> {
  const g = globalThis as { File: unknown; Blob?: { prototype: { arrayBuffer?: () => Promise<ArrayBuffer> } } }
  const prev = g.File
  const blobProto = g.Blob?.prototype
  const addArrayBuffer = blobProto !== undefined && typeof blobProto.arrayBuffer !== 'function'
  if (addArrayBuffer) blobProto.arrayBuffer = readArrayBuffer
  g.File = NodeFile
  try {
    return await fn()
  } finally {
    g.File = prev
    if (addArrayBuffer) delete blobProto.arrayBuffer
  }
}

function readArrayBuffer(this: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as ArrayBuffer)
    r.onerror = () => reject(r.error)
    r.readAsArrayBuffer(this)
  })
}

/** Bytes of a Blob or File from any realm (jsdom or node). */
export async function blobBytes(blob: Blob): Promise<Bytes> {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer())
  return await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer) as Bytes)
    r.onerror = () => reject(r.error)
    r.readAsArrayBuffer(blob)
  })
}

export const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i])

export function sampleContext(overrides: Record<string, unknown> = {}) {
  return {
    pageUrl: 'http://localhost/training',
    viewport: { width: 390, height: 844 },
    theme: { themeName: 'forest', mode: 'light' },
    buildVersion: 'build-7f3a2c1',
    consoleErrors: ['TypeError: timer is undefined', 'Failed to load /api/draft'],
    ...overrides,
  }
}

/** A bug report form as the sheet sends it. */
export function bugReport(screenshot?: FilePart, overrides: Fields = {}): Fields {
  return {
    category: 'bug',
    message: "Rest timer didn't start",
    pageUrl: 'http://localhost/training',
    userAgent: 'test-agent',
    context: JSON.stringify(sampleContext()),
    screenshot,
    ...overrides,
  }
}

export const png = (size?: number, seed?: number): FilePart => ({ bytes: pngBytes(size, seed), type: 'image/png', filename: 'shot.png' })
export const jpeg = (size?: number, seed?: number): FilePart => ({ bytes: jpegBytes(size, seed), type: 'image/jpeg', filename: 'shot.jpg' })
export const webp = (size?: number, seed?: number): FilePart => ({ bytes: webpBytes(size, seed), type: 'image/webp', filename: 'shot.webp' })

export function base64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}
