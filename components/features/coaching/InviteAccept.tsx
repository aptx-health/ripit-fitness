'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import { INVITE_BUTTON, INVITE_BUTTON_PRIMARY } from './invite-styles'

const REFUSED: Record<string, string> = {
  invalid: 'This invite is no longer valid',
  self: "You can't coach yourself",
  already_linked: "You're already linked with this coach.",
}

/** Accept / No thanks on a valid invite, for a signed-in user. */
export default function InviteAccept({ token }: { token: string }) {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)

  const accept = async () => {
    if (busy.current) return
    busy.current = true
    setAccepting(true)
    setError(null)
    try {
      const res = await fetch('/api/coaching/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(REFUSED[body.code] ?? "Couldn't accept the invite. Please try again.")
        return
      }
      router.push('/settings/coaching')
    } catch (err) {
      clientLogger.error('Failed to accept coach invite', err)
      setError("Couldn't accept the invite. Check your connection and try again.")
    } finally {
      busy.current = false
      setAccepting(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={accept} disabled={accepting} className={INVITE_BUTTON_PRIMARY}>
          {accepting ? 'Accepting…' : 'Accept'}
        </button>
        <button type="button" onClick={() => router.push('/')} disabled={accepting} className={INVITE_BUTTON}>
          No thanks
        </button>
      </div>
    </div>
  )
}
