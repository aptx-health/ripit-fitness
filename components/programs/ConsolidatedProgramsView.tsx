'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { clientLogger } from '@/lib/client-logger'
import StrengthActivationModal from '../StrengthActivationModal'
import ArchivedProgramsSection from './ArchivedProgramsSection'
import ProgramCard from './ProgramCard'
import {
  StrengthPrimaryActions,
  StrengthUtilityActions,
} from './StrengthActions'
import StrengthMetadata from './StrengthMetadata'

type StrengthProgram = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  copyStatus: string | null
}

type ConsolidatedProgramsViewProps = {
  strengthPrograms: StrengthProgram[]
  archivedStrengthCount: number
}

export default function ConsolidatedProgramsView({
  strengthPrograms,
  archivedStrengthCount,
}: ConsolidatedProgramsViewProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const toast = useToast()
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

  const cleanupCloningState = () => {
    // Clear the polling interval first
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
    if (completedClonesRef.current.has(programId)) {
      return false
    }

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

          const activeProgram = strengthPrograms.find(p => p.isActive && p.id !== programId)
          if (activeProgram) {
            setExistingActiveProgram({ id: activeProgram.id, name: activeProgram.name })
          }

          setActivationProgramId(programId)
          setShowActivationModal(true)

          cleanupCloningState()
          router.refresh()
        }
        return false
      }

      if (data.status === 'failed' || data.status === 'not_found') {
        handleCloneFailed(programId, data.error)
        return false
      }

      // Still cloning
      return true
    } catch (error) {
      clientLogger.error('Error checking copy status:', error)
      return true
    }
  }

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

  // On mount, resume polling for any programs already in cloning state
  useEffect(() => {
    const cloningPrograms = strengthPrograms.filter(p =>
      p.copyStatus === 'cloning' || p.copyStatus?.startsWith('cloning_week_')
    )

    // Resume polling for first cloning program found
    if (cloningPrograms.length > 0 && !cloningProgramId) {
      const programId = cloningPrograms[0].id
      if (!completedClones.has(programId)) {
        setCloningProgramId(programId)
        startPolling(programId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloningProgramId, completedClones.has, startPolling, strengthPrograms.filter]) // Only run on mount

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, cloningProgramId, completedClones.has, startPolling])

  // Sort programs: active first, then by creation date
  // Filter out locally deleted programs
  const sortedStrengthPrograms = [...strengthPrograms]
    .filter(p => !deletedPrograms.has(p.id))
    .sort((a, b) => {
      if (a.isActive && !b.isActive) return -1
      if (!a.isActive && b.isActive) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

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
                href="/programs/new"
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
        </div>

        {/* Programs List */}
        <div className="space-y-4">
          {sortedStrengthPrograms.length === 0 ? (
            <div className="bg-card border border-border p-12 text-center doom-noise doom-corners">
              <h2 className="text-xl font-semibold text-foreground mb-2 doom-heading uppercase">
                NO PROGRAMS YET
              </h2>
              <p className="text-muted-foreground mb-6">
                Create a new training program to get started
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
            />
          </div>
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
