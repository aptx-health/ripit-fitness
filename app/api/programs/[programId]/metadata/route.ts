import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

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

    // Check if it's a strength or cardio program
    const strengthProgram = await prisma.program.findUnique({
      where: {
        id: programId,
        userId: user.id,
      },
    });

    const cardioProgram = await prisma.cardioProgram.findUnique({
      where: {
        id: programId,
        userId: user.id,
      },
    });

    if (!strengthProgram && !cardioProgram) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    // Update metadata for the appropriate program type
    if (strengthProgram) {
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
    } else {
      const program = await prisma.cardioProgram.update({
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
    }
  } catch (error) {
    console.error('Error updating program metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update program metadata' },
      { status: 500 }
    );
  }
}
