'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import CommunityProgramsView from '@/components/community/CommunityProgramsView'
import SavedWorkoutsList from '@/components/features/saved-workouts/SavedWorkoutsList'
import MyProgramsList from '@/components/programs/MyProgramsList'
import StrengthActivationModal from '@/components/StrengthActivationModal'
import { useToast } from '@/components/ToastProvider'
import PageTitle from '@/components/ui/PageTitle'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useProgramAccess } from '@/hooks/useCustomProgramAccess'
import { clientLogger } from '@/lib/client-logger'
import { type LibraryType, libraryHref, parseLibraryType } from '@/lib/library/links'

type StrengthProgram = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  isUserCreated: boolean
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
  communityPrograms: CommunityProgram[]
  currentUserId: string
  activeWeekInfo: { weekNumber: number; totalWeeks: number } | null
  programCount: number
  isAdmin: boolean
  customProgramLimitBypass: boolean
}

/**
 * The Library: WORKOUTS | PROGRAMS (`?type=`), and under Programs the
 * MY PROGRAMS | BROWSE switch (`?tab=browse`) with the `?cloning=` progress
 * flow that used to live on /programs.
 */
export default function LibraryView({
  strengthPrograms,
  communityPrograms,
  currentUserId,
  activeWeekInfo,
  programCount,
  isAdmin,
  customProgramLimitBypass,
}: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  // Default to Browse tab for first-time users (no programs yet) or when URL param says so
  const isNewUser = strengthPrograms.length === 0
  // The switches follow the address. A first-time user defaults to Browse; a
  // program being added (?cloning=) always shows My Programs.
  const tabFrom = (params: URLSearchParams): 'my' | 'browse' => {
    if (params.get('cloning')) return 'my'
    const tab = params.get('tab')
    if (tab === 'browse' || tab === 'my') return tab
    return isNewUser ? 'browse' : 'my'
  }
  const [libraryType, setLibraryType] = useState<LibraryType>(() => parseLibraryType(searchParams.get('type')))
  const [activeTab, setActiveTab] = useState<'my' | 'browse'>(() => tabFrom(searchParams))

  // Re-read the switches when the address changes from outside (the Library
  // tab, a link from the Workout sheet), but not for this view's own
  // replaceState writes, which already match the state.
  const search = searchParams.toString()
  const [seenSearch, setSeenSearch] = useState(search)
  const ownWrite = useRef<string | null>(null)
  if (search !== seenSearch) {
    setSeenSearch(search)
    if (search !== ownWrite.current) {
      setLibraryType(parseLibraryType(searchParams.get('type')))
      setActiveTab(tabFrom(searchParams))
    }
  }
  const writeUrl = (url: string) => {
    ownWrite.current = new URL(url, window.location.href).searchParams.toString()
    window.history.replaceState(null, '', url)
  }

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

  const { hasAccess, bypassLimit, maxPrograms } = useProgramAccess({
    programCount,
    isAdmin,
    customProgramLimitBypass,
  })

  const cleanupCloningState = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setCloningProgramId(null)
    writeUrl(libraryHref({ type: 'programs' }))
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
          setLibraryType('programs')
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps intentionally limited to searchParams and cloningProgramId
  useEffect(() => {
    const cloningId = searchParams.get('cloning')
    if (cloningId && completedClones.has(cloningId)) return

    if (cloningId && cloningId !== cloningProgramId) {
      setCloningProgramId(cloningId)
      setLibraryType('programs')
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

  const handleTypeChange = (type: LibraryType) => {
    setLibraryType(type)
    const url = new URL(window.location.href)
    url.searchParams.set('type', type)
    if (type === 'workouts') url.searchParams.delete('tab')
    else if (activeTab === 'browse' || isNewUser) url.searchParams.set('tab', activeTab)
    writeUrl(url.toString())
  }

  const handleTabChange = (tab: 'my' | 'browse') => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    if (tab === 'browse') {
      url.searchParams.set('tab', 'browse')
    } else if (isNewUser) {
      // Without it, a first-time user's default would be Browse again.
      url.searchParams.set('tab', 'my')
    } else {
      url.searchParams.delete('tab')
    }
    writeUrl(url.toString())
  }

  return (
    <div className="bg-background doom-page-enter">
      <div className="max-w-2xl mx-auto sm:px-6 py-4">
        {/* Header */}
        <div className="px-4 sm:px-0 mb-4">
          <PageTitle>LIBRARY</PageTitle>
        </div>

        {/* Content switch */}
        <div className="px-4 sm:px-0 mb-4">
          <SegmentedControl
            aria-label="Library content"
            tone="bold"
            options={[
              { value: 'workouts', label: 'Workouts' },
              { value: 'programs', label: 'Programs' },
            ]}
            value={libraryType}
            onChange={(next) => handleTypeChange(next)}
          />
        </div>

        {libraryType === 'workouts' ? (
          <div className="px-4 sm:px-0">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground doom-label">
              MY WORKOUTS
            </h2>
            <SavedWorkoutsList />
          </div>
        ) : (
          <>
            {/* Programs: mine or community */}
            <div className="px-4 sm:px-0 mb-4">
              <SegmentedControl
                aria-label="Programs view"
                options={[
                  { value: 'my', label: 'My Programs' },
                  { value: 'browse', label: 'Browse' },
                ]}
                value={activeTab}
                onChange={(next) => handleTabChange(next)}
              />
            </div>

            <div className="px-4 sm:px-0">
              {activeTab === 'my' ? (
                <MyProgramsList
                  programs={strengthPrograms}
                  cloningProgress={cloningProgress}
                  localCopyStatuses={localCopyStatuses}
                  deletedPrograms={deletedPrograms}
                  activeProgram={activeProgram ? { id: activeProgram.id, name: activeProgram.name } : null}
                  activeWeekInfo={activeWeekInfo}
                  programCount={programCount}
                  hasAccess={hasAccess}
                  bypassLimit={bypassLimit}
                  maxPrograms={maxPrograms}
                />
              ) : (
                <CommunityProgramsView
                  communityPrograms={communityPrograms}
                  currentUserId={currentUserId}
                  hasAccess={hasAccess}
                  maxPrograms={maxPrograms}
                />
              )}
            </div>
          </>
        )}
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
