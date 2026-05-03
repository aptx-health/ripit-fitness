/**
 * Theme System
 *
 * Manages theme selection (DOOM, CYBER, FOREST) and mode (light/dark).
 * Handles localStorage persistence, migration from old darkMode format,
 * and applying themes to the document root.
 */

// ============================================================================
// Type Definitions
// ============================================================================

import { clientLogger } from '@/lib/client-logger';

export type ThemeName = 'doom' | 'cyber' | 'forest' | 'synthwave' | 'dracula' | 'github' | 'ripit' | 'catppuccin' | 'clyde' | 'ninety' | 'blossom' | 'okabe';
export type ThemeMode = 'light' | 'dark';

export interface ThemePreference {
  themeName: ThemeName;
  mode: ThemeMode;
}

// ============================================================================
// Constants
// ============================================================================

export const THEMES: ThemeName[] = ['ripit', 'doom', 'catppuccin', 'cyber', 'forest', 'synthwave', 'dracula', 'github', 'clyde', 'ninety', 'blossom', 'okabe'];
export const MODES: ThemeMode[] = ['light', 'dark'];

export const DEFAULT_THEME: ThemePreference = {
  themeName: 'ripit',
  mode: 'dark',
};

export const THEME_LABELS: Record<ThemeName, string> = {
  ripit: 'RIPIT',
  doom: 'DOOM',
  catppuccin: 'CATPPUCCIN',
  cyber: 'CYBER',
  forest: 'FOREST',
  synthwave: 'SYNTHWAVE \'84',
  dracula: 'DRACULA',
  github: 'GITHUB',
  clyde: 'CLYDE',
  ninety: '90s KID',
  blossom: 'BLOSSOM',
  okabe: 'OKABE',
};

const STORAGE_KEY = 'themePreference';
const OLD_STORAGE_KEY = 'darkMode';
const COOKIE_KEY = 'theme_pref';
const COOKIE_MAX_AGE_DAYS = 365;

// ============================================================================
// Utility Functions
// ============================================================================

// ============================================================================
// Cookie Helpers (fallback persistence for iOS Safari localStorage eviction)
// ============================================================================

/**
 * Saves theme preference to a cookie as a fallback for localStorage eviction.
 * Cookies are more resilient on iOS Safari PWAs than localStorage.
 */
function saveToCookie(preference: ThemePreference): void {
  if (typeof document === 'undefined') return;

  const value = `${preference.themeName}:${preference.mode}`;
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_KEY}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
}

/**
 * Reads theme preference from cookie.
 * Returns null if no valid cookie found.
 */
function getFromCookie(): ThemePreference | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, val] = cookie.trim().split('=');
    if (name === COOKIE_KEY && val) {
      const [themeName, mode] = val.split(':') as [ThemeName, ThemeMode];
      if (THEMES.includes(themeName) && MODES.includes(mode)) {
        return { themeName, mode };
      }
    }
  }
  return null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets the system's preferred color scheme
 */
function getSystemPreference(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Migrates old darkMode boolean format to new ThemePreference format
 * Returns null if no migration needed
 */
function migrateOldFormat(): ThemePreference | null {
  if (typeof window === 'undefined') return null;

  const oldValue = localStorage.getItem(OLD_STORAGE_KEY);
  if (oldValue === null) return null;

  // Migrate: darkMode='true' → {themeName: 'doom', mode: 'dark'}
  //         darkMode='false' → {themeName: 'doom', mode: 'light'}
  const mode: ThemeMode = oldValue === 'true' ? 'dark' : 'light';
  const preference: ThemePreference = {
    themeName: 'doom',
    mode,
  };

  // Save in new format
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));

  // Remove old key
  localStorage.removeItem(OLD_STORAGE_KEY);

  return preference;
}

/**
 * Loads theme preference from localStorage with migration support
 */
export function getThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  // Check for migration from old format
  const migrated = migrateOldFormat();
  if (migrated) return migrated;

  // Load from new format
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ThemePreference;

      // Validate
      if (
        THEMES.includes(parsed.themeName) &&
        MODES.includes(parsed.mode)
      ) {
        return parsed;
      }
    }
  } catch (error) {
    clientLogger.error('Failed to parse theme preference:', error);
  }

  // Fallback: Check cookie (survives iOS localStorage eviction)
  const fromCookie = getFromCookie();
  if (fromCookie) {
    // Re-populate localStorage from cookie
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fromCookie));
    } catch {
      // Ignore write failures
    }
    return fromCookie;
  }

  // Final fallback: Use system preference for mode
  return {
    themeName: DEFAULT_THEME.themeName,
    mode: getSystemPreference(),
  };
}

/**
 * Saves theme preference to localStorage
 */
export function saveThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  } catch (error) {
    clientLogger.error('Failed to save theme preference:', error);
  }

  // Also save to cookie as fallback (survives iOS localStorage eviction)
  saveToCookie(preference);
}

/**
 * Applies theme to the document root
 * Sets data-theme and data-mode attributes, plus legacy .dark class
 */
export function applyTheme(preference: ThemePreference): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Set data attributes
  root.dataset.theme = preference.themeName;
  root.dataset.mode = preference.mode;

  // Maintain legacy .dark class for backward compatibility
  if (preference.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
