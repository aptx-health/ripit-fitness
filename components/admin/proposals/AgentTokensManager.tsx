'use client'

import { Check, Copy } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { clientLogger } from '@/lib/client-logger'

interface AgentTokenRow {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

function when(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'
}

/**
 * List, create and revoke agent tokens. A new token's plaintext is shown once,
 * right after create, with a copy button; the server never returns it again.
 */
export default function AgentTokensManager() {
  const [tokens, setTokens] = useState<AgentTokenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [created, setCreated] = useState<{ name: string; token: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/agent-tokens')
      if (!res.ok) throw new Error(`Failed to load tokens (${res.status})`)
      const body = await res.json()
      setTokens(body.data)
    } catch (err) {
      clientLogger.error('[AgentTokensManager] load failed', err)
      setError('Failed to load tokens.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setCopied(false)
    try {
      const res = await fetch('/api/admin/agent-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? `Create failed (${res.status})`)
        return
      }
      setCreated({ name: body.data.record.name, token: body.data.token })
      setName('')
      await load()
    } catch (err) {
      clientLogger.error('[AgentTokensManager] create failed', err)
      setError('Network error. Try again.')
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (id: string) => {
    setRevoking(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/agent-tokens/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Revoke failed (${res.status})`)
        return
      }
      await load()
    } catch (err) {
      clientLogger.error('[AgentTokensManager] revoke failed', err)
      setError('Network error. Try again.')
    } finally {
      setRevoking(null)
    }
  }

  const copy = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.token)
      setCopied(true)
    } catch (err) {
      clientLogger.warn('[AgentTokensManager] clipboard write failed', err)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-card border-2 border-border p-4 space-y-3">
        <label htmlFor="token-name" className="doom-label text-secondary block">
          New token
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="token-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            placeholder="e.g. mac-claude"
            className="flex-1 min-w-0 h-10 px-3 bg-background border-2 border-input text-foreground"
          />
          <Button type="submit" doom loading={creating} disabled={!name.trim() || creating}>
            Create
          </Button>
        </div>
      </form>

      {created && (
        <div data-testid="new-token" className="border-2 border-warning-border bg-warning-muted p-4 space-y-2">
          <div className="text-sm font-semibold text-warning-text">
            Token for {created.name}. Copy it now; it will not be shown again.
          </div>
          <div className="flex items-stretch gap-2">
            <code className="flex-1 min-w-0 break-all text-sm bg-background text-foreground border border-border p-2">
              {created.token}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={copy} aria-label="Copy token">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="border-2 border-error-border bg-error-muted text-error-text p-3 text-sm">
          {error}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="doom-label text-secondary">Tokens ({tokens.length})</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground border-2 border-border bg-card p-4">No tokens yet.</p>
        ) : (
          <ul className="border-2 border-border divide-y divide-border">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-3 bg-card">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-sm font-semibold text-foreground break-words">
                    {t.name}
                    {t.revokedAt && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 border border-border text-muted-foreground uppercase">
                        Revoked
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {when(t.createdAt)} · Last used {when(t.lastUsedAt)}
                    {t.revokedAt && ` · Revoked ${when(t.revokedAt)}`}
                  </div>
                </div>
                {!t.revokedAt && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    loading={revoking === t.id}
                    disabled={!!revoking}
                    onClick={() => revoke(t.id)}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
