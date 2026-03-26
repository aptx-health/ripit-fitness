import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Community program publishing is disabled for users.
// Community programs are curated and managed by admins only.
export async function POST() {
  logger.warn('Rejected attempt to publish program to community - feature disabled');
  return NextResponse.json(
    { error: 'Publishing programs to the community is no longer available' },
    { status: 403 }
  );
}
