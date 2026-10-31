import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { libraryHref } from '@/lib/library/links'

/** The program detail page's back link, styled like the settings subpages'. */
export default function ProgramBackLink() {
  return (
    <Link
      href={libraryHref({ type: 'programs' })}
      className="relative inline-flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground doom-focus-ring before:content-[''] before:absolute before:-inset-3"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Library
    </Link>
  )
}
