'use client'

import { ArrowLeft, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { findNavItemForPath } from '@/lib/admin/navigation'

/**
 * Phone-only header. `/admin` itself renders the Workbench brand + exit;
 * every section route renders a back chevron + section name instead.
 */
export default function AdminMobileHeader() {
  const pathname = usePathname()
  const isHome = pathname === '/admin'
  const navItem = findNavItemForPath(pathname)

  return (
    <header className="flex items-center h-12 px-4 shrink-0 border-b-[3px] border-accent bg-card lg:hidden">
      {isHome ? (
        <>
          <span className="text-lg font-bold uppercase tracking-wider text-foreground">
            Workbench
          </span>
          <Link
            href="/settings"
            aria-label="Exit workbench"
            className="ml-auto flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Exit
            <X size={16} />
          </Link>
        </>
      ) : (
        <>
          <Link
            href="/admin"
            aria-label="Back to Workbench"
            className="flex items-center justify-center -ml-1 mr-2 w-9 h-9 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={20} />
          </Link>
          <span className="text-lg font-bold uppercase tracking-wider text-foreground truncate">
            {navItem?.label ?? 'Admin'}
          </span>
        </>
      )}
    </header>
  )
}
