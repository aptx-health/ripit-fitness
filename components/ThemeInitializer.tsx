'use client';

import { useEffect } from 'react';
import { applyTheme, getThemePreference, saveThemePreference } from '@/lib/theme';

/**
 * Applies the saved theme preference on mount.
 *
 * The inline <script> in app/layout.tsx is the primary theme initializer
 * (runs before paint to prevent FOUC), but Next.js App Router streaming
 * can prevent it from executing. This component is a safety net that
 * ensures the correct theme is applied once React hydrates.
 */
export function ThemeInitializer() {
  useEffect(() => {
    const preference = getThemePreference();
    applyTheme(preference);
    // Ensure cookie is populated for existing users who set theme before
    // the cookie fallback was added
    saveThemePreference(preference);
  }, []);

  return null;
}
