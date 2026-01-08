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
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <span className="inline-block px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded mb-2">
                ACTIVE
              </span>
              <h2 className="text-2xl font-bold">{activeProgram.name}</h2>
              {activeProgram.description && (
                <p className="text-gray-600 mt-1">{activeProgram.description}</p>
              )}
            </div>
            <button
              onClick={() => handleArchive(activeProgram.id, activeProgram.name)}
              disabled={archivingId === activeProgram.id}
              className="text-gray-600 hover:text-gray-700 font-medium disabled:opacity-50"
              title="Archive program"
            >
              {archivingId === activeProgram.id ? 'Archiving...' : 'Archive'}
            </button>
          </div>
          <div className="flex gap-3 mt-4">
            <Link
              href={`/programs/${activeProgram.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Open Program
            </Link>
            <Link
              href={`/programs/${activeProgram.id}/edit`}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
            >
              Edit Program
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
            className="bg-white rounded-lg p-6 hover:shadow-md transition"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{program.name}</h2>
                {program.description && (
                  <p className="text-gray-600 mt-1">{program.description}</p>
                )}
              </div>
              <button
                onClick={() => handleArchive(program.id, program.name)}
                disabled={archivingId === program.id}
                className="text-gray-600 hover:text-gray-700 font-medium disabled:opacity-50"
                title="Archive program"
              >
                {archivingId === program.id ? 'Archiving...' : 'Archive'}
              </button>
            </div>
            <div className="mt-4 space-x-2">
              <Link
                href={`/programs/${program.id}`}
                className="inline-block px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                View
              </Link>
              <Link
                href={`/programs/${program.id}/edit`}
                className="inline-block px-4 py-2 text-gray-600 hover:text-gray-700 font-medium"
              >
                Edit
              </Link>
              <button
                onClick={() => handleSetActive(program.id)}
                disabled={activatingId === program.id}
                className="px-4 py-2 text-gray-600 hover:text-gray-700 font-medium disabled:opacity-50"
              >
                {activatingId === program.id ? 'Activating...' : 'Set Active'}
              </button>
            </div>
          </div>
        ))}
    </div>
  )
}
