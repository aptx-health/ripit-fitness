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

export default function SignupPage() {
  const _router = useRouter()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
      trackEvent('signup_completed')
      await flushEvents(true)
      window.location.href = '/'
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8 p-6 sm:p-8 bg-card rounded-lg shadow-lg border border-border">
        <AuthPageHeader />

        <OAuthButtons />

        <OrDivider />

        <form onSubmit={handleSignup} className="space-y-6">
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
                className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            variant="primary"
            doom
            className="w-full"
          >
            Sign up
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
