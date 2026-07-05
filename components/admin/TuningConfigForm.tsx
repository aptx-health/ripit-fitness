'use client'

import { RotateCcw, Save } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { clientLogger } from '@/lib/client-logger'
import type { KnobMeta, TuningConfig } from '@/lib/tuning/config'

interface ConfigResponse {
  config: TuningConfig
  defaults: TuningConfig
  knobs: KnobMeta[]
}

/** Format a number without trailing float noise (e.g. 0.985, 8, 0.3). */
function fmt(n: number): string {
  return Number.isFinite(n) ? String(n) : ''
}

/**
 * Admin form for the TuningConfig knob set (issue #937). Each knob shows its
 * current value, code default, valid range, and downstream-effect copy. Ranges
 * are enforced server-side on save; the inputs mirror them for fast feedback.
 * Reset-to-defaults loads the code defaults into the form (unsaved until Save).
 */
export function TuningConfigForm() {
  const [knobs, setKnobs] = useState<KnobMeta[]>([])
  const [defaults, setDefaults] = useState<TuningConfig | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const hydrate = useCallback((data: ConfigResponse) => {
    setKnobs(data.knobs)
    setDefaults(data.defaults)
    const next: Record<string, string> = {}
    for (const knob of data.knobs) {
      next[knob.key] = fmt(data.config[knob.key])
    }
    setValues(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/tuning-config')
        if (!res.ok) throw new Error(`Failed to load config (${res.status})`)
        const body = await res.json()
        if (!cancelled) hydrate(body.data as ConfigResponse)
      } catch (err) {
        clientLogger.error('[TuningConfigForm] load failed', err)
        if (!cancelled) setError('Failed to load tuning config.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrate])

  const setValue = (key: string, raw: string) => {
    setValues((prev) => ({ ...prev, [key]: raw }))
    setSaved(false)
  }

  const resetToDefaults = () => {
    if (!defaults) return
    const next: Record<string, string> = {}
    for (const knob of knobs) next[knob.key] = fmt(defaults[knob.key])
    setValues(next)
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payload: Record<string, number> = {}
      for (const knob of knobs) {
        const num = Number(values[knob.key])
        if (!Number.isFinite(num)) {
          throw new Error(`${knob.label} must be a number`)
        }
        payload[knob.key] = num
      }
      const res = await fetch('/api/admin/tuning-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = Array.isArray(body?.details) ? body.details.join('; ') : body?.error
        throw new Error(detail || `Save failed (${res.status})`)
      }
      setSaved(true)
    } catch (err) {
      clientLogger.error('[TuningConfigForm] save failed', err)
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading tuning config…</p>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="border-2 border-error bg-error/10 text-error text-sm px-3 py-2">
          {error}
        </div>
      )}
      {saved && (
        <div className="border-2 border-success bg-success/10 text-success text-sm px-3 py-2">
          Tuning config saved. Effective on the next recompute + suggestion.
        </div>
      )}

      <div className="space-y-3">
        {knobs.map((knob) => {
          const current = values[knob.key] ?? ''
          const def = defaults ? fmt(defaults[knob.key]) : ''
          const isDefault = current === def
          return (
            <div
              key={knob.key}
              className="border-2 border-border bg-card p-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start"
            >
              <div className="min-w-0">
                <label
                  htmlFor={`knob-${knob.key}`}
                  className="text-sm font-bold text-foreground"
                >
                  {knob.label}
                </label>
                <p className="text-xs text-muted-foreground mt-1">{knob.effect}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Code default: <span className="font-mono text-foreground">{def}</span>{' '}
                  · Range:{' '}
                  <span className="font-mono text-foreground">
                    {knob.min}–{knob.max}
                  </span>
                  {knob.integer ? ' (integer)' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                <input
                  id={`knob-${knob.key}`}
                  type="number"
                  inputMode="decimal"
                  step={knob.step}
                  min={knob.min}
                  max={knob.max}
                  value={current}
                  onChange={(e) => setValue(knob.key, e.target.value)}
                  className="w-32 px-3 py-2 bg-input border-2 border-border text-foreground font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {!isDefault && (
                  <span className="text-[10px] uppercase tracking-wider text-warning font-bold">
                    overridden
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" onClick={save} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save config'}
        </Button>
        <Button variant="secondary" onClick={resetToDefaults} disabled={saving}>
          <RotateCcw size={16} /> Reset to defaults
        </Button>
      </div>
    </div>
  )
}
