import { getThemePreference } from '@/lib/theme'
import { type BugContext, MAX_CONSOLE_ERRORS } from './context'

const MAX_ERROR_LENGTH = 500

const recent: string[] = []
let installed = false

function describe(arg: unknown): string {
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`
  if (typeof arg === 'string') return arg
  try {
    return JSON.stringify(arg) ?? String(arg)
  } catch {
    return String(arg)
  }
}

/** Records console.error calls for bug reports, keeping the last 10. Calling it again does nothing. */
export function installConsoleErrorCapture(): void {
  if (installed || typeof console === 'undefined') return
  installed = true
  const original = console.error
  console.error = (...args: unknown[]) => {
    recent.push(args.map(describe).join(' ').slice(0, MAX_ERROR_LENGTH))
    if (recent.length > MAX_CONSOLE_ERRORS) recent.splice(0, recent.length - MAX_CONSOLE_ERRORS)
    original.apply(console, args)
  }
}

/** The page, screen, theme, build and recent console errors, for a bug report. */
export function collectBugContext(): BugContext {
  const { themeName, mode } = getThemePreference()
  return {
    pageUrl: window.location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    theme: { themeName, mode },
    buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION || 'dev',
    consoleErrors: [...recent],
  }
}
