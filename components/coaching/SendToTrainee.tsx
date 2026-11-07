'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Send, X } from 'lucide-react'
import { type CSSProperties, useEffect, useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { clientLogger } from '@/lib/client-logger'

export type Trainee = { linkId: string; name: string }

type Props = {
  kind: 'program' | 'saved_workout'
  sourceId: string
  /** Extra classes for the Send button, e.g. full width in a dialog footer. */
  className?: string
  /**
   * The trainees, when the page already has them (the program page from the
   * server, the saved-workout dialog from its detail). Without them the
   * component asks GET /api/coaching/trainees itself.
   */
  trainees?: Trainee[]
  /** Replaces the Send button's look, e.g. a Library row panel's panelButton(). */
  button?: { className: string; style?: CSSProperties }
}

const BUTTON =
  'inline-flex min-h-12 items-center justify-center gap-2 px-4 border-2 border-border bg-card text-foreground hover:bg-muted doom-focus-ring text-sm font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed'
const PRIMARY =
  'inline-flex min-h-12 items-center justify-center gap-2 px-4 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring text-sm font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed'

/** The refusal shown in the sheet, from the send route's code. */
function refusalText(name: string, body: { code?: string; missingExercises?: string[]; reason?: string }): string {
  if (body.code === 'invalid' && body.missingExercises?.length) {
    return `${name} doesn't have these exercises: ${body.missingExercises.join(', ')}`
  }
  if (body.code === 'invalid') return body.reason ? `Can't send this yet. ${body.reason}.` : "Can't send this as it is."
  if (body.code === 'duplicate') return `Already waiting for ${name} to decide.`
  if (body.code === 'not_linked') return `You're no longer linked with ${name}.`
  if (body.code === 'not_found') return 'This was deleted, so there is nothing to send.'
  return "Couldn't send. Check your connection and try again."
}

/**
 * Coaching slice 2: "Send to Sam" for one of the coach's own programs or saved
 * workouts. Renders nothing for a user who coaches nobody. With several
 * trainees, "Send to…" asks which one first. The sheet takes an optional note
 * (the trainee's "Why") and sends a copy for them to accept or decline.
 */
export default function SendToTrainee({ kind, sourceId, className = '', trainees: given, button }: Props) {
  const toast = useToast()
  const [loaded, setLoaded] = useState<Trainee[]>([])
  const trainees = given ?? loaded
  const [open, setOpen] = useState(false)
  const [trainee, setTrainee] = useState<Trainee | null>(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)

  useEffect(() => {
    if (given) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/coaching/trainees', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { trainees?: Trainee[] }
        if (!cancelled) setLoaded(data.trainees ?? [])
      } catch (err) {
        // No Send button is the safe fallback: nothing else on the page depends on it.
        clientLogger.error('Failed to load trainees', err)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [given])

  if (trainees.length === 0) return null
  const only = trainees.length === 1 ? trainees[0] : null

  const openSheet = () => {
    setTrainee(only)
    setNote('')
    setRefusal(null)
    setOpen(true)
  }

  const send = async () => {
    if (!trainee || sending) return
    setSending(true)
    setRefusal(null)
    try {
      const res = await fetch('/api/coaching/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId: trainee.linkId, kind, sourceId, ...(note.trim() && { note: note.trim() }) }),
      })
      const body = (await res.json().catch(() => ({}))) as { code?: string; missingExercises?: string[]; reason?: string }
      if (res.status === 201) {
        setOpen(false)
        toast.success(`Sent to ${trainee.name}`, 'They can accept or decline it.')
        return
      }
      setRefusal(res.status === 429 ? 'Too many sends. Try again later.' : refusalText(trainee.name, body))
    } catch (err) {
      clientLogger.error('Failed to send to trainee', err)
      setRefusal("Couldn't send. Check your connection and try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={openSheet}
        className={button ? button.className : `${BUTTON} ${className}`}
        style={button?.style}
      >
        <Send size={button ? 14 : 16} aria-hidden="true" />
        {only ? `Send to ${only.name}` : 'Send to…'}
      </button>
      <Dialog.Portal>
        <Dialog.Overlay
          className="backdrop-blur-sm bg-foreground/40"
          style={{ position: 'fixed', inset: 0, zIndex: 60 }}
        />
        <Dialog.Content
          aria-describedby={undefined}
          className="flex w-[calc(100vw-2rem)] max-w-md flex-col border-2 border-border bg-card shadow-xl"
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 61,
            maxHeight: 'calc(100dvh - 4rem)',
          }}
        >
          <div className="flex items-center gap-2 border-b border-border pl-4">
            <Dialog.Title className="flex-1 min-w-0 truncate text-lg font-bold uppercase tracking-wider text-foreground">
              {trainee ? `Send to ${trainee.name}` : 'Send to which trainee?'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex h-12 w-12 shrink-0 items-center justify-center text-foreground hover:bg-muted doom-focus-ring"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {trainee ? (
            <div className="space-y-3 overflow-y-auto p-4">
              <p className="text-sm text-muted-foreground">{trainee.name} will get a copy to accept or decline.</p>
              <div className="space-y-1">
                <label htmlFor="send-note" className="text-sm font-semibold text-foreground">
                  Note <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="send-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder={`Why this, for ${trainee.name}`}
                  className="block w-full border-2 border-border bg-background p-2 text-base text-foreground doom-focus-ring"
                />
              </div>
              {refusal && (
                <p role="alert" className="border-2 border-error bg-error/10 p-3 text-sm text-error break-words">
                  {refusal}
                </p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={send} disabled={sending} className={`${PRIMARY} flex-1`}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
                <Dialog.Close asChild>
                  <button type="button" className={BUTTON}>
                    Cancel
                  </button>
                </Dialog.Close>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-y-auto">
              {trainees.map((t) => (
                <li key={t.linkId}>
                  <button
                    type="button"
                    onClick={() => setTrainee(t)}
                    className="flex min-h-12 w-full items-center px-4 text-left text-base font-semibold text-foreground hover:bg-muted doom-focus-ring"
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
