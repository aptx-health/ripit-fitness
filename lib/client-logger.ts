/**
 * Client-side logger for browser environments
 * Lightweight wrapper around console methods with level control
 *
 * Usage:
 * ```typescript
 * import { clientLogger } from '@/lib/client-logger'
 *
 * clientLogger.debug('Debugging info')
 * clientLogger.info('User logged in')
 * clientLogger.warn('Connection unstable')
 * clientLogger.error('Error:', error)
 * ```
 *
 * Control via NEXT_PUBLIC_LOG_LEVEL:
 * - 'debug': Show all logs
 * - 'info': Show info/warn/error (default)
 * - 'silent': Disable all logs
 */
export const clientLogger = {
  debug: (...args: unknown[]) => {
    if (process.env.NEXT_PUBLIC_LOG_LEVEL === 'debug') {
      console.debug('[DEBUG]', ...args)
    }
  },
  info: (...args: unknown[]) => {
    if (process.env.NEXT_PUBLIC_LOG_LEVEL !== 'silent') {
      console.info('[INFO]', ...args)
    }
  },
  warn: (...args: unknown[]) => {
    if (process.env.NEXT_PUBLIC_LOG_LEVEL !== 'silent') {
      console.warn('[WARN]', ...args)
    }
  },
  error: (...args: unknown[]) => {
    if (process.env.NEXT_PUBLIC_LOG_LEVEL !== 'silent') {
      console.error('[ERROR]', ...args)
    }
  },
}
