'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ThemeSelector } from '@/components/ThemeSelector'
import { EasterEggModal } from '@/components/EasterEggModal'

type Props = {
  userEmail: string
}

export default function Header({ userEmail }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showEasterEgg, setShowEasterEgg] = useState(false)
  const [clickCount, setClickCount] = useState(0)

  const handleLogoClick = () => {
    const newCount = clickCount + 1
    setClickCount(newCount)

    if (newCount >= 3) {
      setShowEasterEgg(true)
      setClickCount(0) // Reset counter
    }
  }

  return (
    <>
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo + Nav Links */}
            <div className="flex items-center gap-4 sm:gap-8">
              <button
                onClick={handleLogoClick}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/frog-icon-64x64.png"
                  alt="Ripit"
                  width={32}
                  height={32}
                  className="rounded"
                />
                <span className="text-xl font-bold text-foreground">Ripit</span>
              </button>
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
                  className="text-xs sm:text-sm font-semibold text-foreground hover:text-accent doom-link uppercase tracking-wider"
                >
                  Strength
                </Link>
                <Link
                  href="/cardio"
                  className="text-xs sm:text-sm font-semibold text-foreground hover:text-accent doom-link uppercase tracking-wider"
                >
                  Cardio
                </Link>
              </div>
            </div>

            {/* Right: Desktop Menu (hidden on mobile) */}
            <div className="hidden md:flex items-center space-x-4">
              <ThemeSelector />
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
          overflow: isMenuOpen ? 'visible' : 'hidden'
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

      {/* Easter Egg Modal */}
      <EasterEggModal
        isOpen={showEasterEgg}
        onClose={() => setShowEasterEgg(false)}
      />
    </>
  )
}
