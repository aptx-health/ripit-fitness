'use client'

import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import CardioWeekView from '@/components/CardioWeekView'
import CardioHistoryList from '@/components/CardioHistoryList'

type WeekData = {
  program: {
    id: string
    name: string
  }
  week: {
    id: string
    weekNumber: number
    sessions: Array<{
      id: string
      name: string
      dayNumber: number
      description: string | null
      targetDuration: number
      intensityZone: string | null
      equipment: string | null
      targetHRRange: string | null
      targetPowerRange: string | null
      intervalStructure: string | null
      notes: string | null
      loggedSessions: Array<{
        id: string
        status: string
        completedAt: Date
      }>
    }>
  }
  totalWeeks: number
}

type Props = {
  weekData: WeekData | null
  historyCount: number
}

export default function CardioTabs({ weekData, historyCount }: Props) {
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
          <CardioWeekView
            programId={weekData.program.id}
            programName={weekData.program.name}
            week={weekData.week}
            totalWeeks={weekData.totalWeeks}
          />
        ) : (
          <NoActiveProgram />
        )}
      </Tabs.Content>

      <Tabs.Content value="history">
        {/* Only render when tab is active - enables lazy loading */}
        {activeTab === 'history' && (
          <CardioHistoryList count={historyCount} />
        )}
      </Tabs.Content>
    </Tabs.Root>
  )
}

function NoActiveProgram() {
  return (
    <div className="bg-card border-y sm:border border-border doom-noise doom-card p-8 text-center">
      <h2 className="text-2xl font-bold text-foreground doom-heading mb-2">
        NO ACTIVE PROGRAM
      </h2>
      <p className="text-muted-foreground mb-4">
        Activate a cardio program to start tracking sessions
      </p>
      <a
        href="/cardio/programs"
        className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
      >
        VIEW PROGRAMS
      </a>
    </div>
  )
}
