'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Pencil } from 'lucide-react'
import { useRef, useState } from 'react'
import LoggerConfirm from './LoggerConfirm'

export type QuickAction = {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'danger'
  requiresConfirmation?: boolean
  /** The confirmation's title, e.g. "Delete Barbell Squat?". */
  confirmationTitle?: string
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
  /** Optional label rendered beside the trigger icon. */
  triggerLabel?: string
}

export default function ExerciseQuickActionsMenu({
  actions,
  triggerIcon: TriggerIcon = Pencil,
  heading = 'Edit Workout',
  triggerAriaLabel = 'Edit workout',
  triggerClassName = '',
  triggerLabel,
}: ExerciseQuickActionsMenuProps) {
  const [confirming, setConfirming] = useState<QuickAction | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  // The menu item that opened the confirmation is gone by the time it closes,
  // so focus goes back to the menu button.
  const closeConfirm = () => {
    setConfirming(null)
    requestAnimationFrame(() => trigger.current?.focus())
  }

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
            ref={trigger}
            type="button"
            aria-label={triggerAriaLabel}
            className={`relative inline-flex items-center justify-center gap-1.5 p-1 transition-colors doom-focus-ring before:content-[''] before:absolute before:-inset-2 ${triggerClassName}`}
          >
            <TriggerIcon size={16} strokeWidth={2.5} />
            {triggerLabel && (
              <span className="text-sm font-bold uppercase tracking-wider">
                {triggerLabel}
              </span>
            )}
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={8}
            align="end"
            collisionPadding={12}
            className="folder-box z-[100] min-w-[260px] bg-card border-2 border-secondary shadow-xl overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            {heading && (
              <div className="px-4 py-2.5 border-b border-border text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {heading}
              </div>
            )}

            <div className="divide-y divide-border">
              {actions.map((action, index) => {
                const Icon = action.icon
                const isDanger = action.variant === 'danger'
                return (
                  <DropdownMenu.Item
                    key={`${action.label}-${index}`}
                    onSelect={() => handleClick(action)}
                    disabled={action.disabled}
                    className={`min-h-12 px-4 py-3 flex items-center gap-3 cursor-pointer outline-none transition-colors text-base font-medium tracking-wide ${
                      action.disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : isDanger
                          ? 'text-error data-[highlighted]:bg-error/10'
                          : 'text-foreground data-[highlighted]:bg-muted'
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

      <LoggerConfirm
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) closeConfirm()
        }}
        title={confirming?.confirmationTitle ?? 'Confirm action'}
        body={confirming?.confirmationMessage || 'Are you sure you want to proceed?'}
        confirmLabel={confirming?.variant === 'danger' ? 'Delete' : 'Confirm'}
        onConfirm={() => {
          confirming?.onClick()
          closeConfirm()
        }}
        destructive={confirming?.variant === 'danger'}
      />
    </>
  )
}
