'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ProgramCard from './ProgramCard'
import StrengthMetadata from './StrengthMetadata'
import CardioMetadata from './CardioMetadata'
import {
  StrengthPrimaryActions,
  StrengthUtilityActions,
} from './StrengthActions'
import {
  CardioPrimaryActions,
  CardioUtilityActions,
} from './CardioActions'
import ArchivedProgramsSection from './ArchivedProgramsSection'
import { useToast } from '@/components/ToastProvider'

type StrengthProgram = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  copyStatus: string | null
}

type CardioProgram = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  copyStatus: string | null
  weeks: Array<{
    id: string
    _count: {
      sessions: number
    }
  }>
}

type ConsolidatedProgramsViewProps = {
  strengthPrograms: StrengthProgram[]
  archivedStrengthCount: number
  cardioPrograms: CardioProgram[]
  archivedCardioCount: number
}

export default function ConsolidatedProgramsView({
  strengthPrograms,
  archivedStrengthCount,
  cardioPrograms,
  archivedCardioCount,
}: ConsolidatedProgramsViewProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const initialTab = searchParams.get('tab') === 'cardio' ? 'cardio' : 'strength'
  const [activeTab, setActiveTab] = useState<'strength' | 'cardio'>(initialTab)
  const [cloningProgramId, setCloningProgramId] = useState<string | null>(null)
  const [completedClones, setCompletedClones] = useState<Set<string>>(new Set())
  const [localCopyStatuses, setLocalCopyStatuses] = useState<Record<string, string>>({})
  const [cloningProgress, setCloningProgress] = useState<Record<string, { currentWeek: number; totalWeeks: number }>>({})
  const [deletedPrograms, setDeletedPrograms] = useState<Set<string>>(new Set())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const completedClonesRef = useRef<Set<string>>(new Set())

  // Sync state from URL on initial load or direct navigation (e.g., shared links)
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'cardio' || tab === 'strength') {
      setActiveTab(current => current === tab ? current : tab)
    }
  }, [searchParams])

  // On mount, resume polling for any programs already in cloning state
  useEffect(() => {
    const cloningPrograms = [
      ...strengthPrograms.filter(p =>
        p.copyStatus === 'cloning' || p.copyStatus?.startsWith('cloning_week_')
      ),
      ...cardioPrograms.filter(p =>
        p.copyStatus === 'cloning' || p.copyStatus?.startsWith('cloning_week_')
      )
    ]

    // Resume polling for first cloning program found
    if (cloningPrograms.length > 0 && !cloningProgramId) {
      const programId = cloningPrograms[0].id
      if (!completedClones.has(programId)) {
        setCloningProgramId(programId)
        startPolling(programId)
      }
    }
  }, []) // Only run on mount

  // Poll for cloning status if programId is in URL
  useEffect(() => {
    const cloningId = searchParams.get('cloning')

    // Don't start polling if already completed
    if (cloningId && completedClones.has(cloningId)) {
      return
    }

    if (cloningId && cloningId !== cloningProgramId) {
      setCloningProgramId(cloningId)
      startPolling(cloningId)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [searchParams])

  const startPolling = async (programId: string) => {
    // Check immediately
    const shouldContinue = await checkCopyStatus(programId)

    if (!shouldContinue) {
      return
    }

    // Then poll every 2 seconds
    const intervalId = setInterval(async () => {
      const shouldContinue = await checkCopyStatus(programId)

      if (!shouldContinue) {
        clearInterval(intervalId)
        // Also clear the ref if it still exists
        if (pollingIntervalRef.current === intervalId) {
          pollingIntervalRef.current = null
        }
      }
    }, 2000)

    // Store in ref for external cleanup
    pollingIntervalRef.current = intervalId
  }

  const checkCopyStatus = async (programId: string): Promise<boolean> => {
    // Don't check again if we've already completed this clone (use ref for synchronous check)
    if (completedClonesRef.current.has(programId)) {
      return false
    }

    try {
      const response = await fetch(`/api/programs/${programId}/copy-status`)

      if (!response.ok) {
        // Program not found - likely failed and was deleted
        if (!completedClonesRef.current.has(programId)) {
          completedClonesRef.current.add(programId)
          setCompletedClones(prev => new Set(prev).add(programId))
          setDeletedPrograms(prev => new Set(prev).add(programId))
          toast.error('Failed to copy program', 'The program cloning failed. Please try again.')
          cleanupCloningState()
          router.refresh()
        }
        return false
      }

      const data = await response.json()

      // Update progress info if available
      if (data.progress) {
        setCloningProgress(prev => ({ ...prev, [programId]: data.progress }))
      }

      if (data.status === 'ready') {
        // Cloning complete!
        if (!completedClonesRef.current.has(programId)) {
          completedClonesRef.current.add(programId)
          setCompletedClones(prev => new Set(prev).add(programId))
          // Update local state immediately so card updates
          setLocalCopyStatuses(prev => ({ ...prev, [programId]: 'ready' }))
          // Clear progress info
          setCloningProgress(prev => {
            const updated = { ...prev }
            delete updated[programId]
            return updated
          })
          toast.success('Program added!', `${data.name} has been added to your programs.`)

          // Clean up URL and stop polling
          cleanupCloningState()

          // Refresh to get latest data - completedClones check will prevent re-polling
          router.refresh()
        }
        return false
      }

      if (data.status === 'not_found') {
        // Program was deleted (cloning failed)
        if (!completedClonesRef.current.has(programId)) {
          completedClonesRef.current.add(programId)
          setCompletedClones(prev => new Set(prev).add(programId))
          setDeletedPrograms(prev => new Set(prev).add(programId))
          toast.error('Failed to copy program', 'The program cloning failed. Please try again.')
          cleanupCloningState()
          router.refresh()
        }
        return false
      }

      // Still cloning
      return true
    } catch (error) {
      console.error('Error checking copy status:', error)
      // Continue polling on error
      return true
    }
  }

  const cleanupCloningState = () => {
    // Clear the polling interval first
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    setCloningProgramId(null)

    // Use current activeTab state instead of reading from URL
    // This prevents overwriting user's manual tab switches
    window.history.replaceState(null, '', `/programs?tab=${activeTab}`)

    // Note: We keep localCopyStatuses to preserve the 'ready' state
    // It will be cleared on next full page load
  }

  const handleTabChange = (tab: 'strength' | 'cardio') => {
    // Update state immediately for instant UI response
    setActiveTab(tab)
    // Update URL without going through Next.js router (avoids routing overhead)
    window.history.replaceState(null, '', `/programs?tab=${tab}`)
  }

  const isStrengthTab = activeTab === 'strength'

  // Sort programs: active first, then by creation date
  // Filter out locally deleted programs
  const sortedStrengthPrograms = [...strengthPrograms]
    .filter(p => !deletedPrograms.has(p.id))
    .sort((a, b) => {
      if (a.isActive && !b.isActive) return -1
      if (!a.isActive && b.isActive) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  const sortedCardioPrograms = [...cardioPrograms]
    .filter(p => !deletedPrograms.has(p.id))
    .sort((a, b) => {
      if (a.isActive && !b.isActive) return -1
      if (!a.isActive && b.isActive) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  // URL for create button changes based on active tab
  const createProgramUrl = isStrengthTab
    ? '/programs/new'
    : '/cardio/programs/create'

  return (
    <div className="min-h-screen bg-background doom-page-enter">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground doom-title uppercase tracking-wider">
                PROGRAMS
              </h1>
              <p className="text-muted-foreground mt-1">
                Create and manage your training programs
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={createProgramUrl}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider text-sm text-center whitespace-nowrap"
              >
                CREATE PROGRAM
              </Link>
              <Link
                href="/community"
                className="px-4 py-2 border-2 border-accent text-accent hover:bg-accent-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider text-sm text-center whitespace-nowrap"
              >
                COMMUNITY
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b border-border">
            <button
              onClick={() => handleTabChange('strength')}
              className={`pb-3 font-bold text-lg uppercase tracking-wider transition-colors ${
                isStrengthTab
                  ? 'text-primary border-b-4 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              STRENGTH
            </button>
            <button
              onClick={() => handleTabChange('cardio')}
              className={`pb-3 font-bold text-lg uppercase tracking-wider transition-colors ${
                !isStrengthTab
                  ? 'text-primary border-b-4 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              CARDIO
            </button>
          </div>
        </div>

        {/* Strength Tab Content - always rendered, hidden when not active */}
        <div className={isStrengthTab ? '' : 'hidden'}>
          <div className="space-y-4">
            {sortedStrengthPrograms.length === 0 ? (
              <div className="bg-card border border-border p-12 text-center doom-noise doom-corners">
                <h2 className="text-xl font-semibold text-foreground mb-2 doom-heading uppercase">
                  NO STRENGTH PROGRAMS YET
                </h2>
                <p className="text-muted-foreground mb-6">
                  Create a new strength training program to get started
                </p>
                <Link
                  href="/programs/new"
                  className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
                >
                  CREATE YOUR FIRST PROGRAM
                </Link>
              </div>
            ) : (
              sortedStrengthPrograms.map((program) => {
                // Use local copy status if available, otherwise use prop value
                const copyStatus = localCopyStatuses[program.id] ?? program.copyStatus
                const progress = cloningProgress[program.id]

                return (
                  <ProgramCard
                    key={program.id}
                    isActive={program.isActive}
                    name={program.name}
                    description={program.description}
                    copyStatus={copyStatus}
                    cloningProgress={progress}
                    metadata={<StrengthMetadata />}
                    primaryActions={
                      <StrengthPrimaryActions
                        programId={program.id}
                        isActive={program.isActive}
                        copyStatus={copyStatus}
                      />
                    }
                    utilityActionsDesktop={
                      <StrengthUtilityActions
                        programId={program.id}
                        programName={program.name}
                        isActive={program.isActive}
                      />
                    }
                    utilityActionsMobile={
                      <StrengthUtilityActions
                        programId={program.id}
                        programName={program.name}
                        isActive={program.isActive}
                        isMobile={true}
                      />
                    }
                  />
                )
              })
            )}
          </div>
          {archivedStrengthCount > 0 && (
            <div className="mt-6">
              <ArchivedProgramsSection
                count={archivedStrengthCount}
                programType="strength"
              />
            </div>
          )}
        </div>

        {/* Cardio Tab Content - always rendered, hidden when not active */}
        <div className={isStrengthTab ? 'hidden' : ''}>
          <div className="space-y-4">
            {sortedCardioPrograms.length === 0 ? (
              <div className="bg-card border border-border p-12 text-center doom-noise doom-corners">
                <h2 className="text-xl font-semibold text-foreground mb-2 doom-heading uppercase">
                  NO CARDIO PROGRAMS YET
                </h2>
                <p className="text-muted-foreground mb-6">
                  Create a new cardio training program to get started
                </p>
                <Link
                  href="/cardio/programs/create"
                  className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
                >
                  CREATE YOUR FIRST PROGRAM
                </Link>
              </div>
            ) : (
              sortedCardioPrograms.map((program) => {
                const weekCount = program.weeks.length
                const sessionCount = program.weeks.reduce(
                  (sum, w) => sum + w._count.sessions,
                  0
                )

                // Use local copy status if available, otherwise use prop value
                const copyStatus = localCopyStatuses[program.id] ?? program.copyStatus
                const progress = cloningProgress[program.id]

                return (
                  <ProgramCard
                    key={program.id}
                    isActive={program.isActive}
                    name={program.name}
                    description={program.description}
                    copyStatus={copyStatus}
                    cloningProgress={progress}
                    metadata={
                      <CardioMetadata
                        weekCount={weekCount}
                        sessionCount={sessionCount}
                      />
                    }
                    primaryActions={
                      <CardioPrimaryActions
                        programId={program.id}
                        isActive={program.isActive}
                        copyStatus={copyStatus}
                      />
                    }
                    utilityActionsDesktop={
                      <CardioUtilityActions
                        programId={program.id}
                        programName={program.name}
                        isActive={program.isActive}
                      />
                    }
                    utilityActionsMobile={
                      <CardioUtilityActions
                        programId={program.id}
                        programName={program.name}
                        isActive={program.isActive}
                        isMobile={true}
                      />
                    }
                  />
                )
              })
            )}
          </div>
          {archivedCardioCount > 0 && (
            <div className="mt-6">
              <ArchivedProgramsSection
                count={archivedCardioCount}
                programType="cardio"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
