'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronRight, Eye, Moon, Palette, Sun } from 'lucide-react'
import { useThemePreference } from '@/hooks/useThemePreference'
import { THEME_LABELS, THEMES } from '@/lib/theme'
import { ROW, ROW_LABEL, RowIcon, SettingsBlock } from './SettingsBlock'

/** Look: Theme and Mode as rows with their current value on the right. */
export default function LookBlock() {
  const { preference, updateTheme } = useThemePreference()
  const dark = preference?.mode === 'dark'

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
                onClick={() => preference && updateTheme({ ...preference, themeName })}
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
        onClick={() => preference && updateTheme({ ...preference, mode: dark ? 'light' : 'dark' })}
        className={`${ROW} hover:bg-muted/50`}
      >
        <RowIcon>{dark ? <Moon size={18} /> : <Sun size={18} />}</RowIcon>
        <span className={`${ROW_LABEL} flex-1`}>Mode</span>
        <span className="text-sm text-muted-foreground">{preference ? (dark ? 'Dark' : 'Light') : '…'}</span>
      </button>
    </SettingsBlock>
  )
}
