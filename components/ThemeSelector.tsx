'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Moon, Palette, Sun } from 'lucide-react';
import { useThemePreference } from '@/hooks/useThemePreference';
import {
  THEME_LABELS,
  THEMES,
  type ThemeName,
} from '@/lib/theme';

export function ThemeSelector() {
  const { preference, updateTheme } = useThemePreference();

  const handleThemeChange = (themeName: ThemeName) => {
    if (!preference) return;
    updateTheme({ ...preference, themeName });
  };

  const handleModeToggle = () => {
    if (!preference) return;
    updateTheme({ ...preference, mode: preference.mode === 'dark' ? 'light' : 'dark' });
  };

  // Show placeholder until mounted to prevent hydration mismatch
  if (!preference) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-muted rounded animate-pulse" />
        <div className="w-9 h-9 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Theme Palette Button with Dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button"
            className="h-9 w-9 flex items-center justify-center cursor-pointer border-2 bg-input transition-all hover:border-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--foreground)'
            }}
            aria-label="Select theme"
          >
            <Palette className="w-5 h-5" strokeWidth={2} />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="bg-card border-2 border-primary shadow-lg z-50 min-w-[180px]"
            sideOffset={5}
            align="end"
          >
            {THEMES.map((themeName) => (
              <DropdownMenu.Item
                key={themeName}
                onClick={() => handleThemeChange(themeName)}
                className={`w-full px-4 py-2.5 text-left text-sm font-semibold uppercase tracking-wider transition-colors cursor-pointer outline-none ${
                  preference.themeName === themeName
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                {THEME_LABELS[themeName]}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Mode Toggle Button */}
      <button type="button"
        onClick={handleModeToggle}
        className="h-9 w-9 flex items-center justify-center cursor-pointer border-2 bg-input transition-all hover:border-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--foreground)'
        }}
        aria-label={`Switch to ${preference.mode === 'dark' ? 'light' : 'dark'} mode`}
      >
        {preference.mode === 'dark' ? (
          <Sun className="w-5 h-5" strokeWidth={2} />
        ) : (
          <Moon className="w-5 h-5" strokeWidth={2} />
        )}
      </button>
    </div>
  );
}
