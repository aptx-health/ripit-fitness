'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { clientLogger } from '@/lib/client-logger'
import { EQUIPMENT_LABELS } from '@/lib/constants/program-metadata'
import { FAU_DISPLAY_NAMES } from '@/lib/fau-volume'
import ExerciseDefinitionEditorModal from './ExerciseDefinitionEditorModal'

type QuickEditData = {
  name: string
  instructions: string
  notes: string
  primaryFAUs: string[]
  secondaryFAUs: string[]
  equipment: string[]
}

type Props = {
  isOpen: boolean
  onClose: () => void
  exerciseId: string
  /** 'workout' shows "Save & Return to Workout" and calls onSaved to hand control back to the caller. */
  context: 'workout' | 'admin'
  onSaved?: () => void
}

export default function QuickEditExerciseSheet({ isOpen, onClose, exerciseId, context, onSaved }: Props) {
  const [data, setData] = useState<QuickEditData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showFullEditor, setShowFullEditor] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setData(null)
      setShowFullEditor(false)
      return
    }
    setIsLoading(true)
    fetch(`/api/admin/exercise-definitions/${exerciseId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setData({
            name: json.data.name,
            instructions: json.data.instructions ?? '',
            notes: json.data.notes ?? '',
            primaryFAUs: json.data.primaryFAUs ?? [],
            secondaryFAUs: json.data.secondaryFAUs ?? [],
            equipment: json.data.equipment ?? [],
          })
        }
      })
      .catch((err) => clientLogger.error('Failed to load exercise for quick edit', err))
      .finally(() => setIsLoading(false))
  }, [isOpen, exerciseId])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!data) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/exercise-definitions/${exerciseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: data.instructions, notes: data.notes }),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      onSaved?.()
      onClose()
    } catch (err) {
      clientLogger.error('Failed to save quick edit', err)
    } finally {
      setIsSaving(false)
    }
  }

  const chips = data ? [
    ...data.primaryFAUs.map((f) => FAU_DISPLAY_NAMES[f] || f),
    ...data.secondaryFAUs.map((f) => FAU_DISPLAY_NAMES[f] || f),
    ...data.equipment.map((e) => EQUIPMENT_LABELS[e] || e),
  ] : []

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close quick edit"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(58,40,23,0.55)' }}
      />

      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-card border-t-[3px] border-primary">
        <div className="flex justify-center pt-2">
          <div className="w-11 h-1 bg-border" />
        </div>

        <div className="flex items-start justify-between px-4 pt-2 pb-3 border-b-2 border-border">
          <div>
            <div className="doom-label text-secondary">Quick Edit</div>
            <div className="doom-heading text-xl text-foreground">{data?.name ?? ' '}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-[34px] h-[34px] flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {isLoading || !data ? (
            <p className="text-sm text-muted-foreground uppercase tracking-wider py-8 text-center">
              Loading&hellip;
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="quick-edit-description" className="block doom-label text-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  id="quick-edit-description"
                  value={data.instructions}
                  onChange={(e) => setData({ ...data, instructions: e.target.value })}
                  maxLength={1000}
                  className="w-full min-h-[84px] px-3 py-2 border-2 border-primary bg-background text-foreground focus:outline-none"
                  placeholder="How to perform this exercise..."
                />
              </div>

              <div>
                <label htmlFor="quick-edit-cues" className="block doom-label text-foreground mb-1.5">
                  Cues
                </label>
                <textarea
                  id="quick-edit-cues"
                  value={data.notes}
                  onChange={(e) => setData({ ...data, notes: e.target.value })}
                  maxLength={400}
                  className="w-full min-h-[56px] px-3 py-2 border-2 border-border bg-background text-foreground focus:outline-none focus:border-primary"
                  placeholder="Coaching cues or tips..."
                />
              </div>

              <div>
                <div className="doom-label text-foreground mb-1.5">Muscles &amp; Equipment</div>
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((chip, i) => (
                    <span
                      key={`${chip}-${i}`}
                      className="px-2 py-1 text-xs font-semibold uppercase tracking-wide bg-muted text-muted-foreground border border-border"
                    >
                      {chip}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowFullEditor(true)}
                    className="px-2 py-1 text-xs font-semibold uppercase tracking-wide border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    + Edit all fields
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-4 pb-4 pt-2 border-t-2 border-border space-y-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!data || isSaving}
            className="doom-button-3d w-full h-[54px] bg-primary text-primary-foreground font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : context === 'workout' ? 'Save & Return to Workout' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-[46px] text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Cancel
          </button>
        </div>
      </div>

      {showFullEditor && (
        <ExerciseDefinitionEditorModal
          isOpen={showFullEditor}
          onClose={() => setShowFullEditor(false)}
          mode="edit"
          exerciseId={exerciseId}
          apiBasePath="/api/admin/exercise-definitions"
          showImages
          onSuccess={() => {
            setShowFullEditor(false)
            onSaved?.()
            onClose()
          }}
        />
      )}
    </div>,
    document.body
  )
}
