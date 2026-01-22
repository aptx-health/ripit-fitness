'use client'

import { ReactNode } from 'react'

type ProgramCardProps = {
  isActive: boolean
  name: string
  description: string | null
  metadata?: ReactNode
  primaryActions: ReactNode
  utilityActionsDesktop?: ReactNode
  utilityActionsMobile?: ReactNode
}

export default function ProgramCard({
  isActive,
  name,
  description,
  metadata,
  primaryActions,
  utilityActionsDesktop,
  utilityActionsMobile,
}: ProgramCardProps) {
  return (
    <div
      className={`
        p-6 doom-noise doom-corners
        ${
          isActive
            ? 'bg-accent-muted border-2 border-accent'
            : 'bg-card border border-border hover:shadow-md transition'
        }
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          {isActive && (
            <span className="inline-block px-2 py-1 bg-accent text-accent-foreground text-xs font-semibold mb-2 doom-label uppercase tracking-wider">
              ACTIVE
            </span>
          )}
          <h2
            className={`font-bold text-foreground doom-heading uppercase ${
              isActive ? 'text-2xl' : 'text-xl'
            }`}
          >
            {name}
          </h2>
          {description && (
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {description}
            </p>
          )}
          {metadata && <div className="mt-2">{metadata}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4">
        {/* Desktop Layout */}
        <div className="hidden md:flex md:items-center md:justify-between">
          <div className="flex gap-3">{primaryActions}</div>
          {utilityActionsDesktop && (
            <div className="flex gap-2 ml-4">{utilityActionsDesktop}</div>
          )}
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-2">
          <div className="flex flex-col gap-2">{primaryActions}</div>
          {utilityActionsMobile && (
            <div className="flex gap-2 justify-center pt-2">
              {utilityActionsMobile}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
