'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { powerSync } from '@/lib/powersync/db'
import {
  transformProgram,
  transformWeek,
  transformWorkout,
  transformWorkoutCompletion,
  type Program,
  type Week,
  type Workout,
  type WorkoutCompletion,
} from '@/lib/powersync/transforms'
import WeekView from '@/components/WeekView'

// Workout with completions (matches Prisma include structure)
type WorkoutWithCompletions = Workout & {
  completions: WorkoutCompletion[]
}

export default function WeekPage({
  params,
}: {
  params: Promise<{ id: string; weekNumber: string }>
}) {
  const resolvedParams = use(params)
  const { id: programId, weekNumber } = resolvedParams
  const weekNum = parseInt(weekNumber, 10)
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [program, setProgram] = useState<Program | null>(null)
  const [week, setWeek] = useState<Week | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutWithCompletions[]>([])
  const [totalWeeks, setTotalWeeks] = useState(0)

  // Validate week number
  if (isNaN(weekNum) || weekNum < 1) {
    router.push('/programs')
    return null
  }

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

  // Fetch data from PowerSync
  useEffect(() => {
    if (!userId) return

    let isSubscribed = true

    const fetchData = async () => {
      try {
        // Query 1: Get program
        const programResults = await powerSync.getAll(
          'SELECT * FROM Program WHERE id = ? AND userId = ?',
          [programId, userId]
        )

        if (programResults.length === 0) {
          router.push('/programs')
          return
        }

        const programData = transformProgram(programResults[0])
        if (isSubscribed) {
          setProgram(programData)
        }

        // Query 2: Get week
        const weekResults = await powerSync.getAll(
          'SELECT * FROM Week WHERE programId = ? AND weekNumber = ?',
          [programId, weekNum]
        )

        if (weekResults.length === 0) {
          router.push('/programs')
          return
        }

        const weekData = transformWeek(weekResults[0])
        if (isSubscribed) {
          setWeek(weekData)
        }

        // Query 3: Get workouts with latest completion (using DISTINCT ON pattern)
        const workoutResults = await powerSync.getAll(
          `SELECT
            w.id as w_id,
            w.name as w_name,
            w.dayNumber as w_dayNumber,
            w.weekId as w_weekId,
            w.userId as w_userId,
            wc.id as wc_id,
            wc.workoutId as wc_workoutId,
            wc.userId as wc_userId,
            wc.completedAt as wc_completedAt,
            wc.status as wc_status,
            wc.notes as wc_notes
          FROM Workout w
          LEFT JOIN (
            SELECT
              id,
              workoutId,
              userId,
              completedAt,
              status,
              notes,
              ROW_NUMBER() OVER (PARTITION BY workoutId ORDER BY completedAt DESC) as rn
            FROM WorkoutCompletion
            WHERE userId = ?
          ) wc ON w.id = wc.workoutId AND wc.rn = 1
          WHERE w.weekId = ?
          ORDER BY w.dayNumber ASC`,
          [userId, weekData.id]
        )

        // Transform to nested structure
        const workoutsData: WorkoutWithCompletions[] = (workoutResults as any[]).map((row) => ({
          id: row.w_id,
          name: row.w_name,
          dayNumber: row.w_dayNumber,
          weekId: row.w_weekId,
          userId: row.w_userId,
          completions: row.wc_id
            ? [
                {
                  id: row.wc_id,
                  workoutId: row.wc_workoutId,
                  userId: row.wc_userId,
                  completedAt: new Date(row.wc_completedAt),
                  status: row.wc_status,
                  notes: row.wc_notes || null,
                },
              ]
            : [],
        }))

        if (isSubscribed) {
          setWorkouts(workoutsData)
        }

        // Query 4: Get total weeks count
        const weekCountResults = await powerSync.getAll(
          'SELECT COUNT(*) as total FROM Week WHERE programId = ?',
          [programId]
        )

        if (isSubscribed) {
          setTotalWeeks((weekCountResults as any[])[0]?.total || 0)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching week data from PowerSync:', error)
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      isSubscribed = false
    }
  }, [userId, programId, weekNum, router])

  if (loading || !userId || !program || !week) {
    return <div className="flex items-center justify-center h-screen">Loading week data...</div>
  }

  return (
    <WeekView
      programId={programId}
      weekId={week.id}
      weekNumber={weekNum}
      totalWeeks={totalWeeks}
      programName={program.name}
      workouts={workouts}
    />
  )
}
