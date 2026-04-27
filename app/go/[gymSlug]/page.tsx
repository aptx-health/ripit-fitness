'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { use, useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import type { QrMode } from '@/lib/signup-attribution'
import { setAttribution } from '@/lib/signup-attribution'

const VALID_MODES: QrMode[] = ['beginner', 'experienced']

export default function GoPage({
  params,
}: {
  params: Promise<{ gymSlug: string }>
}) {
  const { gymSlug } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const rawMode = searchParams.get('mode')
    const mode = rawMode && VALID_MODES.includes(rawMode as QrMode)
      ? (rawMode as QrMode)
      : undefined

    setAttribution({ source: 'qr', gymSlug, mode })
    trackEvent('qr_landing_viewed', { gymSlug, mode: mode ?? null })

    router.replace('/signup')
  }, [gymSlug, searchParams, router])

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
    </div>
  )
}
