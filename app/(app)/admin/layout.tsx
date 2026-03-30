import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isEditorRole } from '@/lib/admin/auth'
import { getCurrentUser } from '@/lib/auth/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, error } = await getCurrentUser()

  if (error || !user) {
    redirect('/login')
  }

  if (!isEditorRole(user.role)) {
    redirect('/settings')
  }

  const navItems = [
    { href: '/admin/articles', label: 'Articles' },
    { href: '/admin/tags', label: 'Tags' },
    { href: '/admin/collections', label: 'Collections' },
    { href: '/admin/exercises', label: 'Exercises' },
    { href: '/admin/feedback', label: 'Feedback' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b-2 border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-6 h-12 overflow-x-auto">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">
              Admin
            </span>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider shrink-0"
              >
                {item.label}
              </Link>
            ))}
            <div className="ml-auto shrink-0">
              <Link
                href="/settings"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Settings
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </div>
    </div>
  )
}
