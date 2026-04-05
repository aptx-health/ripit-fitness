'use client'

import { Activity, BookOpen, Dumbbell, LayoutGrid, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMounted } from '@/hooks/useMounted'
import {
  DebugOverlay,
  FullScreenModal,
  type Tab,
  TabContent,
  Z,
} from './components'

/**
 * Mobile Nav Spike — throwaway test page for validating:
 * 1. Bottom nav + keyboard interaction
 * 2. Z-index stacking (nav -> floating button -> full-screen modal)
 * 3. Safe area rendering (iOS home indicator, notch)
 * 4. PWA standalone mode
 * 5. Scroll position across tab switches
 * 6. Floating draft workout button positioning
 *
 * Test at: /dev/mobile-spike (best on real device)
 * Related: #287, #280, #288
 */

const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: 'training', label: 'Training', icon: Activity },
  { id: 'programs', label: 'Programs', icon: LayoutGrid },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function MobileSpikePage() {
  const [activeTab, setActiveTab] = useState<Tab>('training')
  const [hasDraft, setHasDraft] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [showDebug, setShowDebug] = useState(true)
  const mounted = useMounted()

  const scrollPositions = useRef<Record<Tab, number>>({
    training: 0,
    programs: 0,
    learn: 0,
    settings: 0,
  })
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = scrollPositions.current[activeTab]
    }
  }, [activeTab])

  const handleTabSwitch = (tab: Tab) => {
    if (contentRef.current) {
      scrollPositions.current[activeTab] = contentRef.current.scrollTop
    }
    setActiveTab(tab)
  }

  const handleOpenModal = () => {
    setModalOpen(true)
    setHasDraft(true)
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {showDebug && <DebugOverlay onClose={() => setShowDebug(false)} />}

      {/* Floating top elements — branding + draft button */}
      {!modalOpen && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-4"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
            zIndex: Z.floatingButton,
            pointerEvents: 'none',
          }}
        >
          <div
            className="rounded-full bg-muted/80 backdrop-blur-sm px-3 py-1.5 text-xs font-bold tracking-wider uppercase border border-border"
            style={{ pointerEvents: 'auto' }}
          >
            RIPIT
          </div>

          {hasDraft && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Reopen draft workout?')) {
                  setModalOpen(true)
                }
              }}
              className="min-h-12 min-w-12 flex items-center justify-center rounded-full bg-accent text-white shadow-lg animate-pulse"
              style={{ pointerEvents: 'auto' }}
              aria-label="Resume draft workout"
            >
              <Dumbbell className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Scrollable content area */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)',
          paddingBottom: '5rem',
        }}
      >
        <TabContent
          tab={activeTab}
          onOpenModal={handleOpenModal}
          hasDraft={hasDraft}
          onToggleDraft={() => setHasDraft(!hasDraft)}
        />
      </div>

      {/* Bottom nav — mobile only, hidden when modal is open */}
      {!modalOpen && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 border-t-2 border-border bg-muted/95 backdrop-blur-sm"
          style={{
            zIndex: Z.bottomNav,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          aria-label="Main navigation"
        >
          <div className="flex items-stretch h-14">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => handleTabSwitch(id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-12 min-w-12 transition-colors ${
                    isActive
                      ? 'text-accent'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {/* Full-screen workout logging modal — via portal */}
      {modalOpen &&
        mounted &&
        createPortal(
          <FullScreenModal
            onClose={() => setModalOpen(false)}
            onMinimize={() => {
              setModalOpen(false)
              setHasDraft(true)
            }}
          />,
          document.body
        )}

      {/* Toggle debug button — bottom right, above nav */}
      {!showDebug && !modalOpen && (
        <button
          type="button"
          onClick={() => setShowDebug(true)}
          className="md:hidden fixed right-3 bg-accent text-white rounded-full min-h-8 min-w-8 flex items-center justify-center text-xs font-bold shadow-lg"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)',
            zIndex: Z.floatingButton,
          }}
        >
          ?
        </button>
      )}
    </div>
  )
}
