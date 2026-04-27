'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, use, useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useSession } from '@/lib/auth-client'
import type { QrMode } from '@/lib/signup-attribution'
import { setAttribution } from '@/lib/signup-attribution'

const VALID_MODES: QrMode[] = ['beginner', 'experienced']

function GoPageInner({ gymSlug }: { gymSlug: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (isPending) return

    const rawMode = searchParams.get('mode')
    const mode = rawMode && VALID_MODES.includes(rawMode as QrMode)
      ? (rawMode as QrMode)
      : undefined

    setAttribution({ source: 'qr', gymSlug, mode })
    trackEvent('qr_landing_viewed', { gymSlug, mode: mode ?? null })

    // Authenticated users go straight to training; unauthenticated go to signup
    router.replace(session ? '/training' : '/signup')
  }, [gymSlug, searchParams, router, session, isPending])

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
    </div>
  )
}

export default function GoPage({
  params,
}: {
  params: Promise<{ gymSlug: string }>
}) {
  const { gymSlug } = use(params)

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        </div>
      }
    >
      <GoPageInner gymSlug={gymSlug} />
    </Suspense>
  )
}
