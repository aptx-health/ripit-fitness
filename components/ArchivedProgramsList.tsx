'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'

type Program = {
  id: string
  name: string
  description: string | null
  archivedAt: Date | null
  createdAt: Date
}

type Props = {
  programs: Program[]
}

export default function ArchivedProgramsList({ programs }: Props) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null)

  const handleUnarchive = async (programId: string, programName: string) => {
    if (!confirm(`Unarchive "${programName}"? It will be restored to your active programs list.`)) {
      return
    }

    setUnarchivingId(programId)
    try {
      const response = await fetch(`/api/programs/${programId}/unarchive`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to unarchive program')
      }

      // Refresh the page to show updated state
      router.refresh()
    } catch (error) {
      console.error('Error unarchiving program:', error)
      alert('Failed to unarchive program. Please try again.')
    } finally {
      setUnarchivingId(null)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
          <h2 className="text-lg font-semibold text-gray-700">
            Archived Programs
          </h2>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
            {programs.length}
          </span>
        </div>
      </button>

      {/* Archived Programs List */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="divide-y divide-gray-200">
            {programs.map((program) => (
              <div
                key={program.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-medium text-gray-700">
                        {program.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded">
                        ARCHIVED
                      </span>
                    </div>
                    {program.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {program.description}
                      </p>
                    )}
                    {program.archivedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Archived on{' '}
                        {new Date(program.archivedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex gap-2">
                    <Link
                      href={`/programs/${program.id}`}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 font-medium"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleUnarchive(program.id, program.name)}
                      disabled={unarchivingId === program.id}
                      className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-medium disabled:opacity-50 transition-colors"
                    >
                      {unarchivingId === program.id ? 'Unarchiving...' : 'Unarchive'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
