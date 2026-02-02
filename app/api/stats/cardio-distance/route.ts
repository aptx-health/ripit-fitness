import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { getEquipmentForCategory, CardioDistanceCategory } from '@/lib/cardio/distance-categories'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get category from query params (default to 'running')
    const { searchParams } = new URL(request.url)
    const category = (searchParams.get('category') || 'running') as CardioDistanceCategory

    // Get equipment types for this category
    const equipmentTypes = getEquipmentForCategory(category)

    // Aggregate distance from ExercisePerformanceLog
    const distanceData = await prisma.exercisePerformanceLog.aggregate({
      where: {
        userId: user.id,
        type: 'cardio',
        equipment: { in: equipmentTypes }
      },
      _sum: { distance: true }
    })

    const totalMiles = distanceData._sum.distance || 0
    const totalKm = totalMiles * 1.60934

    return NextResponse.json({
      miles: parseFloat(totalMiles.toFixed(1)),
      km: parseFloat(totalKm.toFixed(1)),
      category
    })
  } catch (error) {
    console.error('Cardio distance API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
