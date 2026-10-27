'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Scoped to exercises for this prototype — the user arrives knowing what
 * they want, and typing beats browsing, but full cross-entity search is
 * out of scope. Still visually primary per spec.
 */
export default function WorkbenchSearch() {
  const [value, setValue] = useState('')
  const router = useRouter()

  const submit = () => {
    const q = value.trim()
    router.push(q ? `/admin/exercises?q=${encodeURIComponent(q)}` : '/admin/exercises')
  }

  return (
    <div className="relative">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
        placeholder="Search everything…"
        aria-label="Search everything"
        className="w-full h-[50px] pl-10 pr-3 border-2 border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-base"
      />
    </div>
  )
}
