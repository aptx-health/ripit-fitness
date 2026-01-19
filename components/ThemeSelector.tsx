'use client';

import { useState, useEffect, useRef } from 'react';
import { Palette, Sun, Moon } from 'lucide-react';
import {
  getThemePreference,
  saveThemePreference,
  applyTheme,
  THEME_LABELS,
  THEMES,
  type ThemeName,
  type ThemePreference,
} from '@/lib/theme';

export function ThemeSelector() {
  const [preference, setPreference] = useState<ThemePreference | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Hydration-safe: Only render after mounting
  useEffect(() => {
    const currentPreference = getThemePreference();
    setPreference(currentPreference);
    setMounted(true);

    // Don't apply theme on mount - it's already applied by SSR script
    // Only apply when user changes it
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleThemeChange = (themeName: ThemeName) => {
    if (!preference) return;

    const newPreference: ThemePreference = {
      ...preference,
      themeName,
    };

    setPreference(newPreference);
    saveThemePreference(newPreference);
    applyTheme(newPreference);
    setIsMenuOpen(false);
  };

  const handleMenuToggle = () => {
    if (!isMenuOpen && buttonRef.current) {
      // Calculate if there's enough space below
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const menuHeight = 250; // Approximate height of menu with 5 items

      // If not enough space below, show above
      setMenuPosition(spaceBelow < menuHeight ? 'top' : 'bottom');
    }
    setIsMenuOpen(!isMenuOpen);
  };

  const handleModeToggle = () => {
    if (!preference) return;

    const newPreference: ThemePreference = {
      ...preference,
      mode: preference.mode === 'dark' ? 'light' : 'dark',
    };

    setPreference(newPreference);
    saveThemePreference(newPreference);
    applyTheme(newPreference);
  };

  // Show placeholder until mounted to prevent hydration mismatch
  if (!mounted || !preference) {
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
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleMenuToggle}
          className="h-9 w-9 flex items-center justify-center cursor-pointer border-2 bg-input transition-all hover:border-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--foreground)'
          }}
          aria-label="Select theme"
          aria-expanded={isMenuOpen}
        >
          <Palette className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className={`absolute right-0 bg-card border-2 border-primary shadow-lg z-50 min-w-[180px] ${
              menuPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
            }`}
          >
            {THEMES.map((themeName) => (
              <button
                key={themeName}
                onClick={() => handleThemeChange(themeName)}
                className={`w-full px-4 py-2.5 text-left text-sm font-semibold uppercase tracking-wider transition-colors ${
                  preference.themeName === themeName
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                {THEME_LABELS[themeName]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mode Toggle Button */}
      <button
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
