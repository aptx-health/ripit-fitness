'use client'

import { Check, Copy, Link2, Plus, UserRound, Users } from 'lucide-react'
import { useRef, useState } from 'react'
import { OUTLINE_BUTTON, SettingsBlock } from '@/components/settings/SettingsBlock'
import SubpageHeader from '@/components/ui/SubpageHeader'
import { useMounted } from '@/hooks/useMounted'
import { clientLogger } from '@/lib/client-logger'

/**
 * Settings → Coaching: make an invite link, the open invites (expiry, Revoke),
 * your trainees and your coach (End, after a confirm). A new link is shown once,
 * in this component's state only; only its hash is stored, so a lost link
 * means making a new invite. Laid out like Agent access.
 */

export interface CoachingInvite {
  id: string
  expiresAt: string
}

export interface SentRow {
  name: string
  kind: 'program' | 'saved_workout'
  sentAt: string
  status: 'pending' | 'accepted' | 'declined'
}

export interface CoachingPerson {
  linkId: string
  name: string
  linkedAt: string
  /** For a trainee: what the coach sent them, newest first. */
  sent?: SentRow[]
}

const SENT_KIND = { program: 'Program', saved_workout: 'Workout' } as const
const SENT_STATUS = {
  pending: { label: 'Pending', className: 'border-border text-muted-foreground' },
  accepted: { label: 'Accepted', className: 'border-success text-success' },
  declined: { label: 'Declined', className: 'border-error/50 text-error' },
} as const

/** What the coach sent this trainee: name, kind, date and status. Nothing about their own training. */
function SentList({ name, sent }: { name: string; sent: SentRow[] }) {
  return (
    <div className="mt-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sent</p>
      <ul aria-label={`Sent to ${name}`} className="mt-1 divide-y divide-border border-l-2 border-border">
        {sent.map((row, i) => (
          <li key={i} className="flex items-center gap-2 py-2 pl-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground">
                {SENT_KIND[row.kind]} · <ShortDate iso={row.sentAt} />
              </p>
            </div>
            <span
              className={`shrink-0 border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${SENT_STATUS[row.status].className}`}
            >
              {SENT_STATUS[row.status].label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const DANGER_BUTTON =
  'inline-flex min-h-12 items-center justify-center gap-1.5 px-4 border-2 border-error/50 text-error hover:bg-error/10 doom-focus-ring text-sm font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed'
const CONFIRM_BUTTON =
  'inline-flex min-h-12 items-center justify-center gap-1.5 px-4 bg-error text-error-foreground doom-focus-ring text-sm font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed'

function ShortDate({ iso, year = false }: { iso: string; year?: boolean }) {
  const mounted = useMounted()
  const d = new Date(iso)
  return (
    <time dateTime={d.toISOString()}>
      {mounted ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year && { year: 'numeric' }) }) : null}
    </time>
  )
}

export default function Coaching({
  invites: initialInvites,
  trainees: initialTrainees,
  coaches: initialCoaches,
}: {
  invites: CoachingInvite[]
  trainees: CoachingPerson[]
  coaches: CoachingPerson[]
}) {
  const [invites, setInvites] = useState(initialInvites)
  const [trainees, setTrainees] = useState(initialTrainees)
  const [coaches, setCoaches] = useState(initialCoaches)
  const [newLink, setNewLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)

  const run = async (key: string, work: () => Promise<void>, failure: string) => {
    if (busy.current) return
    busy.current = true
    setPending(key)
    setError(null)
    try {
      await work()
    } catch (err) {
      clientLogger.error(failure, err)
      setError(`${failure}. Please try again.`)
    } finally {
      busy.current = false
      setPending(null)
    }
  }

  const createInvite = () =>
    run(
      'create',
      async () => {
        setCreating(true)
        try {
          const res = await fetch('/api/coaching/invites', { method: 'POST' })
          const body = await res.json().catch(() => ({}))
          if (res.status !== 201 || typeof body.invite?.token !== 'string') {
            throw new Error(`Request failed (${res.status})`)
          }
          setNewLink(`${window.location.origin}/coach/invite/${body.invite.token}`)
          setCopied(false)
          setInvites((prev) => [{ id: body.invite.id, expiresAt: body.invite.expiresAt }, ...prev])
        } finally {
          setCreating(false)
        }
      },
      "Couldn't make an invite"
    )

  const revoke = (invite: CoachingInvite) =>
    run(
      invite.id,
      async () => {
        const res = await fetch(`/api/coaching/invites/${invite.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        setInvites((prev) => prev.filter((i) => i.id !== invite.id))
      },
      "Couldn't revoke the invite"
    )

  const end = (person: CoachingPerson) =>
    run(
      person.linkId,
      async () => {
        const res = await fetch(`/api/coaching/links/${person.linkId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const keep = (list: CoachingPerson[]) => list.filter((p) => p.linkId !== person.linkId)
        setTrainees(keep)
        setCoaches(keep)
        setConfirming(null)
      },
      "Couldn't end the link"
    )

  const copy = async () => {
    if (!newLink) return
    try {
      await navigator.clipboard.writeText(newLink)
      setCopied(true)
    } catch {
      // Clipboard blocked: the box is selectable, so the link can still be copied by hand.
    }
  }

  const personRow = (person: CoachingPerson, label: React.ReactNode, endLabel: string) => (
    <li key={person.linkId} className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {label}
          <p className="text-sm text-muted-foreground">
            Linked <ShortDate iso={person.linkedAt} year />
          </p>
        </div>
        {confirming !== person.linkId && (
          <button
            type="button"
            onClick={() => setConfirming(person.linkId)}
            aria-label={`End link with ${person.name}`}
            className={`${DANGER_BUTTON} shrink-0`}
          >
            End
          </button>
        )}
      </div>
      {person.sent && person.sent.length > 0 && <SentList name={person.name} sent={person.sent} />}
      {confirming === person.linkId && (
        <div className="mt-2 space-y-2">
          <p className="text-sm font-semibold text-foreground">{endLabel}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => end(person)}
              disabled={pending === person.linkId}
              className={CONFIRM_BUTTON}
            >
              End link
            </button>
            <button type="button" onClick={() => setConfirming(null)} className={OUTLINE_BUTTON}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  )

  return (
    <div>
      <SubpageHeader
        title="Coaching"
        intro="Invite someone you coach with a link. Once they accept, you can send them programs and workouts to accept or decline."
      />

      <div className="space-y-6">
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <SettingsBlock title="Invites" icon={<Link2 size={16} />}>
          <div className="space-y-3 px-4 py-3">
            <button type="button" onClick={createInvite} disabled={creating} className={OUTLINE_BUTTON}>
              <Plus size={14} aria-hidden="true" />
              {creating ? 'Making a link…' : 'Invite a trainee'}
            </button>
            {newLink && (
              <div className="space-y-2 border-l-4 border-primary bg-primary/10 p-3">
                <p className="text-sm font-semibold text-foreground">
                  {"Expires in 7 days. Copy it now; you won't see it again."}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={newLink}
                    aria-label="Your invite link"
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 border border-border bg-muted px-3 py-2 font-mono text-xs"
                  />
                  <button type="button" onClick={copy} className={`${OUTLINE_BUTTON} shrink-0`}>
                    {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <span role="status" aria-live="polite" className="sr-only">
                  {copied ? 'Copied' : ''}
                </span>
              </div>
            )}
          </div>
          {invites.length > 0 && (
            <ul className="divide-y divide-border" aria-label="Open invites">
              {invites.map((invite) => (
                <li key={invite.id} className="flex items-center gap-3 px-4 py-3">
                  <p className="min-w-0 flex-1 text-sm text-foreground">
                    Open invite · Expires <ShortDate iso={invite.expiresAt} />
                  </p>
                  <button
                    type="button"
                    onClick={() => revoke(invite)}
                    disabled={pending === invite.id}
                    className={`${DANGER_BUTTON} shrink-0`}
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SettingsBlock>

        <SettingsBlock title="Trainees" icon={<Users size={16} />}>
          {trainees.length === 0 ? (
            <p className="px-4 py-5 text-sm text-muted-foreground">No trainees yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {trainees.map((t) =>
                personRow(
                  t,
                  <p className="font-bold text-foreground truncate">{t.name}</p>,
                  `End your link with ${t.name}? What you already sent stays with them.`
                )
              )}
            </ul>
          )}
        </SettingsBlock>

        {coaches.length > 0 && (
          <SettingsBlock title="Coach" icon={<UserRound size={16} />}>
            <ul className="divide-y divide-border">
              {coaches.map((c) =>
                personRow(
                  c,
                  <p className="font-bold text-foreground truncate">Your coach: {c.name}</p>,
                  `End your link with ${c.name}? Suggestions already sent stay for you to accept or decline.`
                )
              )}
            </ul>
          </SettingsBlock>
        )}
      </div>
    </div>
  )
}
