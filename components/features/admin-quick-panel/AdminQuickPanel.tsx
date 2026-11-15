'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronLeft, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import {
  loadQuickPanelPrefs,
  type QuickPanelPrefs,
  saveQuickPanelPrefs,
  type TouchStyle,
} from '@/lib/admin/quick-panel-prefs'
import TouchIndicators from './TouchIndicators'

/**
 * Admin-only edge tab and side drawer. Rendered by the (app) layout for
 * admins only. Starts with touch indicators for recording tutorials.
 *
 * Z-indexes sit above everything in the app (the highest in use is 9999), so
 * the tab still shows over loggers and sheets; the touch layer is above these.
 */
const TAB_Z = 10000
const OVERLAY_Z = 10001
const DRAWER_Z = 10002

const STYLE_OPTIONS = [
  { value: 'ring', label: 'Ring' },
  { value: 'trail', label: 'Trail' },
] as const

export default function AdminQuickPanel() {
  const [open, setOpen] = useState(false)
  const [prefs, setPrefs] = useState<QuickPanelPrefs>(loadQuickPanelPrefs)

  const tabRef = useRef<HTMLButtonElement>(null)

  // An open Radix sheet closes on any pointerdown outside it, heard on the
  // document. Stop the tab's pointerdown at the tab so the sheet stays open.
  // (A native listener: React's own listener sits on the document too.)
  useEffect(() => {
    const el = tabRef.current
    if (!el) return
    const stop = (e: PointerEvent) => e.stopPropagation()
    el.addEventListener('pointerdown', stop)
    return () => el.removeEventListener('pointerdown', stop)
  }, [])

  const update = (next: Partial<QuickPanelPrefs>) => {
    const merged = { ...prefs, ...next }
    setPrefs(merged)
    saveQuickPanelPrefs(merged)
  }

  const recording = prefs.touchIndicators

  return (
    <>
      {/* The hit area stays 20px wide; while recording only a faint 5px sliver shows. */}
      <button
        ref={tabRef}
        type="button"
        aria-label="Open admin panel"
        data-recording={recording ? 'true' : 'false'}
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          top: '46%',
          zIndex: TAB_Z,
          width: 20,
          height: 56,
          pointerEvents: 'auto',
        }}
        className="right-[env(safe-area-inset-right,0px)] flex items-center justify-end doom-focus-ring"
      >
        {recording ? (
          <span aria-hidden="true" className="block h-11 w-[5px] rounded-l bg-primary opacity-35" />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-[18px] items-center justify-center rounded-l-lg border border-r-0 border-primary bg-primary-muted text-primary"
          >
            <ChevronLeft size={14} strokeWidth={3} />
          </span>
        )}
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            data-testid="admin-panel-overlay"
            style={{ position: 'fixed', inset: 0, zIndex: OVERLAY_Z }}
            className="bg-black/55"
          />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            style={{
              position: 'fixed',
              right: 0,
              top: 'calc(env(safe-area-inset-top, 0px) + 60px)',
              zIndex: DRAWER_Z,
              width: 'min(300px, calc(100vw - 48px))',
              maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 120px)',
              paddingRight: 'env(safe-area-inset-right, 0px)',
              boxShadow: '-12px 0 30px rgba(0,0,0,0.5)',
            }}
            className="flex flex-col overflow-y-auto border border-r-0 border-t-[3px] border-border border-t-primary bg-card text-card-foreground"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <DialogPrimitive.Title className="text-sm font-bold uppercase tracking-widest">
                Admin
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground doom-focus-ring"
              >
                <X size={20} />
              </DialogPrimitive.Close>
            </div>

            <div className="px-4 pt-3 pb-1 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              Recording
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={prefs.touchIndicators}
              onClick={() => update({ touchIndicators: !prefs.touchIndicators })}
              className="group flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left doom-focus-ring"
            >
              <span>
                <span className="block text-sm font-semibold">Touch indicators</span>
                <span className="block text-xs text-muted-foreground">Show a circle where you tap</span>
              </span>
              <span
                aria-hidden="true"
                className={`relative inline-flex h-7 w-12 min-w-12 shrink-0 items-center rounded-full border-2 transition-colors ${
                  prefs.touchIndicators ? 'border-primary bg-primary' : 'border-border bg-muted group-hover:border-primary'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full transition-transform ${
                    prefs.touchIndicators ? 'translate-x-[22px] bg-primary-foreground' : 'translate-x-[2px] bg-muted-foreground'
                  }`}
                />
              </span>
            </button>

            <div className="flex items-center justify-between gap-3 px-4 py-2 pb-4">
              <span className="text-sm font-semibold">Style</span>
              <SegmentedControl<TouchStyle>
                aria-label="Touch indicator style"
                options={STYLE_OPTIONS}
                value={prefs.touchStyle}
                onChange={(touchStyle) => update({ touchStyle })}
                tone="bold"
                className="w-36 border border-border"
              />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {recording && <TouchIndicators touchStyle={prefs.touchStyle} />}
    </>
  )
}
