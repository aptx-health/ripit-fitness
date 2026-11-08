import type { ThemeMode, ThemeName } from '@/lib/theme'

/**
 * A small picture of a theme in one mode: page background, a card with a
 * heading and muted text, a primary button and an accent. The wrapper carries
 * its own data-theme / data-mode, so the theme's variables apply inside it
 * whatever the page's theme is. Colours are inline var()s rather than utility
 * classes, so the page theme's class rules (E-INK's .text-primary and the like)
 * can't reach in and repaint it.
 */
export default function ThemePreview({ theme, mode }: { theme: ThemeName; mode: ThemeMode }) {
  return (
    <div
      data-theme={theme}
      data-mode={mode}
      aria-hidden="true"
      className="p-2"
      style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
    >
      <div className="p-2" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <span className="block truncate text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--card-foreground)' }}>
          Leg day
        </span>
        <span className="block truncate text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          5 exercises
        </span>
        <span className="mt-2 flex items-center gap-2">
          <span
            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            Start
          </span>
          <span className="h-2 w-6" style={{ background: 'var(--accent)' }} />
        </span>
      </div>
    </div>
  )
}
