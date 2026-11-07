'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { BookOpen, ChevronRight, Eye, Moon, Palette, Sun } from 'lucide-react'
import { pickTheme, useThemePreference } from '@/hooks/useThemePreference'
import { applyEinkDisplay, setEinkDisplay, useEinkDisplay } from '@/lib/display'
import { isLightOnly, THEME_LABELS, THEMES } from '@/lib/theme'
import { ROW, ROW_LABEL, RowIcon, SettingsBlock } from './SettingsBlock'

/**
 * Look: Theme and Mode as rows with their current value on the right, and the
 * E-ink display switch (any theme). A light-only theme shows Mode disabled.
 */
export default function LookBlock() {
  const { preference, updateTheme } = useThemePreference()
  const eink = useEinkDisplay()
  const dark = preference?.mode === 'dark'
  const lightOnly = preference != null && isLightOnly(preference.themeName)

  return (
    <SettingsBlock title="Look" icon={<Eye size={16} />}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className={`${ROW} hover:bg-muted/50`}>
            <RowIcon>
              <Palette size={18} />
            </RowIcon>
            <span className={`${ROW_LABEL} flex-1`}>Theme</span>
            <span className="text-sm text-muted-foreground">{preference ? THEME_LABELS[preference.themeName] : '…'}</span>
            <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="folder-box z-50 min-w-[180px] border-2 border-border bg-card shadow-lg"
            sideOffset={5}
            align="end"
          >
            {THEMES.map((themeName) => (
              <DropdownMenu.Item
                key={themeName}
                onClick={() => preference && pickTheme(preference, themeName)}
                className={`flex min-h-12 w-full cursor-pointer items-center px-4 text-left text-sm font-semibold uppercase tracking-wider outline-none transition-colors ${
                  preference?.themeName === themeName
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted focus:bg-muted'
                }`}
              >
                {THEME_LABELS[themeName]}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <button
        type="button"
        disabled={lightOnly}
        onClick={() => preference && !lightOnly && updateTheme({ ...preference, mode: dark ? 'light' : 'dark' })}
        className={`${ROW} hover:bg-muted/50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
      >
        <RowIcon>{dark ? <Moon size={18} /> : <Sun size={18} />}</RowIcon>
        <span className={`${ROW_LABEL} flex-1`}>Mode</span>
        <span className="text-sm text-muted-foreground">
          {preference ? (lightOnly ? 'E-INK is light only' : dark ? 'Dark' : 'Light') : '…'}
        </span>
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={eink}
        aria-labelledby="eink-display-label"
        aria-describedby="eink-display-hint"
        onClick={() => {
          setEinkDisplay(!eink)
          applyEinkDisplay(!eink)
        }}
        className={`group ${ROW} hover:bg-muted/50`}
      >
        <RowIcon>
          <BookOpen size={18} />
        </RowIcon>
        <span className="min-w-0 flex-1">
          <span id="eink-display-label" className={ROW_LABEL}>
            E-ink display
          </span>
          <span id="eink-display-hint" className="block text-sm text-muted-foreground">
            Turns off animation and makes text bolder for e-ink screens
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`relative inline-flex h-7 w-12 min-w-12 shrink-0 items-center rounded-full border-2 transition-colors ${
            eink ? 'border-primary bg-primary' : 'border-border bg-muted group-hover:border-primary'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full transition-transform ${
              eink ? 'translate-x-[22px] bg-primary-foreground' : 'translate-x-[2px] bg-muted-foreground'
            }`}
          />
        </span>
      </button>
    </SettingsBlock>
  )
}
