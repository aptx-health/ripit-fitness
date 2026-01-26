'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import * as Toast from '@radix-ui/react-toast'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'

type ToastMessage = {
  id: string
  type: ToastType
  title: string
  description?: string
}

type ToastContextType = {
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (type: ToastType, title: string, description?: string) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, type, title, description }])

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }

  const success = (title: string, description?: string) => {
    addToast('success', title, description)
  }

  const error = (title: string, description?: string) => {
    addToast('error', title, description)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ success, error }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            open={true}
            onOpenChange={(open) => {
              if (!open) removeToast(toast.id)
            }}
            className={`fixed bottom-4 right-4 z-[100] w-full max-w-sm p-4 rounded-lg shadow-lg border animate-in slide-in-from-bottom-5 ${
              toast.type === 'success'
                ? 'bg-success text-success-foreground border-success'
                : 'bg-error text-error-foreground border-error'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
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
              <Toast.Close asChild>
                <button
                  className="flex-shrink-0 hover:opacity-80 transition-opacity"
                  aria-label="Close"
                  onClick={(e) => {
                    e.preventDefault()
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
