'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AuthPageHeader } from '@/components/features/auth/AuthPageHeader'
import { OAuthButtons } from '@/components/features/auth/OAuthButtons'
import { OrDivider } from '@/components/features/auth/OrDivider'
import { Button } from '@/components/ui/Button'
import { flushEvents, trackEvent } from '@/lib/analytics'
import { signUp } from '@/lib/auth-client'
import {
  clearAttribution,
  getAttribution,
  resolveSource,
} from '@/lib/signup-attribution'

export default function SignupPage() {
  const _router = useRouter()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    // Capture attribution at submit time so QR/organic source is preserved
    const attribution = getAttribution()
    const source = resolveSource('email', attribution)
    const startedProps: Record<string, unknown> = { source, method: 'email' }
    if (attribution.gymSlug) startedProps.gymSlug = attribution.gymSlug
    trackEvent('signup_started', startedProps)

    setLoading(true)

    try {
      const trimmedName = displayName.trim()
      const { error } = await signUp.email({
        email,
        password,
        name: trimmedName || email.split('@')[0],
      })

      if (error) {
        setError(error.message || 'Could not create account')
        setLoading(false)
        return
      }

      // Save display name to UserSettings if provided (non-blocking)
      if (trimmedName) {
        try {
          await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: trimmedName }),
          })
        } catch {
          // Non-blocking — user can set display name later in Settings
        }
      }

      // BetterAuth signs in immediately after signup.
      // Use sendBeacon so the signup_completed event survives the
      // navigation to '/' that happens right after.
      const completedProps: Record<string, unknown> = {
        source,
        method: 'email',
      }
      if (attribution.gymSlug) completedProps.gymSlug = attribution.gymSlug
      trackEvent('signup_completed', completedProps)
      clearAttribution()
      await flushEvents(true)
      window.location.href = '/'
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-6 p-6 sm:p-8 bg-card rounded-lg shadow-lg border border-border">
        <AuthPageHeader />

        <h1 className="text-[22px] font-semibold text-foreground">
          Create your account
        </h1>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-error-muted border border-error-border text-error-text px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-input rounded-md shadow-sm text-foreground placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-input rounded-md shadow-sm text-foreground placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-16 bg-white border border-input rounded-md shadow-sm text-foreground placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <div className="relative mt-1">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-16 bg-white border border-input rounded-md shadow-sm text-foreground placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            variant="primary"
            className="w-full"
          >
            Sign up
          </Button>
        </form>

        <OrDivider />

        <OAuthButtons />

        <div className="border-t border-border pt-4">
          <p className="text-center text-[15px] text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
              Sign in &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
