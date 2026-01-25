'use client'

import { useState, useEffect } from 'react'
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

type StrengthProgram = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
}

type CardioProgram = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
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
  const initialTab = searchParams.get('tab') === 'cardio' ? 'cardio' : 'strength'
  const [activeTab, setActiveTab] = useState<'strength' | 'cardio'>(initialTab)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'cardio' || tab === 'strength') {
      // Only update if different to prevent unnecessary re-renders
      setActiveTab(current => current === tab ? current : tab)
    }
  }, [searchParams])


  const handleTabChange = (tab: 'strength' | 'cardio') => {
    // Don't update state here - let the URL change trigger the useEffect
    // This prevents double state updates and potential loops
    router.push(`/programs?tab=${tab}`, { scroll: false })
  }

  const isStrengthTab = activeTab === 'strength'

  // Sort programs: active first, then by creation date
  const sortedStrengthPrograms = [...strengthPrograms].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const sortedCardioPrograms = [...cardioPrograms].sort((a, b) => {
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
            <Link
              href={createProgramUrl}
              className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              CREATE PROGRAM
            </Link>
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
              sortedStrengthPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  isActive={program.isActive}
                  name={program.name}
                  description={program.description}
                  metadata={<StrengthMetadata />}
                  primaryActions={
                    <StrengthPrimaryActions
                      programId={program.id}
                      isActive={program.isActive}
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
              ))
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

                return (
                  <ProgramCard
                    key={program.id}
                    isActive={program.isActive}
                    name={program.name}
                    description={program.description}
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
