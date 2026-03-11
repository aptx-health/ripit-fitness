'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Program = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
}

type Props = {
  programs: Program[]
}

export default function ProgramsList({ programs }: Props) {
  const router = useRouter()
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const activeProgram = programs.find((p) => p.isActive)

  const handleSetActive = async (programId: string) => {
    setActivatingId(programId)
    try {
      const response = await fetch(`/api/programs/${programId}/activate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to activate program')
      }

      // Refresh the page to show updated state
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
      const response = await fetch(`/api/programs/${programId}/delete`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to archive program')
      }

      // Refresh the page to show updated state
      router.refresh()
    } catch (error) {
      console.error('Error archiving program:', error)
      alert('Failed to archive program. Please try again.')
    } finally {
      setArchivingId(null)
    }
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
              href={`/programs/${activeProgram.id}`}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider"
            >
              OPEN PROGRAM
            </Link>
            <Link
              href={`/programs/${activeProgram.id}/edit`}
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
              <Link
                href={`/programs/${program.id}`}
                className="inline-block px-4 py-2 text-primary hover:text-primary-hover font-medium doom-link"
              >
                View
              </Link>
              <Link
                href={`/programs/${program.id}/edit`}
                className="inline-block px-4 py-2 text-muted-foreground hover:text-foreground font-medium doom-link"
              >
                Edit
              </Link>
              <button
                onClick={() => handleSetActive(program.id)}
                disabled={activatingId === program.id}
                className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium disabled:opacity-50"
              >
                {activatingId === program.id ? 'Activating...' : 'Set Active'}
              </button>
            </div>
          </div>
        ))}
    </div>
  )
}
