'use client'

import { useState, useEffect, useRef } from 'react'
import { MoreVertical, AlertTriangle } from 'lucide-react'

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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom')
  const [confirmingAction, setConfirmingAction] = useState<ActionItem | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleMenuToggle = () => {
    if (disabled) return

    if (!isMenuOpen && buttonRef.current) {
      // Calculate if there's enough space below
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const menuHeight = actions.length * 48 + 16 // Approximate height

      // If not enough space below, show above
      setMenuPosition(spaceBelow < menuHeight ? 'top' : 'bottom')
    }
    setIsMenuOpen(!isMenuOpen)
  }

  const handleActionClick = (action: ActionItem) => {
    if (action.disabled) return

    if (action.requiresConfirmation) {
      setConfirmingAction(action)
      setIsMenuOpen(false)
    } else {
      action.onClick()
      if (action.hideAfterClick !== false) {
        setIsMenuOpen(false)
      }
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
    sm: 'h-8 w-8 text-sm',
    md: 'h-9 w-9 text-base',
    lg: 'h-10 w-10 text-lg'
  }

  const iconSizes = {
    sm: 16,
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
      <div className={`relative ${className}`}>
        <button
          ref={buttonRef}
          onClick={handleMenuToggle}
          disabled={disabled}
          className={`${label ? 'py-3 px-4' : sizeClasses[size]} flex items-center justify-center gap-2 cursor-pointer border-2 border-border transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className.includes('w-full') ? 'w-full' : label ? 'w-auto' : ''} ${className.includes('h-full') ? 'h-full' : ''}`}
          aria-label={label || 'Actions menu'}
          aria-expanded={isMenuOpen}
        >
          <Icon size={iconSizes[size]} className="flex-shrink-0" />
          {label && <span className="font-semibold whitespace-nowrap">{label}</span>}
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className={`absolute right-2 bg-card border-2 border-primary shadow-lg z-50 min-w-[200px] ${
              menuPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
            }`}
          >
            {actions.map((action, index) => {
              const ActionIcon = action.icon
              const isDisabled = action.disabled || false

              return (
                <button
                  key={index}
                  onClick={() => handleActionClick(action)}
                  disabled={isDisabled}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3 ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed bg-muted/50'
                      : getActionVariantClasses(action.variant)
                  } ${index > 0 ? 'border-t border-border' : ''}`}
                >
                  {ActionIcon && (
                    <ActionIcon size={18} className="flex-shrink-0" />
                  )}
                  <span className="flex-1">{action.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmingAction && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 dark:bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-card border-2 border-border rounded-lg p-6 text-center max-w-sm w-full shadow-xl">
            <div className="text-warning mb-4 flex justify-center">
              <AlertTriangle size={48} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Confirm Action
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {confirmingAction.confirmationMessage || 'Are you sure you want to proceed?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelConfirmation}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-secondary transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
                  confirmingAction.variant === 'danger'
                    ? 'bg-error text-error-foreground hover:bg-error-hover'
                    : 'bg-primary text-primary-foreground hover:bg-primary-hover'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
