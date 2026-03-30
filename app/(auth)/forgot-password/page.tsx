'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AuthPageHeader } from '@/components/features/auth/AuthPageHeader'
import { Button } from '@/components/ui/Button'
import { authClient } from '@/lib/auth-client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: resetError } = await authClient.requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      })

      if (resetError) {
        setError(resetError.message || 'Something went wrong')
        setLoading(false)
        return
      }

      setSubmitted(true)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full space-y-8 p-6 sm:p-8 bg-card rounded-lg shadow-lg border border-border">
          <AuthPageHeader subtitle="Check your email" />
          <p className="text-center text-muted-foreground">
            If an account exists for <strong>{email}</strong>, we sent a password reset link.
            Check your inbox and spam folder.
          </p>
          <div className="text-center">
            <Link href="/login" className="text-sm font-medium text-primary hover:text-primary-hover">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8 p-6 sm:p-8 bg-card rounded-lg shadow-lg border border-border">
        <AuthPageHeader subtitle="Reset your password" />

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-error-muted border border-error-border text-error-text px-4 py-3 rounded">
              {error}
            </div>
          )}

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

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            variant="primary"
            doom
            className="w-full"
          >
            Send reset link
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
              Back to login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
