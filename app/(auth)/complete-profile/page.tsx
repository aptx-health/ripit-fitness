'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { AuthPageHeader } from '@/components/features/auth/AuthPageHeader'

function CompleteProfileForm() {
  const _router = useRouter()
  const searchParams = useSearchParams()
  const provider = searchParams.get('provider') || 'Discord'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: needsPassword ? password : undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'EMAIL_EXISTS') {
          setNeedsPassword(true)
          setError(null)
          setLoading(false)
          return
        }
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      // If account was linked, user needs to re-authenticate
      if (data.linked) {
        window.location.href = '/login'
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
        <AuthPageHeader subtitle={`${provider} didn\u2019t share your email. Enter it below to finish setting up your account.`} />

        <form onSubmit={handleSubmit} className="space-y-6">
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
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (needsPassword) {
                    setNeedsPassword(false)
                    setPassword('')
                  }
                }}
                className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            {needsPassword && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  An account with this email already exists. Enter your password to link it with {provider}.
                </p>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Your existing password"
                  disabled={loading}
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            variant="primary"
            doom
            className="w-full"
          >
            {needsPassword ? 'Link account' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense>
      <CompleteProfileForm />
    </Suspense>
  )
}
