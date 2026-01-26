import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/programs/[programId]/copy-status
 *
 * Returns the cloning status of a program
 * Used for polling during background cloning process
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;

    // Get authenticated user
    const { user, error } = await getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check strength program first
    const strengthProgram = await prisma.program.findFirst({
      where: {
        id: programId,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        copyStatus: true,
        createdAt: true,
        _count: {
          select: { weeks: true }
        }
      },
    });

    if (strengthProgram) {
      // Detect stuck clones
      if (strengthProgram.copyStatus === 'cloning') {
        const cloneAge = Date.now() - new Date(strengthProgram.createdAt).getTime();
        const hasData = strengthProgram._count.weeks > 0;

        // If cloning completed (has weeks), mark as ready
        if (hasData) {
          await prisma.program.update({
            where: { id: programId },
            data: { copyStatus: 'ready' }
          });

          return NextResponse.json({
            status: 'ready',
            programType: 'strength',
            name: strengthProgram.name,
          });
        }

        // If stuck for >60 seconds with no data, delete it
        if (cloneAge > 60000 && !hasData) {
          await prisma.program.delete({
            where: { id: programId }
          });

          return NextResponse.json({
            status: 'not_found',
            error: 'Clone timed out and was cleaned up',
          }, { status: 404 });
        }
      }

      return NextResponse.json({
        status: strengthProgram.copyStatus || 'ready',
        programType: 'strength',
        name: strengthProgram.name,
      });
    }

    // Check cardio program
    const cardioProgram = await prisma.cardioProgram.findFirst({
      where: {
        id: programId,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        copyStatus: true,
        createdAt: true,
        _count: {
          select: { weeks: true }
        }
      },
    });

    if (cardioProgram) {
      // Detect stuck clones
      if (cardioProgram.copyStatus === 'cloning') {
        const cloneAge = Date.now() - new Date(cardioProgram.createdAt).getTime();
        const hasData = cardioProgram._count.weeks > 0;

        // If cloning completed (has weeks), mark as ready
        if (hasData) {
          await prisma.cardioProgram.update({
            where: { id: programId },
            data: { copyStatus: 'ready' }
          });

          return NextResponse.json({
            status: 'ready',
            programType: 'cardio',
            name: cardioProgram.name,
          });
        }

        // If stuck for >60 seconds with no data, delete it
        if (cloneAge > 60000 && !hasData) {
          await prisma.cardioProgram.delete({
            where: { id: programId }
          });

          return NextResponse.json({
            status: 'not_found',
            error: 'Clone timed out and was cleaned up',
          }, { status: 404 });
        }
      }

      return NextResponse.json({
        status: cardioProgram.copyStatus || 'ready',
        programType: 'cardio',
        name: cardioProgram.name,
      });
    }

    // Program not found - likely failed and was deleted
    return NextResponse.json({
      status: 'not_found',
      error: 'Program not found - cloning may have failed',
    }, { status: 404 });

  } catch (error) {
    console.error('Error checking copy status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
