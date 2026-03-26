'use client'

import { Settings } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeSelector } from '@/components/ThemeSelector'

type Props = {
  userEmail: string
}

export default function Header({ userEmail }: Props) {
  const pathname = usePathname()

  const NAV_LINKS = [
    { href: '/training', label: 'Training' },
    { href: '/programs', label: 'Programs' },
    { href: '/learn', label: 'Learn' },
  ] as const

  return (
    <nav
      className="hidden md:block bg-card border-b border-border"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo + Nav Links */}
          <div className="flex items-center gap-4 sm:gap-8">
            <Image
              src="/rf-logo@1x.png"
              alt="Ripit Fitness"
              width={100}
              height={40}
              className="h-8 w-auto"
              priority
            />
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3 sm:gap-4">
              {NAV_LINKS.map(({ href, label }) => {
                const isActive = pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`text-xs sm:text-sm font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'text-accent border-b-2 border-accent pb-0.5'
                        : 'text-foreground hover:text-accent doom-link'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
              {process.env.NODE_ENV === 'development' && (
                <Link
                  href="/dev/mobile-spike"
                  className="text-xs font-mono text-muted-foreground hover:text-accent transition-colors"
                >
                  spike
                </Link>
              )}
            </div>
          </div>

          {/* Right: Desktop Menu */}
          <div className="flex items-center space-x-4">
            <ThemeSelector />
            <Link
              href="/settings"
              className="h-9 w-9 flex items-center justify-center border-2 border-border bg-input hover:border-primary hover:bg-primary/10 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              aria-label="User settings"
            >
              <Settings size={20} strokeWidth={2} />
            </Link>
            <span className="text-sm text-muted-foreground">{userEmail}</span>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground doom-link"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  )
}
