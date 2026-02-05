'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical, AlertTriangle } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

export type ActionItem = {
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  onClick: () => void
  disabled?: boolean
  requiresConfirmation?: boolean
  confirmationMessage?: string
  variant?: 'default' | 'danger' | 'success' | 'warning'
  hideAfterClick?: boolean // Default true - closes menu after action
}

type ActionsMenuProps = {
  actions: ActionItem[]
  label?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'accent'
  className?: string
}

export default function ActionsMenu({
  actions,
  label,
  icon: Icon = MoreVertical,
  disabled = false,
  size = 'md',
  variant = 'default',
  className = ''
}: ActionsMenuProps) {
  const [confirmingAction, setConfirmingAction] = useState<ActionItem | null>(null)

  const handleActionClick = (action: ActionItem) => {
    if (action.disabled) return

    if (action.requiresConfirmation) {
      setConfirmingAction(action)
    } else {
      action.onClick()
    }
  }

  const handleConfirmAction = () => {
    if (confirmingAction) {
      confirmingAction.onClick()
      setConfirmingAction(null)
    }
  }

  const handleCancelConfirmation = () => {
    setConfirmingAction(null)
  }

  // Size classes
  const sizeClasses = {
    sm: 'p-2 text-sm',
    md: 'h-9 w-9 text-base',
    lg: 'h-10 w-10 text-lg'
  }

  const iconSizes = {
    sm: 20,
    md: 20,
    lg: 24
  }

  // Variant classes for button
  const variantClasses = {
    default: 'bg-muted hover:bg-secondary',
    primary: 'bg-primary-muted hover:bg-primary hover:border-primary hover:text-white',
    accent: 'bg-accent hover:bg-accent-hover text-white'
  }

  // Variant classes for action items
  const getActionVariantClasses = (itemVariant: ActionItem['variant'] = 'default') => {
    switch (itemVariant) {
      case 'danger':
        return 'hover:bg-error hover:text-error-foreground'
      case 'success':
        return 'hover:bg-success hover:text-success-foreground'
      case 'warning':
        return 'hover:bg-warning hover:text-warning-foreground'
      default:
        return 'hover:bg-muted'
    }
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            disabled={disabled}
            className={`${label ? 'py-3 px-4' : sizeClasses[size]} flex items-center justify-center gap-2 cursor-pointer border-2 border-border transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className.includes('w-full') ? 'w-full' : label ? 'w-auto' : ''} ${className.includes('h-full') ? 'h-full' : ''}`}
            aria-label={label || 'Actions menu'}
          >
            <Icon size={iconSizes[size]} className="flex-shrink-0" />
            {label && <span className="font-semibold whitespace-nowrap">{label}</span>}
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="bg-card border-2 border-primary shadow-lg z-50 min-w-[200px]"
            sideOffset={5}
            align="end"
          >
            {actions.map((action, index) => {
              const ActionIcon = action.icon
              const isDisabled = action.disabled || false

              return (
                <DropdownMenu.Item
                  key={index}
                  onClick={() => handleActionClick(action)}
                  disabled={isDisabled}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3 cursor-pointer outline-none ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed bg-muted/50'
                      : getActionVariantClasses(action.variant)
                  } ${index > 0 ? 'border-t border-border' : ''}`}
                >
                  {ActionIcon && (
                    <ActionIcon size={18} className="flex-shrink-0" />
                  )}
                  <span className="flex-1">{action.label}</span>
                </DropdownMenu.Item>
              )
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Confirmation Dialog - Portal to body for z-index */}
      {confirmingAction && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-card border-2 border-border p-6 text-center max-w-sm w-full shadow-xl doom-corners doom-noise">
            <div className="text-warning mb-4 flex justify-center">
              <AlertTriangle size={48} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2 doom-heading uppercase">
              Confirm Action
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {confirmingAction.confirmationMessage || 'Are you sure you want to proceed?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelConfirmation}
                className="flex-1 px-4 py-2 bg-muted text-foreground hover:bg-secondary transition-colors font-semibold uppercase tracking-wide border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 px-4 py-2 transition-colors font-semibold uppercase tracking-wide doom-button-3d ${
                  confirmingAction.variant === 'danger'
                    ? 'bg-error text-error-foreground hover:bg-error-hover'
                    : confirmingAction.variant === 'warning'
                      ? 'bg-warning text-warning-foreground hover:bg-warning-hover'
                      : 'bg-primary text-primary-foreground hover:bg-primary-hover'
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
