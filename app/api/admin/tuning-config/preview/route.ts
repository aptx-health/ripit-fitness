import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { buildArchetypePlans } from '@/lib/eval/synthetic-history'
import type { ArchetypeKey } from '@/lib/eval/types'
import { logger } from '@/lib/logger'
import {
  buildTrainingStatePayload,
  type SuggestRequestInput,
} from '@/lib/suggest/training-state-builder'
import { validateTuningConfigWrite } from '@/lib/tuning/schema'
import { loadTuningConfig } from '@/lib/tuning/store'

/**
 * Payload-preview generator for the TuningConfig admin (issue #937).
 *
 * Admin-only. Picks a subject (the admin themselves, or a synthetic archetype
 * from the dev seeder) and renders the EXACT payload the training-state builder
 * would produce, with ephemeral (unsaved) knob overrides applied. No LLM call —
 * this previews the input, not the suggestion. The builder recomputes aggregates
 * in dry-run (in-memory, no persistence), so knob changes that affect
 * aggregates-time computation are reflected.
 */

/** Fixed request-modal context for the preview (the request fields aren't tunable). */
const PREVIEW_REQUEST: SuggestRequestInput = {
  time_budget_minutes: 45,
  intensity_vibe: 'solid',
  deprioritize_freetext: null,
  prioritize_freetext: null,
  equipment_override: null,
}

/** Synthetic archetype subjects (seeder ids `synthetic-<key>`) + a self option. */
function archetypeSubjects(): { userId: string; key: ArchetypeKey; label: string }[] {
  const plans = buildArchetypePlans()
  return (Object.keys(plans) as ArchetypeKey[]).map((key) => ({
    userId: `synthetic-${key}`,
    key,
    label: plans[key].displayName,
  }))
}

/** Whitelist of previewable subject ids: self + the synthetic archetypes. */
function allowedSubjectIds(selfId: string): Set<string> {
  return new Set([selfId, ...archetypeSubjects().map((s) => s.userId)])
}

/** GET /api/admin/tuning-config/preview — list selectable subjects. */
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    return NextResponse.json({
      data: {
        self: { userId: auth.user.id, label: `You (${auth.user.email ?? 'self'})` },
        archetypes: archetypeSubjects(),
      },
    })
  } catch (error) {
    logger.error({ error }, 'Error listing preview subjects')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/tuning-config/preview — render the payload for a subject under
 * ephemeral knob overrides. Body: { userId, config }. The config is validated
 * with the same range schema as a real write (invalid ranges → 422), then
 * applied as an in-memory override without persisting.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin({ rateLimit: true })
    if (auth.response) return auth.response

    let body: { userId?: unknown; config?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const userId = typeof body.userId === 'string' ? body.userId : auth.user.id
    if (!allowedSubjectIds(auth.user.id).has(userId)) {
      return NextResponse.json({ error: 'Unknown preview subject' }, { status: 422 })
    }

    const validation = validateTuningConfigWrite(body.config)
    if (!validation.ok) {
      return NextResponse.json(
        { error: 'Invalid tuning config', details: validation.errors },
        { status: 422 },
      )
    }

    // Guard against previewing a synthetic subject that hasn't been seeded — the
    // payload would silently render as an empty cold-start user. (No Prisma User
    // model exists — BetterAuth owns the user table — so probe a seeder-created
    // row instead.)
    if (userId !== auth.user.id) {
      const exists = await prisma.userSettings.findUnique({
        where: { userId },
        select: { userId: true },
      })
      if (!exists) {
        return NextResponse.json(
          {
            error:
              'Synthetic subject not seeded. Run scripts/seed-synthetic-users.ts against this database.',
          },
          { status: 404 },
        )
      }
    }

    const savedConfig = await loadTuningConfig(prisma)
    const { payload, configStamp } = await buildTrainingStatePayload(
      prisma,
      userId,
      PREVIEW_REQUEST,
      new Date(),
      validation.config,
    )

    return NextResponse.json({
      data: { payload, configStamp, savedConfig },
    })
  } catch (error) {
    logger.error({ error }, 'Error generating tuning preview')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
