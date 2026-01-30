'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Program = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  weeks: Array<{
    weekNumber: number
    sessions: Array<{
      dayNumber: number
      name: string
      targetDuration: number
    }>
  }>
}

type Props = {
  programs: Program[]
}

export default function CardioProgramsList({ programs }: Props) {
  const router = useRouter()
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const activeProgram = programs.find((p) => p.isActive)

  const handleSetActive = async (programId: string) => {
    setActivatingId(programId)
    try {
      const response = await fetch(`/api/cardio/programs/${programId}/activate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to activate program')
      }

      router.refresh()
    } catch (error) {
      console.error('Error activating program:', error)
      alert('Failed to activate program. Please try again.')
    } finally {
      setActivatingId(null)
    }
  }

  const handleArchive = async (programId: string, programName: string) => {
    if (!confirm(`Archive "${programName}"? The program will be hidden but your workout history will be preserved.`)) {
      return
    }

    setArchivingId(programId)
    try {
      const response = await fetch(`/api/cardio/programs/${programId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to archive program')
      }

      router.refresh()
    } catch (error) {
      console.error('Error archiving program:', error)
      alert('Failed to archive program. Please try again.')
    } finally {
      setArchivingId(null)
    }
  }

  if (programs.length === 0) {
    return (
      <div className="bg-card border border-border p-12 text-center doom-noise">
        <p className="text-muted-foreground text-lg mb-4">NO CARDIO PROGRAMS YET</p>
        <p className="text-muted-foreground text-sm mb-6">
          Create a structured multi-week cardio program to track your progress
        </p>
        <Link
          href="/cardio/programs/create"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
        >
          CREATE YOUR FIRST PROGRAM
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Active Program */}
      {activeProgram && (
        <div className="bg-primary-muted border-2 border-primary p-6 doom-noise doom-corners">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <span className="inline-block px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold mb-2 doom-label">
                ACTIVE
              </span>
              <h2 className="text-2xl font-bold text-foreground doom-heading">{activeProgram.name}</h2>
              {activeProgram.description && (
                <p className="text-muted-foreground mt-1">{activeProgram.description}</p>
              )}
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span>{activeProgram.weeks.length} week{activeProgram.weeks.length !== 1 ? 's' : ''}</span>
                <span>{activeProgram.weeks.reduce((sum, w) => sum + w.sessions.length, 0)} sessions</span>
              </div>
            </div>
            <button
              onClick={() => handleArchive(activeProgram.id, activeProgram.name)}
              disabled={archivingId === activeProgram.id}
              className="text-muted-foreground hover:text-foreground font-medium disabled:opacity-50"
              title="Archive program"
            >
              {archivingId === activeProgram.id ? 'Archiving...' : 'Archive'}
            </button>
          </div>
          <div className="flex gap-3 mt-4">
            <Link
              href="/cardio"
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              OPEN PROGRAM
            </Link>
            <Link
              href={`/cardio/programs/${activeProgram.id}/edit`}
              className="px-4 py-2 border border-primary text-primary hover:bg-primary-muted doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              EDIT PROGRAM
            </Link>
          </div>
        </div>
      )}

      {/* Other Programs */}
      {programs
        .filter((p) => !p.isActive)
        .map((program) => (
          <div
            key={program.id}
            className="bg-card border border-border p-6 hover:shadow-md transition doom-noise doom-card"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground doom-heading">{program.name}</h2>
                {program.description && (
                  <p className="text-muted-foreground mt-1">{program.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{program.weeks.length} week{program.weeks.length !== 1 ? 's' : ''}</span>
                  <span>{program.weeks.reduce((sum, w) => sum + w.sessions.length, 0)} sessions</span>
                </div>
              </div>
              <button
                onClick={() => handleArchive(program.id, program.name)}
                disabled={archivingId === program.id}
                className="text-muted-foreground hover:text-foreground font-medium disabled:opacity-50"
                title="Archive program"
              >
                {archivingId === program.id ? 'Archiving...' : 'Archive'}
              </button>
            </div>
            <div className="mt-4 space-x-2">
              <button
                onClick={() => handleSetActive(program.id)}
                disabled={activatingId === program.id}
                className="inline-block px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d font-semibold uppercase tracking-wider text-sm disabled:opacity-50"
              >
                {activatingId === program.id ? 'ACTIVATING...' : 'SET ACTIVE'}
              </button>
              <Link
                href={`/cardio/programs/${program.id}/edit`}
                className="inline-block px-4 py-2 text-muted-foreground hover:text-foreground font-medium doom-link"
              >
                Edit
              </Link>
            </div>
          </div>
        ))}
    </div>
  )
}
