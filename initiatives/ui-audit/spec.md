# UI audit build: spec

Source: the audit at `docs/audit/README.md` (findings S1–S6 and per-page tables) and `docs/2026-11-01-ios-pwa-top-blur.md`. Dustin (2026-11-01): "do all of them", as stacked PRs managed with `gh stack`. Sections are written just in time, before each item is dispatched.

| Item | Branch | What |
|---|---|---|
| UI1 | `feature/ui-shared` | Shared folder pieces, iOS status bar fix, `sw.js` matcher fix |
| UI2 | `feature/ui-quick-actions` | Quick Actions sheet |
| UI3 | `feature/ui-library-tabs` | Library tabs and Workouts |
| UI4 | `feature/ui-browse` | Browse and program detail |
| UI5 | `feature/ui-settings` | Settings main page, plus the `/settings` SSR 500 |
| UI6 | `feature/ui-settings-subpages` | Settings sub-pages |

Every item: no `doom-corners` on the surfaces it touches; Training's look (paper tabs, folder boxes, plain `divide-y` rows, `doom-heading` only on one hero title per screen); 48px touch targets kept; light and dark themes both checked. Learning is out of scope.

## UI1: shared folder pieces

**Behaviour:** `features/ui-audit/shared-folder-pieces.feature`.

1. **`PaperTabs`** (`components/ui/PaperTabs.tsx`, or beside `SectionTab`): the tab strip pulled out of `TabbedBlock`, usable on any page.
   - Controlled: `value` + `onChange`, so Library can keep the tab in the URL (`?type=`, `?tab=`).
   - Same tablist keyboard behaviour as today (Left/Right, Home/End, roving `tabIndex`, `aria-selected`, `aria-controls`), the same tones (`mine`, `next`, plus `coach` if cheap), count chips, and `PAPER_TAB_FOCUS`.
   - Optional trailing **link tab** (the dimmed `bg-primary/25` style used by "All suggestions").
   - `TabbedBlock` uses it, keeping its localStorage memory; Training must look and behave exactly as before.
2. **`PageTitle`**: `text-4xl font-bold doom-title uppercase tracking-wider`. Training and Library use it (no visible change).
3. **`SubpageHeader`**: "← Settings" (or any) back link, `text-2xl` uppercase title, a one-line intro, an optional action slot. Not used by pages yet beyond what's cheap; UI6 adopts it.
4. **`docs/STYLING.md`**: a short "Folder blocks" section at the top pointing at these pieces and the rules above; mark the old zinc/orange table guidance as legacy.
5. **iOS status bar** (`app/layout.tsx`): `appleWebApp.statusBarStyle: "default"`; add `themeColor` to the `viewport` export for light and dark, using the ripit theme's background colours. Keep `viewport-fit: cover`. Leave `public/site.webmanifest` `theme_color` alone unless the note's reasoning is clear; say which in the handback.
6. **`middleware.ts` matcher**: also exclude `sw.js`, `swe-worker-*.js` and `site.webmanifest`, so they're served (not redirected) when signed out.

**Done when:** the UI1 tests pass, the whole suite and `npm run lint`/type-check pass, and Training looks identical at 390px (screenshot before and after).

**Lint baseline (2026-11-01):** `npm run lint` already fails on 14 errors in untouched files; CI runs no eslint. Each later item leaves eslint clean on the files it touches, including the existing errors in `settings/page.tsx` (UI5), `QuickActionSheet.tsx` (UI2) and `TargetMovementsEditor.tsx` (UI6).
