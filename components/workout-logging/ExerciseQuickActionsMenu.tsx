'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { AlertTriangle, Pencil } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'

export type QuickAction = {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'danger'
  requiresConfirmation?: boolean
  confirmationMessage?: string
}

type ExerciseQuickActionsMenuProps = {
  actions: QuickAction[]
  /** Optional override for the trigger icon. Defaults to a pencil. */
  triggerIcon?: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  /** Optional menu heading rendered above the action list. */
  heading?: string
  /** Optional override for the trigger button's accessible label. */
  triggerAriaLabel?: string
  /** Tailwind classes to merge into the trigger button (color/state, etc). */
  triggerClassName?: string
}

export default function ExerciseQuickActionsMenu({
  actions,
  triggerIcon: TriggerIcon = Pencil,
  heading = 'Edit Workout',
  triggerAriaLabel = 'Edit workout',
  triggerClassName = '',
}: ExerciseQuickActionsMenuProps) {
  const [confirming, setConfirming] = useState<QuickAction | null>(null)

  const handleClick = (action: QuickAction) => {
    if (action.disabled) return
    if (action.requiresConfirmation) {
      setConfirming(action)
    } else {
      action.onClick()
    }
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={triggerAriaLabel}
            className={`p-1 transition-colors doom-focus-ring ${triggerClassName}`}
          >
            <TriggerIcon size={20} strokeWidth={2.5} />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={8}
            align="end"
            collisionPadding={12}
            className="z-[80] min-w-[260px] bg-card border-2 border-primary doom-corners shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            {heading && (
              <div className="px-4 py-2.5 border-b-2 border-border bg-primary/10">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {heading}
                </span>
              </div>
            )}

            <div className="py-1">
              {actions.map((action, index) => {
                const Icon = action.icon
                const isDanger = action.variant === 'danger'
                return (
                  <DropdownMenu.Item
                    key={`${action.label}-${index}`}
                    onSelect={(e) => {
                      // Keep menu open until our handler decides (confirmation flow).
                      e.preventDefault()
                      handleClick(action)
                    }}
                    disabled={action.disabled}
                    className={`min-h-[52px] px-4 py-3 flex items-center gap-3 cursor-pointer outline-none transition-colors text-base font-medium tracking-wide ${
                      action.disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : isDanger
                          ? 'text-error data-[highlighted]:bg-error/10'
                          : 'text-foreground data-[highlighted]:bg-primary/10'
                    }`}
                  >
                    <Icon
                      size={20}
                      strokeWidth={2.25}
                      className={`flex-shrink-0 ${isDanger ? 'text-error' : 'text-primary'}`}
                    />
                    <span className="flex-1">{action.label}</span>
                  </DropdownMenu.Item>
                )
              })}
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {confirming && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100 }}
          className="backdrop-blur-md bg-black/50 flex items-center justify-center p-4"
        >
          <div className="bg-card border-2 border-border p-6 text-center max-w-sm w-full shadow-xl doom-corners">
            <div className="text-warning mb-4 flex justify-center">
              <AlertTriangle size={48} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2 uppercase tracking-wider">
              Confirm Action
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {confirming.confirmationMessage || 'Are you sure you want to proceed?'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="flex-1 px-4 py-2.5 bg-muted text-foreground hover:bg-secondary transition-colors font-semibold uppercase tracking-wide border-2 border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirming.onClick()
                  setConfirming(null)
                }}
                className={`flex-1 px-4 py-2.5 transition-colors font-semibold uppercase tracking-wide border-2 ${
                  confirming.variant === 'danger'
                    ? 'bg-error text-error-foreground hover:bg-error-hover border-error'
                    : 'bg-primary text-primary-foreground hover:bg-primary-hover border-primary-active'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
