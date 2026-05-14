'use client'

import { ChevronLeft, ChevronRight, Lightbulb, Lock, Plus } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

/**
 * Theme Validator — sample primitives.
 *
 * These render every milestone primitive in every variant so we can
 * eyeball them across all twelve themes. When real primitives ship
 * under Phase 1 (#729, #730, #731), the stub helpers below should
 * be replaced with imports from `components/ui/`.
 *
 * Stubs intentionally use only theme tokens (var(--*)). If a primitive
 * migration uses hex literals or hand-rolled rgba, the side-by-side
 * grid view will show it as a glitch in one theme.
 */

// ============================================================================
// Stub primitives — replace with real imports as Phase 1 PRs land
// ============================================================================

function SegmentedControlStub({
  segments,
  value,
  onChange,
  size = 'md',
}: {
  segments: string[]
  value: string
  onChange: (next: string) => void
  size?: 'sm' | 'md'
}) {
  const padding = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-base'
  return (
    <div
      className="inline-flex items-stretch border-2 bg-card"
      style={{ borderColor: 'var(--border)' }}
      role="tablist"
    >
      {segments.map((seg) => {
        const isActive = seg === value
        return (
          <button
            type="button"
            key={seg}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(seg)}
            className={`${padding} font-semibold uppercase tracking-wider transition-colors min-h-12 ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-foreground hover:bg-muted'
            }`}
          >
            {seg}
          </button>
        )
      })}
    </div>
  )
}

function TipAnnotationStub({
  variant = 'default',
  children,
}: {
  variant?: 'default' | 'first-run'
  children: ReactNode
}) {
  const isFirstRun = variant === 'first-run'
  return (
    <div
      className="relative border-2 border-dashed p-4 text-sm"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--muted)',
        color: 'var(--foreground)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center"
          style={{
            background: isFirstRun ? 'var(--accent)' : 'var(--primary)',
            color: isFirstRun
              ? 'var(--accent-foreground)'
              : 'var(--primary-foreground)',
          }}
          aria-hidden
        >
          {isFirstRun ? '🐸' : <Lightbulb className="h-4 w-4" />}
        </div>
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function CreateNewCardStub({
  label,
  locked = false,
  onClick,
}: {
  label: string
  locked?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className="flex min-h-24 w-full items-center justify-center gap-3 border-2 border-dashed p-4 text-sm font-semibold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        borderColor: 'var(--border)',
        background: 'transparent',
        color: 'var(--foreground)',
      }}
    >
      {locked ? <Lock className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      <span>{label}</span>
    </button>
  )
}

function ProgressBarStub({
  value,
  label,
}: {
  value: number
  label?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="space-y-1">
      {label !== undefined && (
        <div
          className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div
        className="h-3 w-full overflow-hidden border-2"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--muted)',
        }}
      >
        <div
          className="h-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            background: 'var(--primary)',
          }}
        />
      </div>
    </div>
  )
}

function PageTitleStampStub({ children }: { children: ReactNode }) {
  return (
    <h2
      className="doom-corners inline-block px-4 py-2 text-lg font-bold uppercase tracking-wider"
      style={{
        background: 'var(--card)',
        color: 'var(--foreground)',
        border: '2px solid var(--border)',
      }}
    >
      {children}
    </h2>
  )
}

function BadgeStub({
  tone,
  children,
}: {
  tone: 'success' | 'warning' | 'error' | 'primary'
  children: ReactNode
}) {
  const toneVar = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    error: 'var(--error)',
    primary: 'var(--primary)',
  }[tone]
  const fgVar = {
    success: 'var(--success-foreground)',
    warning: 'var(--warning-foreground)',
    error: 'var(--error-foreground)',
    primary: 'var(--primary-foreground)',
  }[tone]
  return (
    <span
      className="doom-badge"
      style={{ background: toneVar, color: fgVar }}
    >
      {children}
    </span>
  )
}

// ============================================================================
// Token swatch overlay
// ============================================================================

const SWATCH_TOKENS = [
  '--background',
  '--foreground',
  '--card',
  '--muted',
  '--border',
  '--primary',
  '--primary-foreground',
  '--accent',
  '--success',
  '--warning',
  '--error',
] as const

export function TokenSwatches({
  scopeRef,
}: {
  scopeRef?: React.RefObject<HTMLElement | null>
}) {
  const [tokens, setTokens] = useState<{ name: string; value: string }[]>([])

  useEffect(() => {
    const compute = () => {
      const root: Element =
        scopeRef?.current ?? document.documentElement
      const cs = getComputedStyle(root)
      setTokens(
        SWATCH_TOKENS.map((name) => ({
          name,
          value: cs.getPropertyValue(name).trim(),
        }))
      )
    }
    compute()
    // Re-compute on theme change (data-theme/data-mode attr changes)
    const observer = new MutationObserver(compute)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-mode'],
    })
    if (scopeRef?.current) {
      observer.observe(scopeRef.current, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-mode'],
      })
    }
    return () => observer.disconnect()
  }, [scopeRef])

  return (
    <div className="flex flex-wrap gap-2">
      {tokens.map((t) => (
        <div
          key={t.name}
          className="flex items-center gap-2 border px-2 py-1 text-[11px] font-mono"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--card)',
            color: 'var(--foreground)',
          }}
        >
          <span
            className="inline-block h-4 w-4 border"
            style={{
              background: t.value || 'transparent',
              borderColor: 'var(--border)',
            }}
            aria-hidden
          />
          <span className="opacity-70">{t.name}</span>
          <span>{t.value || '—'}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Primitive grid — renders every milestone primitive once
// ============================================================================

export function PrimitiveGrid({
  showSwatches = false,
  compact = false,
}: {
  showSwatches?: boolean
  compact?: boolean
}) {
  const [segValue, setSegValue] = useState('Week 1')
  const [seg2Value, setSeg2Value] = useState('On')

  const headingClass = compact
    ? 'text-[11px] font-bold uppercase tracking-wider'
    : 'text-xs font-bold uppercase tracking-wider'
  const sectionGap = compact ? 'space-y-2' : 'space-y-3'
  const groupGap = compact ? 'space-y-3' : 'space-y-6'

  return (
    <div className={groupGap}>
      {showSwatches && (
        <section className={sectionGap}>
          <h3
            className={headingClass}
            style={{ color: 'var(--muted-foreground)' }}
          >
            Resolved tokens
          </h3>
          <TokenSwatches />
        </section>
      )}

      <section className={sectionGap}>
        <h3
          className={headingClass}
          style={{ color: 'var(--muted-foreground)' }}
        >
          Buttons — flat
        </h3>
        <div className="flex flex-wrap items-start gap-2">
          <Button variant="primary" size={compact ? 'sm' : 'md'}>
            Primary
          </Button>
          <Button variant="secondary" size={compact ? 'sm' : 'md'}>
            Secondary
          </Button>
          <Button variant="accent" size={compact ? 'sm' : 'md'}>
            Accent
          </Button>
          <Button variant="success" size={compact ? 'sm' : 'md'}>
            Success
          </Button>
          <Button variant="danger" size={compact ? 'sm' : 'md'}>
            Danger
          </Button>
          <Button variant="ghost" size={compact ? 'sm' : 'md'}>
            Ghost
          </Button>
          <Button variant="outline" size={compact ? 'sm' : 'md'}>
            Outline
          </Button>
          <Button variant="primary" size={compact ? 'sm' : 'md'} disabled>
            Disabled
          </Button>
          <Button variant="primary" size={compact ? 'sm' : 'md'} loading>
            Loading
          </Button>
        </div>
      </section>

      {!compact && (
        <section className={sectionGap}>
          <h3
            className={headingClass}
            style={{ color: 'var(--muted-foreground)' }}
          >
            Buttons — DOOM 3D variant
          </h3>
          <div className="flex flex-wrap items-start gap-2">
            <Button variant="primary" doom>
              Primary
            </Button>
            <Button variant="accent" doom>
              Accent
            </Button>
            <Button variant="primary" doom disabled>
              Disabled
            </Button>
          </div>
        </section>
      )}

      <section className={sectionGap}>
        <h3
          className={headingClass}
          style={{ color: 'var(--muted-foreground)' }}
        >
          Segmented control
        </h3>
        <div className="flex flex-wrap items-start gap-3">
          <SegmentedControlStub
            segments={['Week 1', 'Week 2', 'Week 3']}
            value={segValue}
            onChange={setSegValue}
            size={compact ? 'sm' : 'md'}
          />
          <SegmentedControlStub
            segments={['On', 'Off']}
            value={seg2Value}
            onChange={setSeg2Value}
            size={compact ? 'sm' : 'md'}
          />
        </div>
      </section>

      <section className={sectionGap}>
        <h3
          className={headingClass}
          style={{ color: 'var(--muted-foreground)' }}
        >
          Tip annotation
        </h3>
        <div className="space-y-2">
          <TipAnnotationStub>
            Compound lifts come first. Bench, squat, deadlift.
          </TipAnnotationStub>
          {!compact && (
            <TipAnnotationStub variant="first-run">
              First-run tip: hit the green button to log your first set.
            </TipAnnotationStub>
          )}
        </div>
      </section>

      <section className={sectionGap}>
        <h3
          className={headingClass}
          style={{ color: 'var(--muted-foreground)' }}
        >
          Create-new card
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <CreateNewCardStub label="New program" />
          <CreateNewCardStub label="Locked" locked />
        </div>
      </section>

      <section className={sectionGap}>
        <h3
          className={headingClass}
          style={{ color: 'var(--muted-foreground)' }}
        >
          Progress bar
        </h3>
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          <ProgressBarStub value={0} label="Empty" />
          <ProgressBarStub value={25} label="Quarter" />
          <ProgressBarStub value={50} label="Half" />
          <ProgressBarStub value={100} label="Complete" />
        </div>
      </section>

      {!compact && (
        <section className={sectionGap}>
          <h3
            className={headingClass}
            style={{ color: 'var(--muted-foreground)' }}
          >
            Page-title stamp + badges
          </h3>
          <div className="space-y-3">
            <PageTitleStampStub>Week 3 Peak</PageTitleStampStub>
            <div className="flex flex-wrap items-center gap-2">
              <BadgeStub tone="success">Completed</BadgeStub>
              <BadgeStub tone="warning">In Progress</BadgeStub>
              <BadgeStub tone="error">Skipped</BadgeStub>
              <BadgeStub tone="primary">Active</BadgeStub>
            </div>
          </div>
        </section>
      )}

      {!compact && (
        <section className={sectionGap}>
          <h3
            className={headingClass}
            style={{ color: 'var(--muted-foreground)' }}
          >
            Surfaces — solid vs dashed framing
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div
              className="p-4"
              style={{
                background: 'var(--card)',
                border: '2px solid var(--border)',
                color: 'var(--foreground)',
              }}
            >
              <div className="text-xs uppercase tracking-wider opacity-70">
                Solid card
              </div>
              <div className="mt-1 text-sm">2px border, no radius.</div>
            </div>
            <div
              className="p-4"
              style={{
                background: 'transparent',
                border: '2px dashed var(--border)',
                color: 'var(--foreground)',
              }}
            >
              <div className="text-xs uppercase tracking-wider opacity-70">
                Dashed frame
              </div>
              <div className="mt-1 text-sm">For empty / placeholder slots.</div>
            </div>
          </div>
        </section>
      )}

      {!compact && (
        <section className={sectionGap}>
          <h3
            className={headingClass}
            style={{ color: 'var(--muted-foreground)' }}
          >
            Modal header sample
          </h3>
          <div
            className="border-2"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--card)',
            }}
          >
            <div
              className="flex items-center justify-between border-b-2 px-4 py-3"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--muted)',
                color: 'var(--foreground)',
              }}
            >
              <div className="font-bold uppercase tracking-wider">
                Log Bench Press
              </div>
              <button
                type="button"
                className="min-h-10 min-w-10 border-2 px-3"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  background: 'transparent',
                }}
              >
                ×
              </button>
            </div>
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--foreground)' }}>
              Modal body content for visual hierarchy reference.
            </div>
          </div>
        </section>
      )}

      {!compact && (
        <section className={sectionGap}>
          <h3
            className={headingClass}
            style={{ color: 'var(--muted-foreground)' }}
          >
            Pagination affordances
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span
              className="text-sm"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Page 2 of 5
            </span>
            <Button variant="outline" size="sm" aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
