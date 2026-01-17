/**
 * Mobile debugging logger that captures console logs and errors
 * for display on-screen when remote debugging isn't available
 */

export type LogEntry = {
  timestamp: Date
  level: 'log' | 'warn' | 'error'
  message: string
  data?: any
}

class MobileLogger {
  private logs: LogEntry[] = []
  private maxLogs = 100
  private listeners: Set<(logs: LogEntry[]) => void> = new Set()
  private sessionId: string
  private readonly STORAGE_KEY = 'mobile-debug-logs'

  constructor() {
    this.sessionId = new Date().toISOString()

    // Intercept console methods
    if (typeof window !== 'undefined') {
      // Load previous session logs from localStorage
      this.loadPreviousLogs()
      this.interceptConsole()
      this.interceptErrors()

      // Save logs to localStorage periodically
      setInterval(() => this.saveLogs(), 2000)

      // Save logs on page unload
      window.addEventListener('beforeunload', () => this.saveLogs())

      // Log page load type
      const perfNav = (performance as any).navigation
      const loadType = perfNav?.type === 1 ? 'RELOAD/REFRESH' :
                      perfNav?.type === 2 ? 'BACK/FORWARD' :
                      'NORMAL'
      console.log(`[MobileLogger] Page loaded - Type: ${loadType}, Session: ${this.sessionId}`)
    }
  }

  private loadPreviousLogs() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Add a separator showing previous session
        this.logs.push({
          timestamp: new Date(),
          level: 'warn',
          message: '========== PREVIOUS SESSION (before refresh) ==========',
        })
        // Restore previous logs with timestamps as Date objects
        parsed.forEach((log: any) => {
          this.logs.push({
            ...log,
            timestamp: new Date(log.timestamp)
          })
        })
        this.logs.push({
          timestamp: new Date(),
          level: 'warn',
          message: '========== NEW SESSION (after refresh) ==========',
        })
        console.log('[MobileLogger] Restored', parsed.length, 'logs from previous session')
      }
    } catch (error) {
      console.error('[MobileLogger] Failed to load previous logs:', error)
    }
  }

  private saveLogs() {
    try {
      // Only save the most recent logs (last 50) to avoid quota issues
      const logsToSave = this.logs.slice(-50)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logsToSave))
    } catch (error) {
      // Ignore quota errors
    }
  }

  private interceptConsole() {
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error

    console.log = (...args: any[]) => {
      originalLog.apply(console, args)
      this.addLog('log', this.formatMessage(args))
    }

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args)
      this.addLog('warn', this.formatMessage(args))
    }

    console.error = (...args: any[]) => {
      originalError.apply(console, args)
      this.addLog('error', this.formatMessage(args))
    }
  }

  private interceptErrors() {
    window.addEventListener('error', (event) => {
      this.addLog('error', `Uncaught error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', `Unhandled promise rejection: ${event.reason}`)
    })
  }

  private formatMessage(args: any[]): string {
    return args
      .map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      })
      .join(' ')
  }

  private addLog(level: LogEntry['level'], message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    }

    this.logs.push(entry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Notify listeners
    this.listeners.forEach(listener => listener([...this.logs]))
  }

  public subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.add(listener)
    // Send current logs immediately
    listener([...this.logs])

    return () => {
      this.listeners.delete(listener)
    }
  }

  public getLogs(): LogEntry[] {
    return [...this.logs]
  }

  public clear() {
    this.logs = []
    this.listeners.forEach(listener => listener([]))
  }

  public exportLogs(): string {
    return this.logs
      .map(log => {
        const time = log.timestamp.toISOString()
        const data = log.data ? `\n${JSON.stringify(log.data, null, 2)}` : ''
        return `[${time}] ${log.level.toUpperCase()}: ${log.message}${data}`
      })
      .join('\n\n')
  }
}

// Singleton instance
export const mobileLogger = new MobileLogger()
