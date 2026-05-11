'use client'

import { Download, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useBeforeInstallPrompt } from '@/hooks/useBeforeInstallPrompt'
import { PwaInstallPrompt } from '@/components/features/training/PwaInstallPrompt'
import { trackEvent } from '@/lib/analytics'

const DISMISS_KEY = 'pwa-install-button-dismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  if (process.env.NODE_ENV === 'development') {
    const debugParam = new URLSearchParams(window.location.search).get('debugPwa')
    if (debugParam === 'ios' || debugParam === 'android') return true
  }
  return /iPad|iPhone|iPod|Android/.test(navigator.userAgent)
}

export function PwaInstallButton() {
  const [visible, setVisible] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const { deferredPrompt } = useBeforeInstallPrompt()
  const pathname = usePathname()
  const isAdminPage = pathname.startsWith('/admin')

  useEffect(() => {
    if (isStandalone()) return
    if (!isMobileDevice()) return
    if (localStorage.getItem(DISMISS_KEY)) return
    setVisible(true)
  }, [])

  // Listen for app install to auto-hide
  useEffect(() => {
    const handler = () => setVisible(false)
    window.addEventListener('appinstalled', handler)
    return () => window.removeEventListener('appinstalled', handler)
  }, [])

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
    trackEvent('pwa_button_dismissed')
  }, [])

  const handleClick = useCallback(() => {
    setShowPrompt(true)
    trackEvent('pwa_button_tapped')
  }, [])

  const handlePromptClose = useCallback(() => {
    setShowPrompt(false)
  }, [])

  const handleInstalled = useCallback(() => {
    setShowPrompt(false)
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }, [])

  if (!visible || isAdminPage) return null

  return (
    <>
      <div
        className="md:hidden fixed right-3 z-[39] animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{
          bottom: 'calc(3.75rem + env(safe-area-inset-bottom, 0px) + 10px)',
        }}
      >
        <button
          type="button"
          onClick={handleClick}
          className="pwa-install-btn relative flex items-center gap-1.5 pl-3 pr-2 py-2 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 text-sm font-bold uppercase tracking-wider"
          aria-label="Install app"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Install</span>
          <span
            role="button"
            tabIndex={0}
            onClick={handleDismiss}
            onKeyDown={(e) => e.key === 'Enter' && handleDismiss(e as unknown as React.MouseEvent)}
            className="ml-0.5 p-0.5 rounded-full hover:bg-primary-foreground/20 transition-colors"
            aria-label="Dismiss install button"
          >
            <X className="h-3 w-3" />
          </span>
        </button>
      </div>

      <PwaInstallPrompt
        open={showPrompt}
        onClose={handlePromptClose}
        onInstalled={handleInstalled}
        deferredPrompt={deferredPrompt}
      />
    </>
  )
}
