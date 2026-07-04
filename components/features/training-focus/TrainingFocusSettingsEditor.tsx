'use client'

import { ArrowLeft, CheckCircle2, Save, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { clientLogger } from '@/lib/client-logger'
import type { RatioPresetId } from '@/lib/learning/ratio-presets'
import type { FauImportance } from '@/lib/user-training-profile'
import { FauImportanceEditor, type FauImportanceValue } from './FauImportanceEditor'

type Props = {
  initialImportance: FauImportance
  initialPreset: RatioPresetId | null
}

export default function TrainingFocusSettingsEditor({
  initialImportance,
  initialPreset,
}: Props) {
  const router = useRouter()
  const [value, setValue] = useState<FauImportanceValue>({
    fauImportance: initialImportance,
    fauImportancePreset: initialPreset,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleChange = (next: FauImportanceValue) => {
    setSaved(false)
    setValue(next)
  }

  const save = async () => {
    setIsSaving(true)
    setError(null)
    setSaved(false)
    try {
      const response = await fetch('/api/profile/training', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fauImportance: value.fauImportance,
          fauImportancePreset: value.fauImportancePreset,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save training focus')
      }
      setValue({
        fauImportance: data.profile.fauImportance,
        fauImportancePreset: data.profile.fauImportancePreset,
      })
      setSaved(true)
      window.setTimeout(() => {
        router.push('/settings')
      }, 650)
    } catch (err) {
      clientLogger.error('Failed to save training focus:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Link
              href="/settings"
              className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground doom-focus-ring hover:text-foreground"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Settings
            </Link>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">
              Training Focus
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Tell us which muscles matter most so suggestions lean your way.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            doom
            loading={isSaving}
            onClick={save}
          >
            <Save size={16} aria-hidden="true" className="mr-1.5" />
            Save
          </Button>
        </div>

        {(error || saved) && (
          <div
            role={error ? 'alert' : 'status'}
            className={`mb-5 flex items-start gap-3 border-2 p-3 text-sm font-semibold ${
              error
                ? 'border-error bg-error/10 text-error'
                : 'border-success bg-success/10 text-foreground'
            }`}
          >
            {error ? (
              <XCircle
                size={18}
                aria-hidden="true"
                className="mt-0.5 flex-shrink-0"
              />
            ) : (
              <CheckCircle2
                size={18}
                aria-hidden="true"
                className="mt-0.5 flex-shrink-0 text-success"
              />
            )}
            <span>{error || 'Training focus saved. Returning to settings.'}</span>
          </div>
        )}

        <section className="border-2 border-border bg-card p-4 sm:p-5 doom-corners">
          <FauImportanceEditor value={value} onChange={handleChange} />
        </section>
      </div>
    </main>
  )
}
