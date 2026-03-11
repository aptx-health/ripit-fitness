import { useSyncExternalStore } from 'react';
import {
  applyTheme,
  getThemePreference,
  saveThemePreference,
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
  cachedPreference = newPreference;
  saveThemePreference(newPreference);
  applyTheme(newPreference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function useThemePreference() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { preference, updateTheme };
}
