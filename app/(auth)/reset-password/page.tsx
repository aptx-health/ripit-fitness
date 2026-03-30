import Link from 'next/link'
import { AuthPageHeader } from '@/components/features/auth/AuthPageHeader'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8 p-6 sm:p-8 bg-card rounded-lg shadow-lg border border-border">
        <AuthPageHeader subtitle="Password Reset" />

        <p className="text-center text-muted-foreground">
          This feature is coming soon. Need help? Contact support.
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
