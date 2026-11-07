'use client'

import * as Toast from '@radix-ui/react-toast'
import { AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { createContext, type ReactNode, useContext, useState } from 'react'

type ToastType = 'success' | 'error' | 'warning'

/** A button on the toast, such as Undo; tapping it runs onClick and closes the toast. */
export type ToastAction = { label: string; onClick: () => void }

type ToastMessage = {
  id: string
  type: ToastType
  title: string
  description?: string
  action?: ToastAction
}

type ToastContextType = {
  success: (title: string, description?: string, action?: ToastAction) => void
  error: (title: string, description?: string, action?: ToastAction) => void
  warning: (title: string, description?: string, action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (type: ToastType, title: string, description?: string, action?: ToastAction) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, type, title, description, action }])

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }

  const success = (title: string, description?: string, action?: ToastAction) => {
    addToast('success', title, description, action)
  }

  const error = (title: string, description?: string, action?: ToastAction) => {
    addToast('error', title, description, action)
  }

  const warning = (title: string, description?: string, action?: ToastAction) => {
    addToast('warning', title, description, action)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ success, error, warning }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            open={true}
            onOpenChange={(open) => {
              if (!open) removeToast(toast.id)
            }}
            className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-[100] sm:w-full sm:max-w-sm p-4 rounded-lg shadow-lg border animate-in slide-in-from-bottom-5 ${
              toast.type === 'success'
                ? 'bg-success text-success-foreground border-success'
                : toast.type === 'warning'
                  ? 'bg-warning text-warning-foreground border-warning'
                  : 'bg-error text-error-foreground border-error'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : toast.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <Toast.Title className="font-medium text-sm mb-1">{toast.title}</Toast.Title>
                {toast.description && (
                  <Toast.Description className="text-xs opacity-90">
                    {toast.description}
                  </Toast.Description>
                )}
              </div>
              {toast.action && (
                <Toast.Action asChild altText={toast.action.label}>
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick()
                      removeToast(toast.id)
                    }}
                    className="-my-2 flex min-h-12 flex-shrink-0 items-center px-3 text-sm font-bold uppercase tracking-wider underline underline-offset-4 hover:opacity-80 doom-focus-ring"
                  >
                    {toast.action.label}
                  </button>
                </Toast.Action>
              )}
              {/* 48px target; the negative margins keep the toast its usual height. */}
              <Toast.Close asChild>
                <button type="button"
                  className="-my-3 -mr-3 flex min-h-12 min-w-12 flex-shrink-0 items-center justify-center hover:opacity-80 transition-opacity doom-focus-ring"
                  aria-label="Close"
                  onMouseDown={(e) => {
                    e.preventDefault()
                  }}
                  onClick={(e) => {
                    // Allow the click to propagate for Toast.Close to work
                    e.currentTarget.blur()
                  }}
                >
                  <X size={18} />
                </button>
              </Toast.Close>
            </div>
          </Toast.Root>
        ))}
        <Toast.Viewport />
      </Toast.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
