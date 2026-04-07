import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;

    const { user, error } = await getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const {
      goals,
      level,
      durationWeeks,
      durationDisplay,
      targetDaysPerWeek,
      equipmentNeeded,
      focusAreas,
    } = body;

    const program = await prisma.program.update({
      where: {
        id: programId,
        userId: user.id,
      },
      data: {
        goals,
        level,
        durationWeeks,
        durationDisplay,
        targetDaysPerWeek,
        equipmentNeeded,
        focusAreas,
      },
    });

    return NextResponse.json({ success: true, program });
  } catch (error) {
    logger.error({ error, context: 'program-metadata' }, 'Failed to update program metadata');
    return NextResponse.json(
      { error: 'Failed to update program metadata' },
      { status: 500 }
    );
  }
}
