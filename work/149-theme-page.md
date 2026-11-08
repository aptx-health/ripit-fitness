---
id: 149
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-07 Dustin ("really like the dedicated theme page"; light/dark preview cards)
updated: 2026-11-07
---
# Theme page with light/dark previews

Checkout: worktree2, branch `feature/theme-page` (from origin/dev 88edfe0a). Small UI item: no separate test-builder; write tests first and show them failing.

## Goal
High-priority staging bug: the Settings theme dropdown runs off the screen and can't scroll, hiding later themes (`initiatives/ui-audit/docs/assets/2026-11-07-theme-menu-cutoff.jpg`). Replace it with a page of theme cards, each previewing light and dark.

## Read
- `features/ui/theme-page.feature` (the contract)
- `components/settings/LookBlock.tsx`, `components/ThemeSelector.tsx`, `hooks/useThemePreference.ts`, `lib/theme.ts` (THEMES, THEME_LABELS, LIGHT_ONLY_THEMES), `lib/display.ts`
- `app/globals.css`: themes are `[data-theme="x"]` and `[data-theme="x"][data-mode="dark"]` blocks, so a preview can scope a theme by setting those attributes on its own wrapper. Check theme fonts and any rules keyed on `html[data-theme]` that won't apply to a nested wrapper.
- Settings sub-page pattern (`SubpageHeader`, `app/(app)/settings/equipment/`) and `__tests__/components/settings-page.test.tsx` (pins the Look block)

## Do
1. Tests: Theme row links to `/settings/theme`; one card per theme in THEMES order, E-INK light-only; current marked; tapping picks via `useThemePreference` (E-INK display behaviour unchanged); header picker no longer overflows.
2. `/settings/theme` page + `loading.tsx`; a reusable `ThemePreview` component.
3. If a locked test pins the old dropdown, stop and tell the lead the exact line.

## Done when
Tests pass; full suite and `npx tsc --noEmit` clean; `npm run perf:scan -- --changed origin/dev` clean; 390px screenshots of the page (in two or three themes, light and dark, and E-INK) and the Settings Look block in `initiatives/ui-audit/docs/assets/149/`.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created from Dustin's bug report and his pick (theme page + previews); small, test-builder skipped; dispatched to implementer (wE:p7).
- 2026-11-07 CST: back "needs decision": locked eink-theme-ui ("the Theme menu", L400) and settings-page.test L241/L251 pin the Settings dropdown; header picker tests pin a dropdown. Lead chose A: Theme row is a link; picking happens on /settings/theme cards; header keeps a dropdown capped to the available height with internal scroll. Lead authorised the implementer to make exactly those amendments (chmod u+w, "work 149" comments, chmod a-w); lead reviews the diff of the locked files.
- 2026-11-07 CST: back complete; lead reviewed the locked diffs (no assertions dropped) and re-ran 92/92. Phone preview.
- 2026-11-07 CST: Dustin approved on the phone preview ("Theme selector is perfect"). Accepted.
