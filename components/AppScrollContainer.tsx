'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { APP_SCROLL_ID } from '@/lib/nav/app-scroll'

/**
 * The one scroll container for (app) pages on mobile. Next.js resets the
 * window on navigation, not this element, so reset it when the path changes.
 * On desktop it is a plain block and the window scrolls.
 */
export default function AppScrollContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on path change
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
  }, [pathname])

  return (
    <div
      ref={ref}
      id={APP_SCROLL_ID}
      className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-20 md:flex-none md:overflow-visible md:pb-0"
    >
      {children}
    </div>
  )
}
