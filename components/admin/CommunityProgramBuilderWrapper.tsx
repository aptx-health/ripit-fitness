'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import ProgramBuilder from '@/components/ProgramBuilder'
import type { ExistingProgram } from '@/types/program-builder'
import { clientLogger } from '@/lib/client-logger'

interface CommunityProgramBuilderWrapperProps {
  communityProgramId: string
  communityProgramName: string
  tempProgramId: string
  existingProgram: ExistingProgram
}

export default function CommunityProgramBuilderWrapper({
  communityProgramId,
  communityProgramName: _communityProgramName,
  tempProgramId,
  existingProgram,
}: CommunityProgramBuilderWrapperProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSaveToCommunity = useCallback(async () => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/admin/community-programs/${communityProgramId}/save-from-builder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempProgramId }),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save')
        setSaving(false)
        return
      }

      router.push(`/admin/community-programs/${communityProgramId}/edit`)
    } catch (err) {
      clientLogger.error('Error saving community program:', err)
      setError('Failed to save community program')
      setSaving(false)
    }
  }, [communityProgramId, tempProgramId, router])

  const handleDiscard = useCallback(async () => {
    if (!confirm('Discard all changes to this community program structure?')) return

    setDiscarding(true)
    setError(null)

    try {
      await fetch(
        `/api/admin/community-programs/${communityProgramId}/discard-draft`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempProgramId }),
        }
      )

      router.push(`/admin/community-programs/${communityProgramId}/edit`)
    } catch (err) {
      clientLogger.error('Error discarding draft:', err)
      setError('Failed to discard draft')
      setDiscarding(false)
    }
  }, [communityProgramId, tempProgramId, router])

  return (
    <div>
      {error && (
        <div className="bg-red-900/30 border-2 border-red-700 p-3 mb-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Admin action bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={handleSaveToCommunity}
          disabled={saving || discarding}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold uppercase tracking-wider border-2 border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save to Community Program'}
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={saving || discarding}
          className="px-4 py-2 bg-muted hover:bg-secondary text-muted-foreground text-sm font-semibold uppercase tracking-wider border-2 border-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {discarding ? 'Discarding...' : 'Discard Draft'}
        </button>
      </div>

      <ProgramBuilder
        editMode={true}
        existingProgram={existingProgram}
        onComplete={handleSaveToCommunity}
      />
    </div>
  )
}
