import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePwaPrompt } from '@/hooks/usePwaPrompt'
import type { UserSettings } from '@/hooks/useUserSettings'

// Helpers to control navigator/window mocks
let mockUserAgent = ''
let mockStandalone = false
let mockDisplayModeStandalone = false

beforeEach(() => {
  mockUserAgent = ''
  mockStandalone = false
  mockDisplayModeStandalone = false

  vi.stubGlobal('navigator', {
    ...navigator,
    get userAgent() { return mockUserAgent },
    get standalone() { return mockStandalone },
  })

  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(display-mode: standalone)' && mockDisplayModeStandalone,
    media: query,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

function makeSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    displayName: null,
    defaultWeightUnit: 'lbs',
    defaultIntensityRating: 'rir',
    dismissedPrimer: false,
    dismissedWarmup: false,
    dismissedStickNudge: false,
    completedTours: '[]',
    postSessionPromptCount: 0,
    lastPostSessionPromptAt: null,
    experienceLevel: null,
    intensityEnabled: false,
    loggingMode: 'full',
    dismissedMessageIds: '[]',
    seenMessageIds: '[]',
    pwaPromptShownCount: 0,
    pwaPromptDismissedAt: null,
    ...overrides,
  }
}

function setIos() {
  mockUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
}

function setAndroid() {
  mockUserAgent = 'Mozilla/5.0 (Linux; Android 14; Pixel 8)'
}

function setDesktop() {
  mockUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
}

describe('usePwaPrompt', () => {
  describe('triggerAfterWorkout', () => {
    it('shows prompt on first workout completion for iOS', () => {
      setIos()
      const settings = makeSettings()
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerAfterWorkout(1) })

      expect(result.current.showPrompt).toBe(true)
    })

    it('shows prompt on first workout completion for Android', () => {
      setAndroid()
      const settings = makeSettings()
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerAfterWorkout(1) })

      expect(result.current.showPrompt).toBe(true)
    })

    it('does not show for non-first workouts', () => {
      setIos()
      const settings = makeSettings()
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerAfterWorkout(2) })

      expect(result.current.showPrompt).toBe(false)
    })

    it('does not show on desktop', () => {
      setDesktop()
      const settings = makeSettings()
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerAfterWorkout(1) })

      expect(result.current.showPrompt).toBe(false)
    })

    it('does not show when already standalone', () => {
      setIos()
      mockStandalone = true
      const settings = makeSettings()
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerAfterWorkout(1) })

      expect(result.current.showPrompt).toBe(false)
    })

    it('does not show when display-mode is standalone', () => {
      setAndroid()
      mockDisplayModeStandalone = true
      const settings = makeSettings()
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerAfterWorkout(1) })

      expect(result.current.showPrompt).toBe(false)
    })
  })

  describe('triggerOnPageLoad', () => {
    it('shows prompt for returning user who was shown once before', () => {
      setIos()
      const settings = makeSettings({ pwaPromptShownCount: 1, pwaPromptDismissedAt: new Date().toISOString() })
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerOnPageLoad(3) })

      expect(result.current.showPrompt).toBe(true)
    })

    it('does not show for users with no workout history', () => {
      setIos()
      const settings = makeSettings({ pwaPromptShownCount: 1 })
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerOnPageLoad(0) })

      expect(result.current.showPrompt).toBe(false)
    })

    it('does not show for users who have never been shown (first trigger is post-workout)', () => {
      setIos()
      const settings = makeSettings({ pwaPromptShownCount: 0 })
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerOnPageLoad(5) })

      expect(result.current.showPrompt).toBe(false)
    })
  })

  describe('suppression after max shows', () => {
    it('does not show when shown twice and dismissed recently', () => {
      setIos()
      const settings = makeSettings({
        pwaPromptShownCount: 2,
        pwaPromptDismissedAt: new Date().toISOString(),
      })
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerAfterWorkout(1) })
      expect(result.current.showPrompt).toBe(false)

      act(() => { result.current.triggerOnPageLoad(5) })
      expect(result.current.showPrompt).toBe(false)
    })

    it('shows one final time after 14 days since second dismissal', () => {
      setIos()
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      const settings = makeSettings({
        pwaPromptShownCount: 2,
        pwaPromptDismissedAt: fifteenDaysAgo,
      })
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerOnPageLoad(5) })

      expect(result.current.showPrompt).toBe(true)
    })

    it('permanently suppresses after third show (count > 2)', () => {
      setIos()
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      const settings = makeSettings({
        pwaPromptShownCount: 3,
        pwaPromptDismissedAt: fifteenDaysAgo,
      })
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerOnPageLoad(5) })

      expect(result.current.showPrompt).toBe(false)
    })
  })

  describe('handleClose', () => {
    it('hides prompt and updates settings with incremented count', async () => {
      setIos()
      const settings = makeSettings({ pwaPromptShownCount: 0 })
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerAfterWorkout(1) })
      expect(result.current.showPrompt).toBe(true)

      await act(async () => { await result.current.handleClose() })

      expect(result.current.showPrompt).toBe(false)
      expect(updateSettings).toHaveBeenCalledWith({
        pwaPromptShownCount: 1,
        pwaPromptDismissedAt: expect.any(String),
      })
    })
  })

  describe('handleInstalled', () => {
    it('hides prompt and sets high count to permanently suppress', async () => {
      setIos()
      const settings = makeSettings({ pwaPromptShownCount: 1 })
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(settings, updateSettings))

      act(() => { result.current.triggerAfterWorkout(1) })

      await act(async () => { await result.current.handleInstalled() })

      expect(result.current.showPrompt).toBe(false)
      expect(updateSettings).toHaveBeenCalledWith({ pwaPromptShownCount: 99 })
    })
  })

  describe('null settings', () => {
    it('does not show prompt when settings are null', () => {
      setIos()
      const updateSettings = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => usePwaPrompt(null, updateSettings))

      act(() => { result.current.triggerAfterWorkout(1) })

      expect(result.current.showPrompt).toBe(false)
    })
  })
})
