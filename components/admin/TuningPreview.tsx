'use client'

import { Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { clientLogger } from '@/lib/client-logger'
import type { KnobMeta, TuningConfig } from '@/lib/tuning/config'

interface Subject {
  userId: string
  label: string
}

interface PreviewResult {
  payload: unknown
  configStamp: TuningConfig
  savedConfig: TuningConfig
}

function fmt(n: number): string {
  return Number.isFinite(n) ? String(n) : ''
}

/**
 * TuningConfig payload-preview UI (issue #937). Pick a subject (self or a
 * synthetic archetype), adjust knobs ephemerally, and render the exact payload
 * the builder would produce. Shows the effective config stamp (what #921 embeds
 * into requestPayload) and a saved-vs-override knob diff.
 */
export function TuningPreview() {
  const [knobs, setKnobs] = useState<KnobMeta[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectId, setSubjectId] = useState<string>('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [savedConfig, setSavedConfig] = useState<TuningConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PreviewResult | null>(null)

  const seedValues = useCallback((config: TuningConfig, knobList: KnobMeta[]) => {
    const next: Record<string, string> = {}
    for (const knob of knobList) next[knob.key] = fmt(config[knob.key])
    setValues(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [cfgRes, subjRes] = await Promise.all([
          fetch('/api/admin/tuning-config'),
          fetch('/api/admin/tuning-config/preview'),
        ])
        if (!cfgRes.ok || !subjRes.ok) throw new Error('Failed to load preview inputs')
        const cfgBody = await cfgRes.json()
        const subjBody = await subjRes.json()
        if (cancelled) return
        const knobList: KnobMeta[] = cfgBody.data.knobs
        const config: TuningConfig = cfgBody.data.config
        setKnobs(knobList)
        setSavedConfig(config)
        seedValues(config, knobList)
        const list: Subject[] = [
          subjBody.data.self,
          ...subjBody.data.archetypes.map((a: { userId: string; label: string }) => ({
            userId: a.userId,
            label: a.label,
          })),
        ]
        setSubjects(list)
        setSubjectId(list[0]?.userId ?? '')
      } catch (err) {
        clientLogger.error('[TuningPreview] load failed', err)
        if (!cancelled) setError('Failed to load preview inputs.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [seedValues])

  const resetOverrides = () => {
    if (savedConfig) seedValues(savedConfig, knobs)
  }

  const run = async () => {
    setRunning(true)
    setError(null)
    try {
      const config: Record<string, number> = {}
      for (const knob of knobs) config[knob.key] = Number(values[knob.key])
      const res = await fetch('/api/admin/tuning-config/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: subjectId, config }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = Array.isArray(body?.details) ? body.details.join('; ') : body?.error
        throw new Error(detail || `Preview failed (${res.status})`)
      }
      setResult(body.data as PreviewResult)
    } catch (err) {
      clientLogger.error('[TuningPreview] run failed', err)
      setError(err instanceof Error ? err.message : 'Preview failed.')
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading preview…</p>
  }

  const changedKnobs = result
    ? knobs.filter((k) => result.configStamp[k.key] !== result.savedConfig[k.key])
    : []

  return (
    <div className="space-y-4">
      {error && (
        <div className="border-2 border-error bg-error/10 text-error text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="border-2 border-border bg-card p-4 space-y-4">
        <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
          <label htmlFor="subject" className="text-sm font-bold text-foreground">
            Subject
          </label>
          <select
            id="subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full sm:max-w-md px-3 py-2 bg-input border-2 border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {subjects.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {knobs.map((knob) => (
            <div key={knob.key} className="min-w-0">
              <label
                htmlFor={`preview-${knob.key}`}
                className="text-xs font-semibold text-muted-foreground block truncate"
                title={knob.label}
              >
                {knob.label}
              </label>
              <input
                id={`preview-${knob.key}`}
                type="number"
                inputMode="decimal"
                step={knob.step}
                min={knob.min}
                max={knob.max}
                value={values[knob.key] ?? ''}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, [knob.key]: e.target.value }))
                }}
                className="mt-1 w-full px-2 py-1.5 bg-input border-2 border-border text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={run} disabled={running || !subjectId}>
            <Play size={16} /> {running ? 'Rendering…' : 'Generate preview'}
          </Button>
          <Button variant="secondary" onClick={resetOverrides} disabled={running}>
            <RotateCcw size={16} /> Reset to saved
          </Button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="border-2 border-border bg-card p-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Config stamp
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Effective knobs this payload was built with (#921 embeds this into
              <span className="font-mono"> requestPayload</span>).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {knobs.map((k) => {
                const changed = changedKnobs.some((c) => c.key === k.key)
                return (
                  <span
                    key={k.key}
                    className={`text-xs font-mono px-2 py-1 border-2 ${
                      changed
                        ? 'border-warning text-warning'
                        : 'border-border text-muted-foreground'
                    }`}
                    title={changed ? `saved: ${result.savedConfig[k.key]}` : undefined}
                  >
                    {k.key}={result.configStamp[k.key]}
                    {changed ? ` (was ${result.savedConfig[k.key]})` : ''}
                  </span>
                )
              })}
            </div>
            {changedKnobs.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                No overrides — this matches the saved config.
              </p>
            )}
          </div>

          <div className="border-2 border-border bg-card p-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Payload
            </h2>
            <pre className="mt-2 text-xs font-mono text-foreground overflow-auto max-h-[60vh] whitespace-pre-wrap break-words">
              {JSON.stringify(result.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
