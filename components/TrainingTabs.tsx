'use client'

import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import StrengthWeekView from '@/components/StrengthWeekView'
import WorkoutHistoryList from '@/components/WorkoutHistoryList'

type WeekData = {
  program: {
    id: string
    name: string
  }
  week: {
    id: string
    weekNumber: number
    workouts: Array<{
      id: string
      name: string
      dayNumber: number
      completions: Array<{
        id: string
        status: string
        completedAt: Date
      }>
      _count: {
        exercises: number
      }
    }>
  }
  totalWeeks: number
}

type Props = {
  weekData: WeekData | null
  historyCount: number
}

export default function TrainingTabs({ weekData, historyCount }: Props) {
  const [activeTab, setActiveTab] = useState('current')

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
      <Tabs.List className="flex border-b border-border mb-4">
        <Tabs.Trigger
          value="current"
          className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'current'
              ? 'text-accent border-b-2 border-accent -mb-px'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Current
        </Tabs.Trigger>
        <Tabs.Trigger
          value="history"
          className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'history'
              ? 'text-accent border-b-2 border-accent -mb-px'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          History
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="current">
        {weekData ? (
          <StrengthWeekView
            programId={weekData.program.id}
            programName={weekData.program.name}
            week={weekData.week}
            totalWeeks={weekData.totalWeeks}
          />
        ) : (
          <NoActiveProgram type="strength" />
        )}
      </Tabs.Content>

      <Tabs.Content value="history">
        {/* Only render when tab is active - enables lazy loading */}
        {activeTab === 'history' && (
          <WorkoutHistoryList count={historyCount} />
        )}
      </Tabs.Content>
    </Tabs.Root>
  )
}

function NoActiveProgram({ type }: { type: 'strength' | 'cardio' }) {
  const href = type === 'strength' ? '/programs' : '/cardio/programs'

  return (
    <div className="bg-card border-y sm:border border-border doom-noise doom-card p-8 text-center">
      <h2 className="text-2xl font-bold text-foreground doom-heading mb-2">
        NO ACTIVE PROGRAM
      </h2>
      <p className="text-muted-foreground mb-4">
        Activate a {type} training program to start tracking workouts
      </p>
      <a
        href={href}
        className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
      >
        VIEW PROGRAMS
      </a>
    </div>
  )
}
