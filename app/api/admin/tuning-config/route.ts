import type { Prisma } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { DEFAULT_TUNING_CONFIG, TUNING_KNOBS } from '@/lib/tuning/config'
import { validateTuningConfigWrite } from '@/lib/tuning/schema'
import { loadTuningConfig, TUNING_CONFIG_SINGLETON_ID } from '@/lib/tuning/store'

/**
 * Admin API for the learning-pipeline TuningConfig singleton (issue #937).
 *
 * Admin-only (not editor). GET returns the effective config + per-knob metadata
 * (code default, range, effect copy) for the form. PUT zod-validates the full
 * config against each knob's range at WRITE time and upserts the single row.
 *
 * The READ path used by the pipeline (lib/tuning/store.ts) is zod-free and
 * reachable from the clone-worker; validation lives only here.
 */

/** GET /api/admin/tuning-config — current config + defaults + knob metadata. */
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth.response) return auth.response

    const config = await loadTuningConfig(prisma)

    return NextResponse.json({
      data: {
        config,
        defaults: DEFAULT_TUNING_CONFIG,
        knobs: TUNING_KNOBS,
      },
    })
  } catch (error) {
    logger.error({ error }, 'Error loading tuning config')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/tuning-config — replace the config. Body is the full knob set.
 * Out-of-range or unknown-key writes are rejected 422 at the API layer.
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin({ rateLimit: true })
    if (auth.response) return auth.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = validateTuningConfigWrite(body)
    if (!validation.ok) {
      return NextResponse.json(
        { error: 'Invalid tuning config', details: validation.errors },
        { status: 422 },
      )
    }

    const values = validation.config as unknown as Prisma.InputJsonObject
    await prisma.tuningConfig.upsert({
      where: { id: TUNING_CONFIG_SINGLETON_ID },
      create: {
        id: TUNING_CONFIG_SINGLETON_ID,
        values,
        updatedBy: auth.user.id,
      },
      update: {
        values,
        updatedBy: auth.user.id,
      },
    })

    logger.info(
      { userId: auth.user.id, config: validation.config },
      'Tuning config updated',
    )

    return NextResponse.json({ data: { config: validation.config } })
  } catch (error) {
    logger.error({ error }, 'Error updating tuning config')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
