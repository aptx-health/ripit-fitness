import { NextResponse } from 'next/server'

/**
 * Version probe — reports the git commit the running image was built from.
 *
 * The SHA is baked into the image at build time (`build-app.yml` passes
 * `--build-arg GIT_SHA=${{ github.sha }}`, the Dockerfile promotes it to the
 * `APP_GIT_SHA` runtime env). Post-deploy smoke tests poll this until it matches
 * the triggering commit so they assert against the NEW image, not the pods still
 * serving the previous rollout (ArgoCD syncs asynchronously — see
 * `.github/workflows/smoke-test-staging.yml`).
 *
 * MUST NOT touch the database — this is a pure readback so it can answer even
 * while a rollout is mid-flight. Returns `sha: "unknown"` for local/dev builds
 * that were not built through CI.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    sha: process.env.APP_GIT_SHA || 'unknown',
    timestamp: new Date().toISOString(),
  })
}
