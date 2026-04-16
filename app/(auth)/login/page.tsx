'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { AuthPageHeader } from '@/components/features/auth/AuthPageHeader'
import { OAuthButtons } from '@/components/features/auth/OAuthButtons'
import { OrDivider } from '@/components/features/auth/OrDivider'
import { Button } from '@/components/ui/Button'
import { signIn } from '@/lib/auth-client'

function getOAuthError(errorParam: string | null): string | null {
  if (!errorParam) return null
  if (errorParam === 'access_denied') return 'Sign-in was cancelled. Please try again.'
  return 'Could not complete sign-in. Please try again or sign in with email.'
}

function LoginForm() {
  const _router = useRouter()
  const searchParams = useSearchParams()
  const oauthError = getOAuthError(searchParams.get('error'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(oauthError)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn.email({
        email,
        password,
      })

      if (result.error) {
        setError(result.error.message || 'Invalid email or password')
        setLoading(false)
        return
      }

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

        {/* Primary CTA for new users — most arrivals (especially via gym QR code) don't have an account yet */}
        <div className="space-y-3">
          <p className="text-center text-sm font-medium text-foreground">
            New to Ripit?
          </p>
          <Link href="/signup" className="block">
            <Button variant="primary" doom className="w-full" type="button">
              Create Account
            </Button>
          </Link>
        </div>

        <OrDivider label="already have an account?" />

        <OAuthButtons />

        <OrDivider />

        <form onSubmit={handleLogin} className="space-y-6">
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
              <div className="mt-1 text-right">
                <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
                  Forgot password?
                </Link>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            variant="outline"
            doom
            className="w-full"
          >
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
