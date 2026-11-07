import { useSyncExternalStore } from 'react';
import { applyEinkDisplay, setEinkDisplay } from '@/lib/display';
import {
  applyTheme,
  getSystemPreference,
  getThemePreference,
  isLightOnly,
  normalizePreference,
  saveThemePreference,
  type ThemeMode,
  type ThemeName,
  type ThemePreference,
} from '@/lib/theme';

const THEME_CHANGE_EVENT = 'themechange';

let cachedPreference: ThemePreference | null = null;

function getSnapshot(): ThemePreference | null {
  if (cachedPreference === null) {
    cachedPreference = getThemePreference();
  }
  return cachedPreference;
}

function getServerSnapshot(): null {
  return null;
}

function subscribe(callback: () => void): () => void {
  const handler = () => {
    cachedPreference = getThemePreference();
    callback();
  };
  window.addEventListener(THEME_CHANGE_EVENT, handler);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, handler);
}

export function updateTheme(newPreference: ThemePreference): void {
  const preference = normalizePreference(newPreference);
  cachedPreference = preference;
  saveThemePreference(preference);
  applyTheme(preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** The mode the user had before picking a light-only theme, to restore on leaving it. */
const MODE_BEFORE_KEY = 'themeModeBeforeLightOnly';

function readModeBefore(): ThemeMode | null {
  try {
    const mode = localStorage.getItem(MODE_BEFORE_KEY);
    return mode === 'light' || mode === 'dark' ? mode : null;
  } catch {
    return null;
  }
}

function writeModeBefore(mode: ThemeMode | null): void {
  try {
    if (mode) localStorage.setItem(MODE_BEFORE_KEY, mode);
    else localStorage.removeItem(MODE_BEFORE_KEY);
  } catch {
    // Storage blocked: leaving falls back to the device's mode.
  }
}

/**
 * The user picks a theme from a menu. Picking E-INK (light only) remembers the
 * mode they had and turns E-ink display on. Leaving it for another theme
 * restores that mode, or the device's own (the new-device default) when none
 * was kept. Picking any other theme leaves the display as it was.
 */
export function pickTheme(current: ThemePreference, themeName: ThemeName): void {
  const leaving = isLightOnly(current.themeName) && !isLightOnly(themeName);
  const entering = !isLightOnly(current.themeName) && isLightOnly(themeName);
  let mode = current.mode;
  if (entering) writeModeBefore(current.mode);
  if (leaving) {
    mode = readModeBefore() ?? getSystemPreference();
    writeModeBefore(null);
  }
  updateTheme({ themeName, mode });
  if (themeName === 'eink') {
    setEinkDisplay(true);
    applyEinkDisplay(true);
  }
}

export function useThemePreference() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { preference, updateTheme };
}
