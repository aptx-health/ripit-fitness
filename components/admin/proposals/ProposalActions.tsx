'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { clientLogger } from '@/lib/client-logger'

type Action = 'approve' | 'reject' | 'revert'

const DONE_COPY: Record<Action, string> = {
  approve: 'Approved and applied.',
  reject: 'Rejected.',
  revert: 'Reverted.',
}

interface Outcome {
  ok: boolean
  message: string
  code?: string
}

/**
 * Approve / Reject (pending) or Revert (applied, unless `canRevert` is false). Shows the service result
 * code and error text on refusal, then refreshes the server-rendered page. With `approveWarning`,
 * Approve first shows the warning and asks to confirm.
 */
export default function ProposalActions({
  id,
  status,
  canRevert = true,
  approveWarning,
}: {
  id: string
  status: string
  canRevert?: boolean
  approveWarning?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<Action | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [confirming, setConfirming] = useState(false)

  const run = async (action: Action) => {
    setBusy(action)
    setConfirming(false)
    setOutcome(null)
    try {
      const res = await fetch(`/api/admin/proposals/${id}/${action}`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setOutcome({ ok: true, message: DONE_COPY[action] })
      } else {
        setOutcome({ ok: false, code: body.code, message: body.error ?? `Request failed (${res.status})` })
      }
      router.refresh()
    } catch (err) {
      clientLogger.error('[ProposalActions] request failed', err)
      setOutcome({ ok: false, message: 'Network error. Try again.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === 'pending' && (
          <>
            <Button
              variant="success"
              doom
              loading={busy === 'approve'}
              disabled={!!busy}
              onClick={() => (approveWarning && !confirming ? setConfirming(true) : run('approve'))}
            >
              {confirming ? 'Confirm approve' : 'Approve'}
            </Button>
            <Button variant="secondary" doom loading={busy === 'reject'} disabled={!!busy} onClick={() => run('reject')}>
              Reject
            </Button>
          </>
        )}
        {status === 'applied' && canRevert && (
          <Button variant="outline" doom loading={busy === 'revert'} disabled={!!busy} onClick={() => run('revert')}>
            Revert
          </Button>
        )}
      </div>

      {confirming && approveWarning && (
        <p role="alert" data-testid="approve-warning" className="border-2 border-warning-border bg-warning-muted text-warning-text p-3 text-sm">
          {approveWarning}
        </p>
      )}

      {outcome && (
        <div
          role={outcome.ok ? 'status' : 'alert'}
          data-testid="proposal-outcome"
          className={`border-2 p-3 text-sm ${
            outcome.ok
              ? 'bg-success-muted border-success-border text-success-text'
              : 'bg-error-muted border-error-border text-error-text'
          }`}
        >
          {outcome.code && <span className="font-bold uppercase tracking-wider mr-2">{outcome.code}</span>}
          {outcome.message}
        </div>
      )}
    </div>
  )
}
