/**
 * Admin quick panel choices, saved per device in localStorage. Storage can be
 * missing or throw (private mode, blocked site data), so every read and write
 * falls back quietly to the defaults.
 */

export type TouchStyle = 'ring' | 'trail'

export type QuickPanelPrefs = {
  touchIndicators: boolean
  touchStyle: TouchStyle
}

export const QUICK_PANEL_PREFS_KEY = 'ripit:admin-quick-panel'

export const DEFAULT_QUICK_PANEL_PREFS: QuickPanelPrefs = {
  touchIndicators: false,
  touchStyle: 'ring',
}

export function loadQuickPanelPrefs(): QuickPanelPrefs {
  try {
    const raw = window.localStorage.getItem(QUICK_PANEL_PREFS_KEY)
    if (!raw) return DEFAULT_QUICK_PANEL_PREFS
    const parsed = JSON.parse(raw) as Partial<QuickPanelPrefs>
    return {
      touchIndicators: parsed.touchIndicators === true,
      touchStyle: parsed.touchStyle === 'trail' ? 'trail' : 'ring',
    }
  } catch {
    return DEFAULT_QUICK_PANEL_PREFS
  }
}

export function saveQuickPanelPrefs(prefs: QuickPanelPrefs): void {
  try {
    window.localStorage.setItem(QUICK_PANEL_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}
