'use client'

import { Check } from 'lucide-react'
import SubpageHeader from '@/components/ui/SubpageHeader'
import { pickTheme, useThemePreference } from '@/hooks/useThemePreference'
import { isLightOnly, THEME_LABELS, THEMES } from '@/lib/theme'
import ThemePreview from './ThemePreview'

const PREVIEW_LABEL = 'mt-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground'

/**
 * Settings → Theme: a card per theme, each previewing light and dark (light
 * only for E-INK). Tapping a card picks it through pickTheme, as the old menu
 * did. The previews need nothing from the user, so they draw on first paint;
 * only Current and the mode line wait for the stored preference.
 */
export default function ThemePicker() {
  const { preference } = useThemePreference()
  const mode = preference
    ? isLightOnly(preference.themeName)
      ? 'E-INK is light only.'
      : `Using ${preference.mode} mode. Change it with Mode in Settings.`
    : '…'

  return (
    <>
      <SubpageHeader title="Theme" intro={mode} />
      <div className="grid gap-3 sm:grid-cols-2">
        {THEMES.map((theme) => {
          const current = preference?.themeName === theme
          const lightOnly = isLightOnly(theme)
          return (
            <button
              key={theme}
              type="button"
              aria-label={THEME_LABELS[theme]}
              aria-pressed={current}
              onClick={() => preference && pickTheme(preference, theme)}
              className={`min-h-12 w-full border-2 bg-card p-3 text-left doom-focus-ring hover:border-primary ${
                current ? 'border-primary' : 'border-border'
              }`}
            >
              <span className="mb-2 flex min-h-6 items-center gap-2">
                <span className="flex-1 text-sm font-bold uppercase tracking-wider text-foreground">{THEME_LABELS[theme]}</span>
                {current && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary">
                    <Check size={14} aria-hidden="true" />
                    Current
                  </span>
                )}
              </span>
              <span className="grid grid-cols-2 gap-2">
                <span>
                  <ThemePreview theme={theme} mode="light" />
                  <span className={PREVIEW_LABEL}>Light</span>
                </span>
                {lightOnly ? (
                  <span className="flex items-center justify-center border border-dashed border-border p-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Light only
                  </span>
                ) : (
                  <span>
                    <ThemePreview theme={theme} mode="dark" />
                    <span className={PREVIEW_LABEL}>Dark</span>
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
