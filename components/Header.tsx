'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Settings } from 'lucide-react'
import { ThemeSelector } from '@/components/ThemeSelector'
import UserSettingsModal from '@/components/UserSettingsModal'
import { useUserSettings } from '@/hooks/useUserSettings'

type Props = {
  userEmail: string
}

export default function Header({ userEmail }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { settings, updateSettings } = useUserSettings()
  const pathname = usePathname()

  const isStrengthActive = pathname.startsWith('/training')
  const isCardioActive = pathname.startsWith('/cardio')
  const isDataActive = pathname.startsWith('/data')

  return (
    <>
      <nav className="bg-card border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo + Nav Links */}
            <div className="flex items-center gap-4 sm:gap-8">
              <Link
                href="/programs"
                className="hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/rf-logo@1x.png"
                  alt="Ripit Fitness"
                  width={100}
                  height={40}
                  className="h-8 w-auto"
                  priority
                />
              </Link>
              <div className="flex items-center gap-3 sm:gap-4">
                <Link
                  href="/programs"
                  className="px-3 py-1.5 text-xs sm:text-sm font-bold text-primary hover:bg-primary-muted hover:border-accent hover:text-accent border border-primary uppercase tracking-wider transition-colors"
                >
                  Programs
                </Link>
                <div className="h-6 w-px bg-border" />
                <Link
                  href="/training"
                  className={`text-xs sm:text-sm font-semibold uppercase tracking-wider transition-colors ${
                    isStrengthActive
                      ? 'text-accent border-b-2 border-accent pb-0.5'
                      : 'text-foreground hover:text-accent doom-link'
                  }`}
                >
                  Strength
                </Link>
                <Link
                  href="/cardio"
                  className={`text-xs sm:text-sm font-semibold uppercase tracking-wider transition-colors ${
                    isCardioActive
                      ? 'text-accent border-b-2 border-accent pb-0.5'
                      : 'text-foreground hover:text-accent doom-link'
                  }`}
                >
                  Cardio
                </Link>
                <Link
                  href="/data"
                  className={`text-xs sm:text-sm font-semibold uppercase tracking-wider transition-colors ${
                    isDataActive
                      ? 'text-accent border-b-2 border-accent pb-0.5'
                      : 'text-foreground hover:text-accent doom-link'
                  }`}
                >
                  Data
                </Link>
              </div>
            </div>

            {/* Right: Desktop Menu (hidden on mobile) */}
            <div className="hidden md:flex items-center space-x-4">
              <ThemeSelector />
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="h-9 w-9 flex items-center justify-center border-2 border-border bg-input hover:border-primary hover:bg-primary/10 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                aria-label="User settings"
              >
                <Settings size={20} strokeWidth={2} />
              </button>
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

            {/* Right: Mobile Hamburger (shown on mobile) */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden p-2 text-foreground hover:text-primary transition-colors doom-focus-ring"
              aria-label="Menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Bottom Sheet Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Bottom Sheet */}
      <div
        className={`
          fixed left-0 right-0 bg-card border-t-2 border-primary z-50
          transition-all duration-300 ease-out md:hidden
          ${isMenuOpen ? 'bottom-0' : '-bottom-full'}
        `}
        style={{
          maxHeight: isMenuOpen ? '80vh' : '0',
          overflow: isMenuOpen ? 'visible' : 'hidden',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div className="p-6 space-y-6 doom-noise">
          {/* Drag Handle */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* User Email */}
          <div className="pb-4 border-b border-border">
            <span className="block text-xs font-semibold text-muted-foreground mb-2 doom-label">
              SIGNED IN AS
            </span>
            <span className="block text-sm text-foreground font-medium break-all">
              {userEmail}
            </span>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold text-foreground doom-label">
              THEME
            </span>
            <ThemeSelector />
          </div>

          {/* User Settings */}
          <button
            onClick={() => {
              setIsMenuOpen(false)
              setIsSettingsOpen(true)
            }}
            className="w-full px-4 py-3 bg-muted border-2 border-border hover:bg-secondary transition-colors doom-focus-ring font-semibold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
          >
            <Settings size={18} />
            Settings
          </button>

          {/* Sign Out Button */}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full px-4 py-3 bg-danger text-danger-foreground hover:bg-danger-hover doom-button-3d doom-focus-ring font-semibold uppercase tracking-wider text-sm"
            >
              SIGN OUT
            </button>
          </form>
        </div>
      </div>

      {/* User Settings Modal */}
      <UserSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        currentSettings={settings}
        onSave={updateSettings}
      />
    </>
  )
}
