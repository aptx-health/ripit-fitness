'use client'

import Link from 'next/link'
import { use, useEffect } from 'react'
import { AuthPageHeader } from '@/components/features/auth/AuthPageHeader'
import { Button } from '@/components/ui/Button'
import { trackEvent } from '@/lib/analytics'
import { setAttribution } from '@/lib/signup-attribution'

interface QrLandingPageProps {
  params: Promise<{ gymSlug: string }>
}

/**
 * QR landing page rendered when a user scans a gym-specific QR code.
 *
 * - Stores `{source: 'qr', gymSlug}` in sessionStorage so signup attribution
 *   carries through to /signup (and through OAuth round-trips).
 * - Fires `qr_landing_viewed` for the QR-funnel dashboard.
 *
 * The `signup_started` event fires later when the user clicks the primary CTA.
 */
export default function QrLandingPage({ params }: QrLandingPageProps) {
  const { gymSlug } = use(params)

  useEffect(() => {
    if (!gymSlug) return
    setAttribution({ source: 'qr', gymSlug })
    trackEvent('qr_landing_viewed', { gymSlug })
  }, [gymSlug])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8 p-6 sm:p-8 bg-card rounded-lg shadow-lg border border-border">
        <AuthPageHeader subtitle="A flexible strength tracker — built for the gym, no fluff." />

        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            You scanned a code from{' '}
            <span className="font-semibold text-foreground">{gymSlug}</span>.
            Create your free account to start logging workouts.
          </p>

          <Link href="/signup" className="block">
            <Button variant="primary" doom className="w-full">
              Create free account
            </Button>
          </Link>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary-hover"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
