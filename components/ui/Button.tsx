'use client'

import { type ButtonHTMLAttributes, forwardRef } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'success'
    | 'danger'
    | 'ghost'
    | 'outline'
    | 'rare-rounded'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  doom?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className = '',
    variant = 'primary',
    size = 'md',
    loading = false,
    doom = false,
    disabled,
    children,
    ...props
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantStyles = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active focus:ring-primary',
      secondary: 'bg-muted text-foreground hover:bg-secondary-hover hover:text-foreground focus:ring-border',
      accent: 'bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active focus:ring-accent',
      success: 'bg-success text-success-foreground hover:bg-success-hover focus:ring-success',
      // `danger` is reserved for ACTUAL destructive actions: delete logged set,
      // abandon program, discard draft. NOT for CANCEL / back-out / dismiss.
      // For CANCEL inside a drawer or modal, use:
      //   <Button variant="secondary">Cancel</Button>                                  — full muted fill
      //   <Button variant="secondary" className="text-error">Cancel</Button>            — muted fill, red text cue (per logger reference)
      // Red on CANCEL trains users to ignore red as a real signal — keep `danger` for
      // commits that lose data.
      danger: 'bg-error text-error-foreground hover:bg-error-hover focus:ring-error',
      ghost: 'bg-transparent hover:bg-muted text-foreground',
      outline: 'border-2 border-border bg-transparent hover:bg-muted text-foreground',
      // `rare-rounded` is the eye-draw exception to the hard-corners-by-default rule
      // (DESIGN.md §5). Banana-gold fill, rounded corners — used at most once per
      // screen as the primary action the user is expected to tap next (e.g. the
      // follow-along NEXT EXERCISE button). Pair with `doom` for the press
      // treatment. The rounded corners override `doom-button-3d`'s square shape.
      'rare-rounded': 'bg-warning text-warning-foreground hover:bg-warning-hover focus:ring-warning rounded-md',
    }

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    }

    // `rare-rounded` carries its own `rounded-md` from the variant string and
    // keeps it under `doom={true}` (the eye-draw exception). Every other
    // variant becomes square under `doom`, otherwise gets `rounded-lg`.
    const shapeStyles =
      variant === 'rare-rounded'
        ? doom
          ? 'doom-button-3d'
          : ''
        : doom
          ? 'doom-button-3d'
          : 'rounded-lg'

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${shapeStyles} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg aria-hidden="true"
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
