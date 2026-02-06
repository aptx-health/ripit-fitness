import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser, createTestExerciseDefinition } from '@/lib/test/factories'
import { EQUIPMENT_GROUPS } from '@/lib/constants/program-metadata'

// ============================================================================
// SIMULATION FUNCTION
// Simulates the exercise search API logic without HTTP requests
// ============================================================================

async function simulateExerciseSearch(
  prisma: PrismaClient,
  userId: string,
  params: {
    query?: string
    faus?: string
    equipment?: string
    limit?: number
  }
) {
  const query = params.query || ''
  const fauFilters = params.faus?.split(',').filter(Boolean) || []
  const equipmentFilters = params.equipment?.split(',').filter(Boolean) || []
  const limit = Math.min(params.limit || 50, 100)

  // Build where conditions
  const whereConditions: Record<string, unknown>[] = []

  // Text search on name and aliases
  if (query.trim()) {
    const searchTerm = query.trim()
    whereConditions.push({
      OR: [
        {
          name: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          normalizedName: {
            contains: searchTerm.toLowerCase().replace(/[^a-z0-9]/g, ''),
            mode: 'insensitive'
          }
        },
        {
          aliases: {
            hasSome: [searchTerm.toLowerCase()]
          }
        }
      ]
    })
  }

  // Filter by FAUs (primary muscle groups)
  if (fauFilters.length > 0) {
    whereConditions.push({
      primaryFAUs: {
        hasSome: fauFilters
      }
    })
  }

  // Filter by equipment
  // Special handling: "other" in search filter should match ALL specialized equipment types
  if (equipmentFilters.length > 0) {
    const expandedEquipmentFilters = equipmentFilters.flatMap(filter => {
      // Normalize "dumbbells" -> "dumbbell", "resistance band" -> "resistance_band"
      const normalized = filter
        .replace('dumbbells', 'dumbbell')
        .replace('resistance band', 'resistance_band')

      // If filtering by "other", expand to all specialized equipment
      if (normalized === 'other') {
        return [...EQUIPMENT_GROUPS.specialized]
      }
      return [normalized]
    })

    whereConditions.push({
      equipment: {
        hasSome: expandedEquipmentFilters
      }
    })
  }

  // Combine all conditions
  const whereClause = whereConditions.length > 0 ? { AND: whereConditions } : {}

  // Execute search
  const exercises = await prisma.exerciseDefinition.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      normalizedName: true,
      aliases: true,
      primaryFAUs: true,
      secondaryFAUs: true,
      equipment: true,
      instructions: true,
      isSystem: true,
      createdBy: true,
    },
    orderBy: [
      { isSystem: 'desc' }, // System exercises first
      { name: 'asc' }
    ],
    take: limit
  })

  // Add search relevance scoring if we have a query
  let sortedExercises = exercises
  if (query.trim()) {
    const searchTerm = query.toLowerCase()
    const exercisesWithScore = exercises
      .map(exercise => {
        let score = 0

        // Exact name match gets highest score
        if (exercise.name.toLowerCase() === searchTerm) {
          score += 100
        }
        // Name starts with query
        else if (exercise.name.toLowerCase().startsWith(searchTerm)) {
          score += 50
        }
        // Name contains query
        else if (exercise.name.toLowerCase().includes(searchTerm)) {
          score += 25
        }

        // Check aliases for exact matches
        const exactAliasMatch = exercise.aliases.some(alias =>
          alias.toLowerCase() === searchTerm
        )
        if (exactAliasMatch) {
          score += 75
        }

        // Check aliases for partial matches
        const partialAliasMatch = exercise.aliases.some(alias =>
          alias.toLowerCase().includes(searchTerm)
        )
        if (partialAliasMatch) {
          score += 15
        }

        return { exercise, score }
      })
      .sort((a, b) => b.score - a.score)

    sortedExercises = exercisesWithScore.map(item => item.exercise)
  }

  return {
    success: true,
    exercises: sortedExercises,
    total: sortedExercises.length,
    query: {
      text: query,
      faus: fauFilters,
      equipment: equipmentFilters,
      limit
    }
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Exercise Search API - Equipment Filtering', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  it('should filter by common equipment (barbell)', async () => {
    // Create exercises with different equipment
    await createTestExerciseDefinition(prisma, {
      name: 'Barbell Bench Press',
      equipment: ['barbell'],
      primaryFAUs: ['chest']
    })
    await createTestExerciseDefinition(prisma, {
      name: 'Dumbbell Bench Press',
      equipment: ['dumbbell'],
      primaryFAUs: ['chest']
    })

    const result = await simulateExerciseSearch(prisma, userId, {
      equipment: 'barbell'
    })

    expect(result.success).toBe(true)
    expect(result.exercises).toHaveLength(1)
    expect(result.exercises[0].name).toBe('Barbell Bench Press')
  })

  it('should expand "other" filter to include all specialized equipment types', async () => {
    // Create exercises with specialized equipment
    await createTestExerciseDefinition(prisma, {
      name: 'Safety Squat Bar Squat',
      equipment: ['safety_squat_bar'],
      primaryFAUs: ['quads']
    })
    await createTestExerciseDefinition(prisma, {
      name: 'Trap Bar Deadlift',
      equipment: ['trap_bar'],
      primaryFAUs: ['hamstrings']
    })
    await createTestExerciseDefinition(prisma, {
      name: 'Swiss Bar Press',
      equipment: ['swiss_bar'],
      primaryFAUs: ['chest']
    })
    await createTestExerciseDefinition(prisma, {
      name: 'Chain Squats',
      equipment: ['chains'],
      primaryFAUs: ['quads']
    })
    await createTestExerciseDefinition(prisma, {
      name: 'Band Pull Aparts',
      equipment: ['bands'],
      primaryFAUs: ['rear-delts']
    })
    await createTestExerciseDefinition(prisma, {
      name: 'Sled Push',
      equipment: ['sled'],
      primaryFAUs: ['quads']
    })
    // Create an exercise with common equipment (should not be returned)
    await createTestExerciseDefinition(prisma, {
      name: 'Barbell Squat',
      equipment: ['barbell'],
      primaryFAUs: ['quads']
    })

    const result = await simulateExerciseSearch(prisma, userId, {
      equipment: 'other'
    })

    expect(result.success).toBe(true)
    expect(result.exercises).toHaveLength(6)

    const exerciseNames = result.exercises.map(e => e.name)
    expect(exerciseNames).toContain('Safety Squat Bar Squat')
    expect(exerciseNames).toContain('Trap Bar Deadlift')
    expect(exerciseNames).toContain('Swiss Bar Press')
    expect(exerciseNames).toContain('Chain Squats')
    expect(exerciseNames).toContain('Band Pull Aparts')
    expect(exerciseNames).toContain('Sled Push')
    expect(exerciseNames).not.toContain('Barbell Squat')
  })

  it('should match exercises with literal "other" equipment type', async () => {
    // Create an exercise explicitly tagged as "other"
    await createTestExerciseDefinition(prisma, {
      name: 'Custom Movement',
      equipment: ['other'],
      primaryFAUs: ['abs']
    })
    await createTestExerciseDefinition(prisma, {
      name: 'Trap Bar Deadlift',
      equipment: ['trap_bar'],
      primaryFAUs: ['hamstrings']
    })

    const result = await simulateExerciseSearch(prisma, userId, {
      equipment: 'other'
    })

    expect(result.success).toBe(true)
    expect(result.exercises).toHaveLength(2)

    const exerciseNames = result.exercises.map(e => e.name)
    expect(exerciseNames).toContain('Custom Movement')
    expect(exerciseNames).toContain('Trap Bar Deadlift')
  })

  it('should normalize legacy equipment values (dumbbells -> dumbbell)', async () => {
    await createTestExerciseDefinition(prisma, {
      name: 'Dumbbell Curl',
      equipment: ['dumbbell'],
      primaryFAUs: ['biceps']
    })

    const result = await simulateExerciseSearch(prisma, userId, {
      equipment: 'dumbbells' // Legacy value
    })

    expect(result.success).toBe(true)
    expect(result.exercises).toHaveLength(1)
    expect(result.exercises[0].name).toBe('Dumbbell Curl')
  })

  it('should normalize legacy equipment values (resistance band -> resistance_band)', async () => {
    await createTestExerciseDefinition(prisma, {
      name: 'Band Pull Apart',
      equipment: ['resistance_band'],
      primaryFAUs: ['rear-delts']
    })

    const result = await simulateExerciseSearch(prisma, userId, {
      equipment: 'resistance band' // Legacy value with space
    })

    expect(result.success).toBe(true)
    expect(result.exercises).toHaveLength(1)
    expect(result.exercises[0].name).toBe('Band Pull Apart')
  })

  it('should combine equipment filter with FAU filter', async () => {
    await createTestExerciseDefinition(prisma, {
      name: 'Trap Bar Deadlift',
      equipment: ['trap_bar'],
      primaryFAUs: ['hamstrings']
    })
    await createTestExerciseDefinition(prisma, {
      name: 'Swiss Bar Press',
      equipment: ['swiss_bar'],
      primaryFAUs: ['chest']
    })

    const result = await simulateExerciseSearch(prisma, userId, {
      equipment: 'other',
      faus: 'hamstrings'
    })

    expect(result.success).toBe(true)
    expect(result.exercises).toHaveLength(1)
    expect(result.exercises[0].name).toBe('Trap Bar Deadlift')
  })

  it('should combine equipment filter with text search', async () => {
    await createTestExerciseDefinition(prisma, {
      name: 'Trap Bar Deadlift',
      equipment: ['trap_bar'],
      primaryFAUs: ['hamstrings']
    })
    await createTestExerciseDefinition(prisma, {
      name: 'Barbell Deadlift',
      equipment: ['barbell'],
      primaryFAUs: ['hamstrings']
    })

    const result = await simulateExerciseSearch(prisma, userId, {
      query: 'deadlift',
      equipment: 'other'
    })

    expect(result.success).toBe(true)
    expect(result.exercises).toHaveLength(1)
    expect(result.exercises[0].name).toBe('Trap Bar Deadlift')
  })
})
