'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useReducer, useState } from 'react'
import CommunityProgramEditor from '@/components/admin/CommunityProgramEditor'

interface ProgramData {
  id: string
  name: string
  description: string
  level: string | null
  curated: boolean
  goals: string[]
  equipmentNeeded: string[]
  focusAreas: string[]
  targetDaysPerWeek: number | null
  weekCount: number
  workoutCount: number
  exerciseCount: number
  programData: Record<string, unknown>
}

export default function EditCommunityProgramPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [program, setProgram] = useState<ProgramData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, refresh] = useReducer((x: number) => x + 1, 0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey triggers re-fetch intentionally
  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/community-programs/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((json) => { if (!cancelled) { setProgram(json.data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Program not found'); setLoading(false) } })
    return () => { cancelled = true }
  }, [id, refreshKey])

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>
  if (error) return <div className="text-sm text-red-400">{error}</div>
  if (!program) return null

  return (
    <div>
      <h1 className="text-2xl font-bold uppercase tracking-wider mb-6">Edit Community Program</h1>
      <CommunityProgramEditor
        program={program}
        onSave={() => refresh()}
        onCancel={() => router.push('/admin/community-programs')}
      />
    </div>
  )
}
