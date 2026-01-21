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

    // Get limit from query params (default to 5, max 20)
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20)

    // Fetch archived programs (only fields needed for display)
    const programs = await prisma.program.findMany({
      where: {
        userId: user.id,
        isArchived: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        archivedAt: true,
      },
      orderBy: { archivedAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ programs })
  } catch (error) {
    console.error('Error fetching archived programs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
