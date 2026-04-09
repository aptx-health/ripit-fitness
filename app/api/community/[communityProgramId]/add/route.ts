import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { cloneCommunityProgram } from '@/lib/community/cloning';
import { prisma } from '@/lib/db';
import { recordEvent } from '@/lib/events';
import { logger } from '@/lib/logger';
import {
  checkRateLimitWithHeaders,
  communityCloneLimiter,
  withRateLimitHeaders,
} from '@/lib/rate-limit';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ communityProgramId: string }> }
) {
  try {
    const { communityProgramId } = await params;

    // Get authenticated user
    const { user, error } = await getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Protect the BullMQ queue — community clones enqueue a multi-week
    // background job, so we cap to 3 per 60s per user.
    const rl = await checkRateLimitWithHeaders(communityCloneLimiter, user.id, {
      endpoint: 'POST /api/community/[id]/add',
    });
    if (rl.response) return rl.response;

    // Clone the community program to user's collection
    // This returns immediately with a shell program (copyStatus='cloning')
    // The actual cloning happens in the background
    const result = await cloneCommunityProgram(prisma, communityProgramId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add program' },
        { status: 500 }
      );
    }

    recordEvent(user.id, 'program_cloned', {
      communityProgramId,
      programId: result.programId,
    });

    return withRateLimitHeaders(
      NextResponse.json({
        success: true,
        programId: result.programId,
        status: 'cloning', // Indicates background cloning is in progress
      }),
      rl
    );
  } catch (error) {
    logger.error({ error, context: 'community-program-add' }, 'Failed to add community program');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
