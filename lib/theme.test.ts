import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getThemePreference,
  saveThemePreference,
  applyTheme,
  DEFAULT_THEME,
  type ThemePreference,
} from './theme';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock window.matchMedia
const matchMediaMock = (matches: boolean) => ({
  matches,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe('Theme System', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();

    // Mock global objects
    global.localStorage = localStorageMock as any;
    global.window = {
      matchMedia: vi.fn(() => matchMediaMock(true)),
    } as any;
  });

  describe('getThemePreference', () => {
    it('returns default theme when no preference stored', () => {
      const preference = getThemePreference();

      // Should return ripit theme with system preference (mocked as dark)
      expect(preference.themeName).toBe('ripit');
      expect(preference.mode).toBe('dark');
    });

    it('returns stored preference when available', () => {
      const stored: ThemePreference = {
        themeName: 'cyber',
        mode: 'light',
      };
      localStorage.setItem('themePreference', JSON.stringify(stored));

      const preference = getThemePreference();

      expect(preference.themeName).toBe('cyber');
      expect(preference.mode).toBe('light');
    });

    it('migrates old darkMode=true format to new format', () => {
      localStorage.setItem('darkMode', 'true');

      const preference = getThemePreference();

      expect(preference.themeName).toBe('doom');
      expect(preference.mode).toBe('dark');

      // Should save in new format
      const stored = localStorage.getItem('themePreference');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.themeName).toBe('doom');
      expect(parsed.mode).toBe('dark');
    });

    it('migrates old darkMode=false format to new format', () => {
      localStorage.setItem('darkMode', 'false');

      const preference = getThemePreference();

      expect(preference.themeName).toBe('doom');
      expect(preference.mode).toBe('light');

      // Should save in new format
      const stored = localStorage.getItem('themePreference');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.themeName).toBe('doom');
      expect(parsed.mode).toBe('light');
    });

    it('removes old darkMode key after migration', () => {
      localStorage.setItem('darkMode', 'true');

      getThemePreference();

      // Old key should be removed
      expect(localStorage.getItem('darkMode')).toBeNull();
    });

    it('handles corrupted JSON in localStorage gracefully', () => {
      localStorage.setItem('themePreference', 'invalid-json{{}');

      const preference = getThemePreference();

      // Should fall back to default with system preference
      expect(preference.themeName).toBe('ripit');
      expect(preference.mode).toBe('dark');
    });

    it('validates theme values and falls back if invalid', () => {
      const invalid = {
        themeName: 'invalid-theme',
        mode: 'invalid-mode',
      };
      localStorage.setItem('themePreference', JSON.stringify(invalid));

      const preference = getThemePreference();

      // Should fall back to default
      expect(preference.themeName).toBe('ripit');
      expect(preference.mode).toBe('dark');
    });

    it('uses system preference when no stored value', () => {
      // Mock light mode system preference
      global.window = {
        matchMedia: vi.fn(() => matchMediaMock(false)),
      } as any;

      const preference = getThemePreference();

      expect(preference.themeName).toBe('ripit');
      expect(preference.mode).toBe('light');
    });
  });

  describe('saveThemePreference', () => {
    it('saves preference to localStorage correctly', () => {
      const preference: ThemePreference = {
        themeName: 'forest',
        mode: 'dark',
      };

      saveThemePreference(preference);

      const stored = localStorage.getItem('themePreference');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.themeName).toBe('forest');
      expect(parsed.mode).toBe('dark');
    });

    it('overwrites existing preference', () => {
      const first: ThemePreference = {
        themeName: 'doom',
        mode: 'dark',
      };
      saveThemePreference(first);

      const second: ThemePreference = {
        themeName: 'cyber',
        mode: 'light',
      };
      saveThemePreference(second);

      const stored = localStorage.getItem('themePreference');
      const parsed = JSON.parse(stored!);

      expect(parsed.themeName).toBe('cyber');
      expect(parsed.mode).toBe('light');
    });
  });

  describe('applyTheme', () => {
    beforeEach(() => {
      // Mock document
      global.document = {
        documentElement: {
          dataset: {},
          classList: {
            add: vi.fn(),
            remove: vi.fn(),
          },
        },
      } as any;
    });

    it('applies data attributes to document root', () => {
      const preference: ThemePreference = {
        themeName: 'cyber',
        mode: 'light',
      };

      applyTheme(preference);

      expect(document.documentElement.dataset.theme).toBe('cyber');
      expect(document.documentElement.dataset.mode).toBe('light');
    });

    it('adds dark class when mode is dark', () => {
      const preference: ThemePreference = {
        themeName: 'forest',
        mode: 'dark',
      };

      applyTheme(preference);

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('removes dark class when mode is light', () => {
      const preference: ThemePreference = {
        themeName: 'doom',
        mode: 'light',
      };

      applyTheme(preference);

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });
  });
});
