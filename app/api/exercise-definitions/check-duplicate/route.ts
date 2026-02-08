import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkDuplicateExercise } from '@/lib/validators/exercise-definition';

/**
 * GET /api/exercise-definitions/check-duplicate?name=...&excludeId=...
 * Check if an exercise name already exists
 * Used for real-time duplicate detection in the UI
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser();

    if (authError || !user) {
      logger.debug('Unauthorized - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const excludeId = searchParams.get('excludeId') || undefined;

    if (!name) {
      return NextResponse.json(
        { error: 'Name parameter is required' },
        { status: 400 }
      );
    }

    logger.debug({ name, excludeId, userId: user.id }, 'Checking for duplicate exercise');

    const result = await checkDuplicateExercise(
      prisma,
      name,
      user.id,
      excludeId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, 'Error checking duplicate exercise');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
