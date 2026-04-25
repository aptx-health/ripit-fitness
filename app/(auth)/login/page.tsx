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
  const [showPassword, setShowPassword] = useState(false)
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
      <div className="max-w-md w-full space-y-6 p-6 sm:p-8 bg-card rounded-lg shadow-lg border border-border">
        <AuthPageHeader />

        <h1 className="text-[22px] font-semibold text-foreground">
          Sign in to your account
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
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
                className="mt-1 block w-full px-3 py-2 bg-white border border-input rounded-md shadow-sm text-gray-900 placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-16 bg-white border border-input rounded-md shadow-sm text-gray-900 placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
          </div>

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            variant="primary"
            className="w-full"
          >
            Sign in
          </Button>
        </form>

        <OrDivider />

        <OAuthButtons />

        <div className="border-t border-border pt-4">
          <p className="text-center text-[15px] text-muted-foreground">
            New to Ripit?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:text-primary-hover">
              Create an account &rarr;
            </Link>
          </p>
        </div>
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
