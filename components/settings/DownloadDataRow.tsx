'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import { ROW, ROW_LABEL, RowIcon } from './SettingsBlock'

type Status = 'idle' | 'busy' | 'failed' | 'limited'

const DESCRIPTIONS: Record<Status, string> = {
  idle: 'All your training as one JSON file',
  busy: 'Preparing your file…',
  failed: "Couldn't download. Try again.",
  limited: 'Too many downloads. Try again in a few minutes.',
}

/**
 * Download my data: fetches GET /api/me/export and saves it under the name the
 * route gives (ripit-export-YYYY-MM-DD.json). Fetched rather than linked, so
 * the row says it is working while a large file is built.
 */
export default function DownloadDataRow() {
  const [status, setStatus] = useState<Status>('idle')

  async function download() {
    setStatus('busy')
    try {
      const res = await fetch('/api/me/export')
      if (res.status === 429) {
        setStatus('limited')
        return
      }
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const name = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'ripit-export.json'
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Revoke later: some browsers read the blob after click() returns.
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setStatus('idle')
    } catch (err) {
      clientLogger.error('Data export download failed', err)
      setStatus('failed')
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={status === 'busy'}
      aria-busy={status === 'busy'}
      className={`${ROW} hover:bg-muted/50 disabled:cursor-wait`}
    >
      <RowIcon>
        <Download size={18} />
      </RowIcon>
      <span className="min-w-0 flex-1">
        <span className={ROW_LABEL}>Download my data</span>
        <span className="block text-sm text-muted-foreground" aria-live="polite">
          {DESCRIPTIONS[status]}
        </span>
      </span>
    </button>
  )
}
