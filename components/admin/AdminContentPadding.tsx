'use client'

import { usePathname } from 'next/navigation'

// Routes whose page component already brings its own container/padding
// (the Workbench launcher is intentionally full-bleed; these two already
// render `max-w-7xl mx-auto px-4 ... py-8` themselves) — wrapping them again
// here would double the padding.
const SELF_PADDED_EXACT = new Set(['/admin', '/admin/exercises'])

function isSelfPadded(pathname: string): boolean {
  if (SELF_PADDED_EXACT.has(pathname)) return true
  if (pathname.endsWith('/edit-structure')) return true
  return false
}

/**
 * Every other admin section page renders its content as a bare `<div>` with
 * no padding or max-width of its own — they were relying on the previous
 * flat-nav layout's shared wrapper for that. This restores it in one place
 * instead of patching a dozen individual pages.
 */
export default function AdminContentPadding({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isSelfPadded(pathname)) {
    return <>{children}</>
  }

  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</div>
}
