import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error } = await getCurrentUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const fauFilters = searchParams.get('faus')?.split(',').filter(Boolean) || []
    const equipmentFilters = searchParams.get('equipment')?.split(',').filter(Boolean) || []
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 results

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
    if (equipmentFilters.length > 0) {
      whereConditions.push({
        equipment: {
          hasSome: equipmentFilters
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

    return NextResponse.json({
      success: true,
      exercises: sortedExercises,
      total: sortedExercises.length,
      query: {
        text: query,
        faus: fauFilters,
        equipment: equipmentFilters,
        limit
      }
    })
  } catch (error) {
    console.error('Error searching exercises:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}