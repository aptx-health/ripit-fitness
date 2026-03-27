import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Community program publishing is disabled for users.
// Community programs are curated and managed by admins only.
export async function GET() {
  logger.warn('Rejected attempt to validate program for publishing - feature disabled');
  return NextResponse.json(
    { error: 'Publishing programs to the community is no longer available' },
    { status: 403 }
  );
}
