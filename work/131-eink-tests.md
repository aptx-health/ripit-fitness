---
id: 131
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-04 Dustin (BOOX Kaleido 3; E-INK theme + separate display toggle; light only; device check via phone preview)
updated: 2026-11-05
---
# E-ink theme and display toggle: tests

Checkout: worktree2, branch `feature/eink-theme` (from dev at eb282c41). No phone preview is running.

## Goal
Write the failing tests that `features/ui/eink.feature` will be judged by, before any build.

## Read
- `features/ui/eink.feature` (the contract)
- Theme system: `lib/theme.ts` (+ `lib/theme.test.ts`, `lib/theme-color.test.ts`), `components/ThemeSelector.tsx`, `components/ThemeInitializer.tsx`, the inline scripts in `app/layout.tsx` and `app/(auth)/layout.tsx` (theme lists duplicated in three places), `app/globals.css` (one `[data-theme=…]` block per theme, tokens), `app/(app)/dev/theme-validator/`
- Motion today: `components/effects/PixelDriftBackground.tsx`, `components/ui/ExerciseImageCrossfade.tsx`, `components/adhoc/PlanLine.tsx`, `components/workout-logging/FollowAlongTabs.tsx` (each checks `prefers-reduced-motion` itself), `components/features/progress/LiftSkeleton.tsx` (motion-safe pulse)
- Settings page: `app/(app)/settings/page.tsx`

## Shape to test against (the implementer follows the same names)
- `ThemeName` gains `'eink'` (label `E-INK`); `THEMES` and both inline scripts list it. A stored `eink:dark` resolves to light.
- `lib/display.ts`: `getEinkDisplay()`, `setEinkDisplay(on)` (localStorage key `einkDisplay` + cookie `eink_display`, try/catch), `applyEinkDisplay(on)` sets `data-display="eink"` on `<html>`; a `useReducedMotion()` hook (or equivalent) that is true when the OS asks or E-ink display is on, used by the components above instead of their own matchMedia checks.
- Picking `eink` in ThemeSelector calls `setEinkDisplay(true)`; picking another theme leaves it alone. The mode switch is hidden/disabled for `eink`.
- CSS: `[data-theme="eink"]` token block (light) and `[data-display="eink"]` rules that zero animations/transitions and raise font weights; contrast rules checkable from the tokens (text and muted ≥ 7:1 on background; black/white text on each fill ≥ 7:1).
- Settings: an "E-ink display" switch (role=switch, aria-checked, 48px).

## Do
1. Unit tests: theme lists in sync (lib + both inline scripts), eink light-only resolution, display get/set/apply with storage failures, theme-pick side effects.
2. Token tests: parse the `[data-theme="eink"]` block from `app/globals.css` and check the contrast rules and the absence of shadows/gradients tokens where the theme defines them; reuse `lib/theme-color.test.ts`'s approach if it fits.
3. Component tests: Settings switch, ThemeSelector (eink turns toggle on, mode switch hidden), and that PlanLine / ExerciseImageCrossfade / FollowAlongTabs / PixelDriftBackground / LiftSkeleton honour E-ink display.
4. Inline script tests: evaluate the layout scripts against a fake document with stored values (eink theme, display on, `eink:dark`) and check the attributes set before React runs.
5. Lock new files (`chmod a-w`) and run a break matrix in small batches.

## Done when
New tests fail on this branch for the right reason; existing theme tests still pass; break matrix recorded.

## Hand back
Use `handoff-test-builder`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-04 CST: created; confirmed by Dustin; dispatched to test-builder (wF:p1).
- 2026-11-04 CST: back; lead re-ran (166 red, 49 controls). 8 choices accepted (131-handback.md). Build 132 dispatched.
- 2026-11-05 CST: Dustin checked on the BOOX via phone preview ("Looks good"). Accepted.
