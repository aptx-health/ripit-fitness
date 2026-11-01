'use client'

import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { type ReactNode, useLayoutEffect, useRef } from 'react'
import PaperTabTitle, { type PaperTabTitleTone } from '@/components/ui/PaperTabTitle'

/**
 * The workout logger's one confirmation: a paper-tab title on a folder box, a
 * one-line body, an outline Cancel and one filled action (`bg-error` only when
 * destructive), plus an optional outline secondary (Exit's "Discard").
 *
 * A real alert dialog (Radix AlertDialog): labelled by the title, described
 * by the body, focus trapped, Escape = Cancel. There is no Radix Trigger (the
 * callers open it from state), so it remembers what had focus when it opened
 * and puts focus back there when it closes.
 */

const BUTTON =
  'inline-flex min-h-12 items-center justify-center px-4 text-sm font-bold uppercase tracking-wider doom-focus-ring disabled:cursor-not-allowed disabled:opacity-50'
const OUTLINE = 'border-2 border-border bg-card text-foreground hover:bg-muted'

export default function LoggerConfirm({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
  destructive = false,
  cancelLabel = 'Cancel',
  secondaryLabel,
  onSecondary,
  busy = false,
  secondaryDisabled = false,
  tone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: ReactNode
  confirmLabel: string
  onConfirm: () => void
  destructive?: boolean
  cancelLabel?: string
  secondaryLabel?: string
  onSecondary?: () => void
  /** Disables Cancel and the action (and Escape). The secondary stays live: it may be what is running. */
  busy?: boolean
  /** Disables the secondary, e.g. Exit's Discard while the discard is in flight. */
  secondaryDisabled?: boolean
  tone?: PaperTabTitleTone
}) {
  // What had focus when the dialog opened; captured before Radix moves focus in.
  const opener = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      opener.current = document.activeElement
    }
  }, [open])

  const returnFocus = () => {
    const el = opener.current
    opener.current = null
    if (el?.isConnected) el.focus()
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && busy) return
        onOpenChange(next)
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <AlertDialog.Content
          className="fixed left-1/2 top-1/2 z-[60] w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocus()
          }}
        >
          <div className="flex items-end">
            <PaperTabTitle tone={tone ?? (destructive ? 'quiet' : 'mine')} asChild>
              <AlertDialog.Title>{title}</AlertDialog.Title>
            </PaperTabTitle>
          </div>
          <div className={`folder-box border-2 bg-card shadow-xl ${destructive ? 'border-border' : 'border-secondary'}`}>
            <AlertDialog.Description asChild>
              <div className="px-4 py-4 text-sm text-foreground">{body}</div>
            </AlertDialog.Description>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  disabled={busy}
                  onClick={(event) => {
                    if (busy) event.preventDefault()
                  }}
                  className={`${BUTTON} ${OUTLINE}`}
                >
                  {cancelLabel}
                </button>
              </AlertDialog.Cancel>
              {secondaryLabel && onSecondary && (
                <button
                  type="button"
                  disabled={secondaryDisabled}
                  onClick={() => {
                    if (!secondaryDisabled) onSecondary()
                  }}
                  className={`${BUTTON} border-2 border-border bg-card text-error hover:bg-muted`}
                >
                  {secondaryLabel}
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!busy) onConfirm()
                }}
                className={`${BUTTON} ${
                  destructive
                    ? 'bg-error text-error-foreground hover:bg-error-hover'
                    : 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_3px_0_var(--primary-active)]'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
