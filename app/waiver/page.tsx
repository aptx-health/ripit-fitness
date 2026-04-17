'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CURRENT_WAIVER_VERSION, WAIVER_TEXT } from '@/lib/constants/waiver'

/**
 * Waiver acceptance screen.
 *
 * Displayed when the user has not yet accepted the current waiver version.
 * The actual UI will be refined in #472; this is a functional placeholder
 * that wires up the backend acceptance flow.
 */
export default function WaiverPage() {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setAccepting(true)
    setError(null)

    try {
      const res = await fetch('/api/waiver/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waiverVersion: CURRENT_WAIVER_VERSION }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to accept waiver')
        return
      }

      // Navigate to the main app now that acceptance is stored
      router.push('/')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg">
        <h1 className="mb-4 text-xl font-bold text-foreground">
          Waiver &amp; Assumption of Risk
        </h1>
        <p className="mb-2 text-xs text-muted-foreground">
          Version {CURRENT_WAIVER_VERSION}
        </p>
        <div className="mb-6 max-h-64 overflow-y-auto rounded border border-border bg-muted p-4 text-sm text-foreground whitespace-pre-wrap">
          {WAIVER_TEXT}
        </div>
        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}
        <button
          type="button"
          onClick={handleAccept}
          disabled={accepting}
          className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {accepting ? 'Submitting...' : 'I Agree'}
        </button>
      </div>
    </div>
  )
}
