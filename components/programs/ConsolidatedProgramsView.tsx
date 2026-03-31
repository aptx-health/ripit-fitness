'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import CommunityProgramsView from '@/components/community/CommunityProgramsView'
import { useToast } from '@/components/ToastProvider'
import { clientLogger } from '@/lib/client-logger'
import StrengthActivationModal from '../StrengthActivationModal'
import ActiveProgramStrip from './ActiveProgramStrip'
import ArchivedProgramsSection from './ArchivedProgramsSection'
import MyProgramsList from './MyProgramsList'

type StrengthProgram = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  copyStatus: string | null
  targetDaysPerWeek: number | null
  _count: { weeks: number }
}

type CommunityProgram = {
  id: string
  name: string
  description: string
  programType: string
  authorUserId: string | null
  displayName: string
  publishedAt: Date
  weekCount: number
  workoutCount: number
  exerciseCount: number
  goals: string[]
  level: string | null
  durationDisplay: string | null
  targetDaysPerWeek: number | null
  equipmentNeeded: string[]
  focusAreas: string[]
}

type Props = {
  strengthPrograms: StrengthProgram[]
  archivedStrengthCount: number
  communityPrograms: CommunityProgram[]
  currentUserId: string
  activeWeekInfo: { weekNumber: number; totalWeeks: number } | null
}

export default function ConsolidatedProgramsView({
  strengthPrograms,
  archivedStrengthCount,
  communityPrograms,
  currentUserId,
  activeWeekInfo,
}: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const toast = useToast()

  // Tab state
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'my' | 'browse'>(tabParam === 'browse' ? 'browse' : 'my')

  // Cloning state
  const [cloningProgramId, setCloningProgramId] = useState<string | null>(null)
  const [completedClones, setCompletedClones] = useState<Set<string>>(new Set())
  const [localCopyStatuses, setLocalCopyStatuses] = useState<Record<string, string>>({})
  const [cloningProgress, setCloningProgress] = useState<Record<string, { currentWeek: number; totalWeeks: number }>>({})
  const [deletedPrograms, setDeletedPrograms] = useState<Set<string>>(new Set())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const completedClonesRef = useRef<Set<string>>(new Set())

  // Activation modal state
  const [showActivationModal, setShowActivationModal] = useState(false)
  const [activationProgramId, setActivationProgramId] = useState<string | null>(null)
  const [existingActiveProgram, setExistingActiveProgram] = useState<{ id: string; name: string } | null>(null)

  const activeProgram = strengthPrograms.find(p => p.isActive)

  const cleanupCloningState = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setCloningProgramId(null)
    window.history.replaceState(null, '', '/programs')
  }

  const handleCloneFailed = (programId: string, message?: string) => {
    if (completedClonesRef.current.has(programId)) return
    completedClonesRef.current.add(programId)
    setCompletedClones(prev => new Set(prev).add(programId))
    setDeletedPrograms(prev => new Set(prev).add(programId))
    toast.error('Failed to copy program', message || 'The program cloning failed. Please try again.')
    cleanupCloningState()
    router.refresh()
  }

  const checkCopyStatus = async (programId: string): Promise<boolean> => {
    if (completedClonesRef.current.has(programId)) return false

    try {
      const response = await fetch(`/api/programs/${programId}/copy-status`)
      if (!response.ok) {
        handleCloneFailed(programId)
        return false
      }

      const data = await response.json()

      if (data.progress) {
        setCloningProgress(prev => ({ ...prev, [programId]: data.progress }))
      }

      if (data.status === 'ready') {
        if (!completedClonesRef.current.has(programId)) {
          completedClonesRef.current.add(programId)
          setCompletedClones(prev => new Set(prev).add(programId))
          setLocalCopyStatuses(prev => ({ ...prev, [programId]: 'ready' }))
          setCloningProgress(prev => {
            const updated = { ...prev }
            delete updated[programId]
            return updated
          })

          const existingActive = strengthPrograms.find(p => p.isActive && p.id !== programId)
          if (existingActive) {
            setExistingActiveProgram({ id: existingActive.id, name: existingActive.name })
          }

          setActivationProgramId(programId)
          setShowActivationModal(true)
          setActiveTab('my')
          cleanupCloningState()
          router.refresh()
        }
        return false
      }

      if (data.status === 'failed' || data.status === 'not_found') {
        handleCloneFailed(programId, data.error)
        return false
      }

      return true
    } catch (error) {
      clientLogger.error('Error checking copy status:', error)
      return true
    }
  }

  const startPolling = async (programId: string) => {
    const shouldContinue = await checkCopyStatus(programId)
    if (!shouldContinue) return

    const intervalId = setInterval(async () => {
      const shouldContinue = await checkCopyStatus(programId)
      if (!shouldContinue) {
        clearInterval(intervalId)
        if (pollingIntervalRef.current === intervalId) {
          pollingIntervalRef.current = null
        }
      }
    }, 2000)

    pollingIntervalRef.current = intervalId
  }

  // Resume polling for cloning programs on mount
  useEffect(() => {
    const cloningPrograms = strengthPrograms.filter(p =>
      p.copyStatus === 'cloning' || p.copyStatus?.startsWith('cloning_week_')
    )
    if (cloningPrograms.length > 0 && !cloningProgramId) {
      const programId = cloningPrograms[0].id
      if (!completedClones.has(programId)) {
        setCloningProgramId(programId)
        startPolling(programId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll for cloning status from URL param (after adding from community)
  useEffect(() => {
    const cloningId = searchParams.get('cloning')
    if (cloningId && completedClones.has(cloningId)) return

    if (cloningId && cloningId !== cloningProgramId) {
      setCloningProgramId(cloningId)
      setActiveTab('my')
      startPolling(cloningId)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, cloningProgramId])

  const handleTabChange = (tab: 'my' | 'browse') => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    if (tab === 'browse') {
      url.searchParams.set('tab', 'browse')
    } else {
      url.searchParams.delete('tab')
    }
    window.history.replaceState(null, '', url.toString())
  }

  return (
    <div className="min-h-screen bg-background doom-page-enter">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        {/* Header */}
        <div className="px-4 sm:px-0 mb-4">
          <h1 className="text-4xl font-bold text-foreground doom-title uppercase tracking-wider">
            PROGRAMS
          </h1>
        </div>

        {/* Active Program Strip */}
        <div className="px-4 sm:px-0 mb-4">
          {activeProgram ? (
            <ActiveProgramStrip
              programId={activeProgram.id}
              programName={activeProgram.name}
              currentWeek={activeWeekInfo?.weekNumber ?? null}
              totalWeeks={activeWeekInfo?.totalWeeks ?? null}
            />
          ) : (
            <div className="border border-border border-l-4 border-l-muted-foreground bg-card doom-noise p-3 sm:p-4">
              <p className="text-sm text-muted-foreground">
                No active program — activate or browse one below
              </p>
            </div>
          )}
        </div>

        {/* Tab Toggle */}
        <div className="px-4 sm:px-0 mb-4">
          <div className="flex border border-border">
            <button
              type="button"
              onClick={() => handleTabChange('my')}
              className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors doom-focus-ring ${
                activeTab === 'my'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              MY PROGRAMS
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('browse')}
              className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors doom-focus-ring ${
                activeTab === 'browse'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              BROWSE
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 sm:px-0">
          {activeTab === 'my' ? (
            <div className="space-y-4">
              <MyProgramsList
                programs={strengthPrograms}
                cloningProgress={cloningProgress}
                localCopyStatuses={localCopyStatuses}
                deletedPrograms={deletedPrograms}
                hasActiveProgram={!!activeProgram}
              />

              {archivedStrengthCount > 0 && (
                <ArchivedProgramsSection count={archivedStrengthCount} />
              )}
            </div>
          ) : (
            <CommunityProgramsView
              communityPrograms={communityPrograms}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </div>

      {/* Activation Modal */}
      {showActivationModal && activationProgramId && (
        <StrengthActivationModal
          programId={activationProgramId}
          existingActiveProgram={existingActiveProgram}
          onClose={() => {
            setShowActivationModal(false)
            setActivationProgramId(null)
            setExistingActiveProgram(null)
          }}
        />
      )}
    </div>
  )
}
