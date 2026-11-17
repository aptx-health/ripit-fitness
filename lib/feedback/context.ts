/** What a bug report records about the screen it was sent from. */
export interface BugContext {
  pageUrl: string
  viewport: { width: number; height: number }
  theme: { themeName: string; mode: string }
  buildVersion: string
  consoleErrors: string[]
}

export const MAX_CONSOLE_ERRORS = 10
const MAX_TEXT = 2000

const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

/**
 * The context as stored: only the known fields, each with its expected type,
 * so a client can't store anything else. Null when it isn't an object.
 */
export function parseBugContext(raw: unknown): BugContext | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const c = raw as Record<string, unknown>
  const viewport = obj(c.viewport)
  const theme = obj(c.theme)
  const errors = Array.isArray(c.consoleErrors) ? c.consoleErrors.filter((e) => typeof e === 'string') : []
  return {
    pageUrl: str(c.pageUrl),
    viewport: { width: num(viewport.width), height: num(viewport.height) },
    theme: { themeName: str(theme.themeName), mode: str(theme.mode) },
    buildVersion: str(c.buildVersion),
    consoleErrors: errors.slice(-MAX_CONSOLE_ERRORS).map(str),
  }
}
