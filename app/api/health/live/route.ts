import { NextResponse } from 'next/server'

/**
 * Liveness probe — k8s liveness probe target.
 *
 * MUST NOT touch the database. A failing liveness probe causes k8s to kill
 * and restart the pod. A transient DB blip should NOT trigger that — readiness
 * is the right place for DB checks (k8s will route traffic away instead).
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
