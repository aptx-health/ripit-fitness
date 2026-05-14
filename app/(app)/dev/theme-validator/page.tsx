'use client'

import { Moon, Sun } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useRef } from 'react'
import { useThemePreference } from '@/hooks/useThemePreference'
import {
  MODES,
  THEME_LABELS,
  THEMES,
  type ThemeMode,
  type ThemeName,
} from '@/lib/theme'
import { PrimitiveGrid, TokenSwatches } from './components'

/**
 * Theme Validator — Phase 0 infrastructure for the Styling Sweep milestone (#10).
 *
 * Renders every milestone primitive (Button, SegmentedControl, TipAnnotation,
 * CreateNewCard, ProgressBar, page-title stamp, badges, modal headers) so a
 * Phase 1 PR can verify their primitive migration across all twelve themes in
 * one scroll, instead of rotating ThemeSelector 11 times by hand.
 *
 * Routes:
 *   /dev/theme-validator             — single-theme view (uses live ThemeSelector)
 *   /dev/theme-validator?view=grid   — 4×3 grid, one cell per theme/mode
 *   /dev/theme-validator?debug=1     — overlay resolved --color-* tokens
 *
 * Related: #721 (Styling Sweep spike), #729 / #730 / #731 (Phase 1 primitive PRs)
 */

export default function ThemeValidatorPage() {
  return (
    <Suspense fallback={<PageShell><LoadingState /></PageShell>}>
      <ThemeValidator />
    </Suspense>
  )
}

function ThemeValidator() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view') === 'grid' ? 'grid' : 'single'
  const debug = searchParams.get('debug') === '1'
  const modeParam = searchParams.get('mode')
  const gridMode: ThemeMode =
    modeParam === 'light' || modeParam === 'dark' ? modeParam : 'dark'

  return (
    <PageShell>
      <Header view={view} debug={debug} gridMode={gridMode} />
      {view === 'grid' ? (
        <GridView mode={gridMode} debug={debug} />
      ) : (
        <SingleView debug={debug} />
      )}
    </PageShell>
  )
}

// ============================================================================
// Layout shell
// ============================================================================

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen px-4 py-6 md:px-8"
      style={{
        background: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
      <div className="mx-auto max-w-7xl space-y-6">{children}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div
      className="text-sm"
      style={{ color: 'var(--muted-foreground)' }}
    >
      Loading theme validator…
    </div>
  )
}

// ============================================================================
// Header — title + view + mode controls
// ============================================================================

function Header({
  view,
  debug,
  gridMode,
}: {
  view: 'single' | 'grid'
  debug: boolean
  gridMode: ThemeMode
}) {
  const otherMode: ThemeMode = gridMode === 'dark' ? 'light' : 'dark'
  const baseQuery = debug ? '&debug=1' : ''

  return (
    <header
      className="space-y-3 border-b-2 pb-4"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            className="text-xs uppercase tracking-wider"
            style={{ color: 'var(--muted-foreground)' }}
          >
            /dev/theme-validator
          </p>
          <h1 className="text-2xl font-bold uppercase tracking-wider">
            Theme Validator
          </h1>
          <p className="mt-1 max-w-2xl text-sm">
            Every milestone primitive, every variant, every theme. Use this
            page to verify Phase 1 primitive migrations before requesting
            review.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkChip
            href={`?view=single${baseQuery}`}
            active={view === 'single'}
          >
            Single
          </LinkChip>
          <LinkChip
            href={`?view=grid${baseQuery}${gridMode === 'light' ? '&mode=light' : ''}`}
            active={view === 'grid'}
          >
            All themes
          </LinkChip>
          <LinkChip
            href={`?view=${view}${view === 'grid' && gridMode === 'light' ? '&mode=light' : ''}${debug ? '' : '&debug=1'}`}
            active={debug}
          >
            Debug tokens
          </LinkChip>
          {view === 'grid' && (
            <LinkChip
              href={`?view=grid${otherMode === 'light' ? '&mode=light' : ''}${baseQuery}`}
              active={false}
              icon={gridMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            >
              {gridMode === 'dark' ? 'Light grid' : 'Dark grid'}
            </LinkChip>
          )}
        </div>
      </div>
      {view === 'single' && <SingleViewControls />}
    </header>
  )
}

function LinkChip({
  href,
  active,
  children,
  icon,
}: {
  href: string
  active: boolean
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <a
      href={href}
      className="inline-flex min-h-12 items-center gap-2 border-2 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider transition-colors"
      style={
        active
          ? {
              borderColor: 'var(--primary)',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
            }
          : {
              borderColor: 'var(--border)',
              background: 'transparent',
              color: 'var(--foreground)',
            }
      }
    >
      {icon}
      {children}
    </a>
  )
}

function SingleViewControls() {
  const { preference, updateTheme } = useThemePreference()

  if (!preference) {
    return (
      <div
        className="text-xs"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Loading theme…
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p
        className="text-xs uppercase tracking-wider"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Active theme · {THEME_LABELS[preference.themeName]} ·{' '}
        {preference.mode}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {THEMES.map((name) => {
          const isActive = preference.themeName === name
          return (
            <button
              type="button"
              key={name}
              onClick={() => updateTheme({ ...preference, themeName: name })}
              className="min-h-12 border-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
              style={
                isActive
                  ? {
                      borderColor: 'var(--primary)',
                      background: 'var(--primary)',
                      color: 'var(--primary-foreground)',
                    }
                  : {
                      borderColor: 'var(--border)',
                      background: 'transparent',
                      color: 'var(--foreground)',
                    }
              }
            >
              {THEME_LABELS[name]}
            </button>
          )
        })}
        {MODES.map((mode) => {
          const isActive = preference.mode === mode
          return (
            <button
              type="button"
              key={mode}
              onClick={() => updateTheme({ ...preference, mode })}
              className="min-h-12 border-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
              style={
                isActive
                  ? {
                      borderColor: 'var(--accent)',
                      background: 'var(--accent)',
                      color: 'var(--accent-foreground)',
                    }
                  : {
                      borderColor: 'var(--border)',
                      background: 'transparent',
                      color: 'var(--foreground)',
                    }
              }
            >
              {mode}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Single view — current theme, full primitive grid
// ============================================================================

function SingleView({ debug }: { debug: boolean }) {
  return (
    <section className="space-y-6">
      {debug && (
        <div
          className="border-2 p-3"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--card)',
          }}
        >
          <p
            className="mb-2 text-xs uppercase tracking-wider"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Resolved root tokens
          </p>
          <TokenSwatches />
        </div>
      )}
      <PrimitiveGrid showSwatches={false} compact={false} />
    </section>
  )
}

// ============================================================================
// Grid view — every theme side-by-side
// ============================================================================

function GridView({
  mode,
  debug,
}: {
  mode: ThemeMode
  debug: boolean
}) {
  return (
    <section className="space-y-3">
      <p
        className="text-xs uppercase tracking-wider"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Cycling all {THEMES.length} themes · mode = {mode}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {THEMES.map((name) => (
          <ThemeCell key={name} themeName={name} mode={mode} debug={debug} />
        ))}
      </div>
    </section>
  )
}

function ThemeCell({
  themeName,
  mode,
  debug,
}: {
  themeName: ThemeName
  mode: ThemeMode
  debug: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      data-theme={themeName}
      data-mode={mode}
      className="border-2 p-3"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
      <div
        className="mb-3 flex items-center justify-between border-b-2 pb-2"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-sm font-bold uppercase tracking-wider">
          {THEME_LABELS[themeName]}
        </span>
        <span
          className="text-[10px] uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {mode}
        </span>
      </div>
      {debug && (
        <div className="mb-3">
          <TokenSwatches scopeRef={ref} />
        </div>
      )}
      <PrimitiveGrid showSwatches={false} compact />
    </div>
  )
}
