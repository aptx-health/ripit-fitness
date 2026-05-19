import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { checkRateLimit, programManagementLimiter } from '@/lib/rate-limit'

const VALID_INTENTS = ['new_to_apps', 'from_another_app', 'returning_to_training', 'just_curious'] as const
type SignupIntent = (typeof VALID_INTENTS)[number]

interface IntentRequest {
  intent: SignupIntent
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(programManagementLimiter, user.id)
    if (rateLimited) return rateLimited

    const body = (await request.json()) as IntentRequest
    const { intent } = body

    if (!intent || !VALID_INTENTS.includes(intent)) {
      return NextResponse.json(
        { error: `intent must be one of: ${VALID_INTENTS.join(', ')}` },
        { status: 400 }
      )
    }

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: { signupIntent: intent, updatedAt: new Date() },
      create: { userId: user.id, signupIntent: intent },
    })

    logger.info({ userId: user.id, intent }, 'Welcome intent recorded')
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error, context: 'welcome-intent' }, 'Failed to record welcome intent')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
