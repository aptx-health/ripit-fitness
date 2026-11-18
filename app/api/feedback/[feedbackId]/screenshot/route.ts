import { type NextRequest, NextResponse } from 'next/server'
import { requireEditor } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/** The bug report screenshot for one feedback item, as stored. Editors and admins only. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  try {
    const { response } = await requireEditor({ rateLimit: true })
    if (response) return response

    const { feedbackId } = await params
    const shot = await prisma.feedbackScreenshot.findUnique({
      where: { feedbackId },
      select: { mimeType: true, data: true },
    })
    if (!shot) {
      return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 })
    }

    return new Response(new Uint8Array(shot.data), {
      headers: {
        'Content-Type': shot.mimeType,
        'Content-Length': String(shot.data.length),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    logger.error({ error, context: 'feedback-screenshot' }, 'Failed to load feedback screenshot')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
