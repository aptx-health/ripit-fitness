import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error } = await getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all community programs ordered by published date (newest first)
    const communityPrograms = await prisma.communityProgram.findMany({
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        programType: true,
        displayName: true,
        publishedAt: true,
        weekCount: true,
        workoutCount: true,
        exerciseCount: true,
      },
    });

    return NextResponse.json({
      success: true,
      programs: communityPrograms,
    });
  } catch (error) {
    logger.error({ error, context: 'community-programs-list' }, 'Failed to fetch community programs');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
