'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { powerSync } from '@/lib/powersync/db'
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
        console.log('[PowerSync] Fetching data for user:', userId)

        // Wait for PowerSync to connect
        if (!powerSync.connected) {
          console.log('[PowerSync] Waiting for connection...')
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('PowerSync connection timeout after 10s')), 10000)
          )
          await Promise.race([powerSync.waitForReady(), timeoutPromise])
          console.log('[PowerSync] Connected successfully')
        }

        // Check sync status for debugging
        console.log('[PowerSync] Sync status:', {
          connected: powerSync.connected,
          hasSynced: powerSync.currentStatus?.hasSynced,
          lastSyncedAt: powerSync.currentStatus?.lastSyncedAt,
        })

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

        console.log('[PowerSync] Data fetch completed')
        setLoading(false)
      } catch (error) {
        console.error('[PowerSync] Query failed:', error)
        if (error instanceof Error) {
          // Check for common issues
          if (error.message.includes('no such column')) {
            console.error('[PowerSync] Column missing in schema. Check that PowerSync schema matches database.')
          } else if (error.message.includes('no such table')) {
            console.error('[PowerSync] Table missing. Check that sync rules are configured and initial sync completed.')
          } else if (error.message.includes('timeout')) {
            console.error('[PowerSync] Connection timeout. Check network and PowerSync service status.')
          }
        }
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      isSubscribed = false
    }
  }, [userId])

  if (loading || !userId) {
    return <div className="flex items-center justify-center h-screen">Loading programs...</div>
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
