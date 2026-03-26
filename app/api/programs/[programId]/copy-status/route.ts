import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/programs/[programId]/copy-status
 *
 * Returns the cloning status of a program
 * Used for polling during background cloning process
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;

    // Get authenticated user
    const { user, error } = await getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const program = await prisma.program.findFirst({
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

    if (program) {
      const copyStatus = program.copyStatus || 'ready';

      // Parse progress from status like "cloning_week_3_of_9"
      let progressInfo = null;
      if (copyStatus.startsWith('cloning_week_')) {
        const match = copyStatus.match(/cloning_week_(\d+)_of_(\d+)/);
        if (match) {
          progressInfo = {
            currentWeek: parseInt(match[1], 10),
            totalWeeks: parseInt(match[2], 10),
          };
        }
      }

      if (copyStatus === 'failed') {
        return NextResponse.json({
          status: 'failed',
          name: program.name,
          error: 'Clone failed. Please try again.',
        });
      }

      // Detect stuck clones
      if (copyStatus === 'cloning' || copyStatus.startsWith('cloning_week_')) {
        const cloneAge = Date.now() - new Date(program.createdAt).getTime();
        const hasData = program._count.weeks > 0;

        // If cloning completed (has weeks), mark as ready
        if (hasData && copyStatus === 'cloning') {
          await prisma.program.update({
            where: { id: programId },
            data: { copyStatus: 'ready' }
          });

          return NextResponse.json({
            status: 'ready',
            name: program.name,
          });
        }

        // If stuck for >5 minutes, mark as failed (Cloud Run timeout is 540s)
        if (cloneAge > 300000) {
          await prisma.program.update({
            where: { id: programId },
            data: { copyStatus: 'failed' }
          });

          return NextResponse.json({
            status: 'failed',
            name: program.name,
            error: 'Clone timed out. Please try again.',
          });
        }
      }

      return NextResponse.json({
        status: copyStatus,
        name: program.name,
        progress: progressInfo,
      });
    }

    // Program not found - likely failed and was deleted
    return NextResponse.json({
      status: 'not_found',
      error: 'Program not found - cloning may have failed',
    }, { status: 404 });

  } catch (error) {
    logger.error({ error, context: 'copy-status' }, 'Error checking copy status');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
