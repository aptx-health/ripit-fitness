'use client'

import { Check, Copy, KeyRound, Plus, Server } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SettingsBlock } from '@/components/settings/SettingsBlock'
import PaperTabTitle from '@/components/ui/PaperTabTitle'
import SubpageHeader from '@/components/ui/SubpageHeader'
import { useMounted } from '@/hooks/useMounted'
import { AGENT_TOKEN_NAME_MAX, type AgentTokenView, MAX_ACTIVE_AGENT_TOKENS } from '@/lib/agent-token-view'
import { clientLogger } from '@/lib/client-logger'

/**
 * Settings → Agent access: the MCP address, the user's agent tokens, and
 * creating and revoking them. A new token's secret is shown once, in this
 * component's state only, so leaving or reloading the page hides it for good.
 * Laid out like the other settings subpages (Muscle Balance).
 */

type Token = Omit<AgentTokenView, 'createdAt' | 'revokedAt'> & { createdAt: string; revokedAt: string | null }

/** Where keyboard focus goes after the revoke confirmation closes. */
type FocusAfter = { to: 'cancel' } | { to: 'revoke-button'; id: string } | { to: 'list' }

const button =
  'inline-flex min-h-12 items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold uppercase tracking-wider doom-focus-ring disabled:opacity-50 disabled:cursor-not-allowed'

function TokenDate({ iso }: { iso: string }) {
  const mounted = useMounted()
  const d = new Date(iso)
  return (
    <time dateTime={d.toISOString()}>
      {mounted ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null}
    </time>
  )
}

export default function AgentAccess({ mcpUrl }: { mcpUrl: string }) {
  const [tokens, setTokens] = useState<Token[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const busy = useRef(false)

  // Focus targets for the revoke confirmation, applied after the render that shows them.
  const cancelButton = useRef<HTMLButtonElement | null>(null)
  const revokeButtons = useRef(new Map<string, HTMLButtonElement>())
  const listHeading = useRef<HTMLHeadingElement | null>(null)
  const focusAfter = useRef<FocusAfter | null>(null)

  useEffect(() => {
    const target = focusAfter.current
    if (!target) return
    focusAfter.current = null
    if (target.to === 'cancel') cancelButton.current?.focus()
    else if (target.to === 'revoke-button') revokeButtons.current.get(target.id)?.focus()
    else listHeading.current?.focus()
  })

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-tokens')
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      setTokens(((await res.json()) as { tokens: Token[] }).tokens)
      setLoadError(null)
    } catch (err) {
      clientLogger.error('Failed to load agent tokens', err)
      setLoadError("Couldn't load your tokens. Reload to try again.")
      setTokens([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const active = (tokens ?? []).filter((t) => !t.revokedAt).length
  const atLimit = active >= MAX_ACTIVE_AGENT_TOKENS

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || tokens === null || atLimit || busy.current) return
    busy.current = true
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/agent-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status !== 201 || typeof body.secret !== 'string') {
        setCreateError(typeof body.error === 'string' ? body.error : "Couldn't create the token. Please try again.")
        return
      }
      setSecret(body.secret)
      setCopied(false)
      setName('')
      setTokens((prev) => [{ ...body.token, revokedAt: null }, ...(prev ?? [])])
    } catch (err) {
      clientLogger.error('Failed to create agent token', err)
      setCreateError("Couldn't create the token. Check your connection and try again.")
    } finally {
      busy.current = false
      setCreating(false)
    }
  }

  const askToRevoke = (id: string) => {
    focusAfter.current = { to: 'cancel' }
    setConfirming(id)
  }

  const cancelRevoke = (id: string) => {
    focusAfter.current = { to: 'revoke-button', id }
    setConfirming(null)
  }

  const revoke = async (token: Token) => {
    if (busy.current) return
    busy.current = true
    setRevoking(token.id)
    setRevokeError(null)
    try {
      const res = await fetch(`/api/agent-tokens/${token.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const { token: updated } = (await res.json()) as { token: Token }
      focusAfter.current = { to: 'list' }
      setTokens((prev) => (prev ?? []).map((t) => (t.id === updated.id ? updated : t)))
      setConfirming(null)
    } catch (err) {
      clientLogger.error('Failed to revoke agent token', err)
      setRevokeError(`Couldn't revoke ${token.name}. Please try again.`)
    } finally {
      busy.current = false
      setRevoking(null)
    }
  }

  const copy = async () => {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
    } catch {
      // Clipboard blocked: the box is selectable, so the token can still be copied by hand.
    }
  }

  return (
    <div>
      <SubpageHeader
        title="Agent access"
        intro="Connect your own AI agent, like Claude. It reads your training data and makes suggestions, which you review on Training before anything changes."
      />

      <div className="space-y-6">
        <SettingsBlock title="MCP address" icon={<Server size={16} />}>
          <p className="px-4 py-3 font-mono text-sm break-all text-foreground">{mcpUrl}</p>
        </SettingsBlock>

        <section aria-label="Your tokens">
          <div className="flex items-end">
            <PaperTabTitle
              tone="quiet"
              icon={<KeyRound size={16} />}
              count={tokens === null ? undefined : active}
              countLabel={`${active} active ${active === 1 ? 'token' : 'tokens'}`}
              asChild
            >
              <h2 ref={listHeading} tabIndex={-1} className="outline-none">
                Your tokens
              </h2>
            </PaperTabTitle>
          </div>
          <div className="folder-box border border-border bg-card divide-y divide-border">
            <div className="space-y-3 px-4 py-3">
              {tokens === null ? (
                <p className="text-sm text-muted-foreground">Loading your tokens…</p>
              ) : (
                <form onSubmit={create} className="flex gap-2">
                  <label className="sr-only" htmlFor="agent-token-name">
                    Name
                  </label>
                  <input
                    id="agent-token-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={AGENT_TOKEN_NAME_MAX}
                    placeholder="Name, e.g. Claude on my laptop"
                    disabled={atLimit}
                    className="min-h-12 min-w-0 flex-1 border-2 border-border bg-input px-3 py-2 text-sm doom-focus-ring disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={atLimit || creating}
                    className={`${button} border border-border text-foreground hover:bg-muted`}
                  >
                    <Plus size={14} aria-hidden="true" />
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                </form>
              )}
              {atLimit && (
                <p className="text-sm text-muted-foreground">
                  You have {MAX_ACTIVE_AGENT_TOKENS} active tokens, the limit. Revoke one to create another.
                </p>
              )}
              {createError && (
                <p role="alert" className="text-sm text-error">
                  {createError}
                </p>
              )}
              {secret && (
                <div className="space-y-2 border-l-4 border-primary bg-primary/10 p-3">
                  <p className="text-sm font-semibold text-foreground">{"Copy it now; you won't see it again."}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={secret}
                      aria-label="Your new token"
                      onFocus={(e) => e.currentTarget.select()}
                      className="min-w-0 flex-1 border border-border bg-muted px-3 py-2 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={copy}
                      className={`${button} border-2 border-border text-foreground hover:bg-muted`}
                    >
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
            {loadError && (
              <p role="alert" className="px-4 py-3 text-sm text-error">
                {loadError}
              </p>
            )}
            {revokeError && (
              <p role="alert" className="px-4 py-3 text-sm text-error">
                {revokeError}
              </p>
            )}
            {tokens && tokens.length === 0 && !loadError && (
              <p className="px-4 py-5 text-sm text-muted-foreground">No tokens yet.</p>
            )}
            {tokens && tokens.length > 0 && (
              <ul className="divide-y divide-border">
                {tokens.map((token) => (
                  <li key={token.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate">{token.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Created <TokenDate iso={token.createdAt} />
                        </p>
                      </div>
                      {token.revokedAt ? (
                        <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Revoked
                        </span>
                      ) : (
                        confirming !== token.id && (
                          <button
                            type="button"
                            ref={(el) => {
                              if (el) revokeButtons.current.set(token.id, el)
                              else revokeButtons.current.delete(token.id)
                            }}
                            onClick={() => askToRevoke(token.id)}
                            aria-label={`Revoke ${token.name}`}
                            className={`${button} shrink-0 border-2 border-error/50 text-error hover:bg-error/10`}
                          >
                            Revoke
                          </button>
                        )
                      )}
                    </div>
                    {confirming === token.id && !token.revokedAt && (
                      <div className="mt-2 flex items-center gap-2">
                        <p className="flex-1 text-sm font-semibold text-foreground">Revoke {token.name}?</p>
                        <button
                          type="button"
                          onClick={() => revoke(token)}
                          disabled={revoking === token.id}
                          className={`${button} bg-error text-error-foreground`}
                        >
                          Revoke
                        </button>
                        <button
                          type="button"
                          ref={cancelButton}
                          onClick={() => cancelRevoke(token.id)}
                          className={`${button} border-2 border-border text-foreground hover:bg-muted`}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
