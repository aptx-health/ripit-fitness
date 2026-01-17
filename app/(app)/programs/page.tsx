'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { powerSync, waitForInitialSync } from '@/lib/powersync/db'
import {
  transformProgram,
  transformCardioProgram,
  transformCardioWeek,
  transformPrescribedCardioSession,
  type Program,
  type CardioProgram,
  type CardioWeek,
  type PrescribedCardioSession,
} from '@/lib/powersync/transforms'
import ConsolidatedProgramsView from '@/components/programs/ConsolidatedProgramsView'

// Nested cardio program type (matches Prisma include structure)
type CardioWeekWithSessions = CardioWeek & {
  sessions: PrescribedCardioSession[]
}

type CardioProgram_WithWeeks = CardioProgram & {
  weeks: CardioWeekWithSessions[]
}

export default function ProgramsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<string>('Initializing...')
  const [syncError, setSyncError] = useState<string | null>(null)

  // Strength programs state
  const [strengthPrograms, setStrengthPrograms] = useState<Program[]>([])
  const [archivedStrengthPrograms, setArchivedStrengthPrograms] = useState<Program[]>([])

  // Cardio programs state
  const [cardioPrograms, setCardioPrograms] = useState<CardioProgram_WithWeeks[]>([])
  const [archivedCardioPrograms, setArchivedCardioPrograms] = useState<CardioProgram[]>([])

  // Authenticate user
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)
    }

    checkAuth()
  }, [router])

  // Fetch data from PowerSync when userId is available
  useEffect(() => {
    if (!userId) return

    let isSubscribed = true

    const fetchData = async () => {
      try {
        setSyncError(null)
        console.log('[PowerSync] Fetching data for user:', userId)

        // Wait for initial sync to complete before querying
        await waitForInitialSync(
          (message) => {
            if (isSubscribed) {
              setSyncStatus(message)
            }
          },
          30000 // 30 second timeout
        )

        // Query 1: Active strength programs
        const strengthResults = await powerSync.getAll(
          'SELECT * FROM Program WHERE userId = ? AND isArchived = ? ORDER BY createdAt DESC',
          [userId, 0]
        )
        console.log('[PowerSync] Active strength programs:', strengthResults.length, 'rows')
        if (strengthResults.length === 0) {
          console.warn('[PowerSync] No active strength programs found. Check: RLS policies, sync rules, or data exists in Supabase')
        }
        if (isSubscribed) {
          setStrengthPrograms(strengthResults.map(transformProgram))
        }

        // Query 2: Archived strength programs
        const archivedStrengthResults = await powerSync.getAll(
          'SELECT * FROM Program WHERE userId = ? AND isArchived = ? ORDER BY archivedAt DESC',
          [userId, 1]
        )
        console.log('[PowerSync] Archived strength programs:', archivedStrengthResults.length, 'rows')
        if (isSubscribed) {
          setArchivedStrengthPrograms(archivedStrengthResults.map(transformProgram))
        }

        // Query 3: Active cardio programs with nested weeks and sessions
        const cardioResults = await powerSync.getAll(
          `SELECT
            cp.id as cp_id,
            cp.name as cp_name,
            cp.description as cp_description,
            cp.userId as cp_userId,
            cp.isActive as cp_isActive,
            cp.isArchived as cp_isArchived,
            cp.archivedAt as cp_archivedAt,
            cp.isUserCreated as cp_isUserCreated,
            cp.createdAt as cp_createdAt,
            cp.updatedAt as cp_updatedAt,
            cw.id as cw_id,
            cw.weekNumber as cw_weekNumber,
            cw.cardioProgramId as cw_cardioProgramId,
            cw.userId as cw_userId,
            pcs.id as pcs_id,
            pcs.weekId as pcs_weekId,
            pcs.userId as pcs_userId,
            pcs.dayNumber as pcs_dayNumber,
            pcs.name as pcs_name,
            pcs.description as pcs_description,
            pcs.targetDuration as pcs_targetDuration,
            pcs.intensityZone as pcs_intensityZone,
            pcs.equipment as pcs_equipment,
            pcs.targetHRRange as pcs_targetHRRange,
            pcs.targetPowerRange as pcs_targetPowerRange,
            pcs.intervalStructure as pcs_intervalStructure,
            pcs.notes as pcs_notes,
            pcs.createdAt as pcs_createdAt,
            pcs.updatedAt as pcs_updatedAt
          FROM CardioProgram cp
          LEFT JOIN CardioWeek cw ON cp.id = cw.cardioProgramId
          LEFT JOIN PrescribedCardioSession pcs ON cw.id = pcs.weekId
          WHERE cp.userId = ? AND cp.isArchived = ?
          ORDER BY cp.isActive DESC, cp.createdAt DESC, cw.weekNumber ASC, pcs.dayNumber ASC`,
          [userId, 0]
        )

        // Transform flat results into nested structure
        const cardioProgramsMap = new Map<string, CardioProgram_WithWeeks>()

        for (const row of cardioResults as any[]) {
          const programId = row.cp_id

          // Get or create program
          if (!cardioProgramsMap.has(programId)) {
            cardioProgramsMap.set(programId, {
              id: row.cp_id,
              name: row.cp_name,
              description: row.cp_description || null,
              userId: row.cp_userId,
              isActive: row.cp_isActive === 1,
              isArchived: row.cp_isArchived === 1,
              archivedAt: row.cp_archivedAt ? new Date(row.cp_archivedAt) : null,
              isUserCreated: row.cp_isUserCreated === 1,
              createdAt: new Date(row.cp_createdAt),
              updatedAt: new Date(row.cp_updatedAt),
              weeks: [],
            })
          }

          const program = cardioProgramsMap.get(programId)!

          // Add week if present
          if (row.cw_id) {
            const weekId = row.cw_id
            let week = program.weeks.find((w) => w.id === weekId)

            if (!week) {
              week = {
                id: row.cw_id,
                weekNumber: row.cw_weekNumber,
                cardioProgramId: row.cw_cardioProgramId,
                userId: row.cw_userId,
                sessions: [],
              }
              program.weeks.push(week)
            }

            // Add session if present
            if (row.pcs_id) {
              week.sessions.push({
                id: row.pcs_id,
                weekId: row.pcs_weekId,
                userId: row.pcs_userId,
                dayNumber: row.pcs_dayNumber,
                name: row.pcs_name,
                description: row.pcs_description || null,
                targetDuration: row.pcs_targetDuration,
                intensityZone: row.pcs_intensityZone || null,
                equipment: row.pcs_equipment || null,
                targetHRRange: row.pcs_targetHRRange || null,
                targetPowerRange: row.pcs_targetPowerRange || null,
                intervalStructure: row.pcs_intervalStructure || null,
                notes: row.pcs_notes || null,
                createdAt: new Date(row.pcs_createdAt),
                updatedAt: new Date(row.pcs_updatedAt),
              })
            }
          }
        }

        console.log('[PowerSync] Active cardio programs:', cardioProgramsMap.size, 'programs,', cardioResults.length, 'total rows')
        if (cardioResults.length === 0) {
          console.warn('[PowerSync] No active cardio programs found. Check: RLS policies, sync rules, or data exists in Supabase')
        }
        if (isSubscribed) {
          setCardioPrograms(Array.from(cardioProgramsMap.values()))
        }

        // Query 4: Archived cardio programs
        const archivedCardioResults = await powerSync.getAll(
          'SELECT * FROM CardioProgram WHERE userId = ? AND isArchived = ? ORDER BY archivedAt DESC',
          [userId, 1]
        )
        console.log('[PowerSync] Archived cardio programs:', archivedCardioResults.length, 'rows')
        if (isSubscribed) {
          setArchivedCardioPrograms(archivedCardioResults.map(transformCardioProgram))
        }

        setSyncStatus('Loading programs...')
        console.log('[PowerSync] Data fetch completed successfully')
        console.log('[PowerSync] Total programs loaded:', {
          strength: strengthResults.length,
          cardio: cardioProgramsMap.size
        })
        setLoading(false)
      } catch (error) {
        console.error('[PowerSync] Failed to load programs:', error)

        // Set user-friendly error message
        let errorMessage = 'Failed to load programs. Please try again.'
        if (error instanceof Error) {
          if (error.message.includes('timeout') || error.message.includes('Sync is taking longer')) {
            errorMessage = 'Sync is taking longer than expected. Check your network connection.'
          } else if (error.message.includes('disconnected') || error.message.includes('Lost connection')) {
            errorMessage = 'Lost connection during sync. Please check your network.'
          } else if (error.message.includes('no such column') || error.message.includes('no such table')) {
            errorMessage = 'Database sync error. Please contact support.'
          } else {
            errorMessage = error.message
          }
        }

        setSyncError(errorMessage)
        setSyncStatus('Sync failed')
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      isSubscribed = false
    }
  }, [userId])

  if (loading || !userId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        {syncError ? (
          <>
            <div className="text-red-600 text-lg font-semibold">
              {syncError}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="text-gray-600">{syncStatus}</div>
          </>
        )}
      </div>
    )
  }

  return (
    <ConsolidatedProgramsView
      strengthPrograms={strengthPrograms}
      archivedStrengthPrograms={archivedStrengthPrograms}
      cardioPrograms={cardioPrograms}
      archivedCardioPrograms={archivedCardioPrograms}
    />
  )
}
