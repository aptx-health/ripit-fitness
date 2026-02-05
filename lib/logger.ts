import pino from 'pino'

/**
 * Centralized logger using Pino
 *
 * Log levels (ordered by severity):
 * - trace: 10 - Very detailed debugging information
 * - debug: 20 - Detailed debugging information
 * - info: 30 - General informational messages (default)
 * - warn: 40 - Warning messages
 * - error: 50 - Error messages
 * - fatal: 60 - Fatal errors (application crash)
 *
 * Usage:
 * - In development: Set PINO_LOG_LEVEL=debug to see debug logs
 * - In production: Set PINO_LOG_LEVEL=info (default) to only see info/warn/error/fatal
 * - To disable all logging: Set PINO_LOG_LEVEL=silent
 *
 * Examples:
 * ```typescript
 * import { logger } from '@/lib/logger'
 *
 * logger.debug('Debugging info')
 * logger.info({ userId: '123' }, 'User logged in')
 * logger.warn({ count: 0 }, 'No items found')
 * logger.error({ err }, 'Failed to fetch data')
 * ```
 */
export const logger = pino({
  level: process.env.PINO_LOG_LEVEL || 'info',

  // Use pino-pretty for human-readable logs in development
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,

  // Format level as string instead of number
  formatters: {
    level: (label) => ({ level: label }),
  },
})

/**
 * Client-side logger for browser environments
 * Falls back to console methods since Pino requires Node.js
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
