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

## UI1b: inner-scroll app shell (iOS top blur)

Branch `feature/ui-scroll-shell`, stacked on UI1. Added 2026-11-01 after Dustin still saw the blur on the installed UI1 preview.

**Why:** Collie 1.23.4 has the same head tags as UI1 but doesn't blur. Its page never scrolls: a fixed-height shell (`--app-h`) holds the header, and content scrolls in an inner `flex min-h-0 flex-1 overflow-y-auto` container. Ripit scrolls the document, so content slides under the status bar, where iOS 27 blurs the root scroller's top edge (inference; not device-verified).

**Do:** in `app/(app)/layout.tsx` (mobile), make the shell a full-height flex column (`100dvh`, or a JS-measured `--app-h` if `dvh` misbehaves in standalone), with an opaque safe-area spacer at the top that never scrolls, the bottom nav as it is, and the page content in one inner scroll container. Then make everything that assumed window scrolling still work:
- scroll to top on navigation (Next scrolls the window; the inner container must reset too);
- any `window.scrollTo`, `scrollIntoView`, sticky elements, infinite lists, the workout logger, dialogs and sheets;
- the desktop layout (`md:` and up) must not change;
- no double scrollbars, no rubber-band gaps; keyboard opening in forms still works.

**Done when:** suite, tsc and eslint on changed files pass; a 390px screenshot of every main tab looks the same as before; and Dustin, after re-adding the app, no longer sees the blur.

## UI2: Quick Actions sheet

Branch `feature/ui-quick-actions`, stacked on UI1. Audit section "Workout centre button: Quick Actions sheet".

1. **Remove "Pick a workout / Coming soon"** (`QuickActionSheet.tsx:430-435`, plus the unused `LayoutGrid` import).
2. **The sheet is a folder:** a "Quick actions" paper tab (use the `SectionTab`/`PaperTabs` look, green) on a `border-2` box; the close button sits inside the box header; drop `doom-corners` and the bordered title strip.
3. **Rows like Training's:** plain bold uppercase titles (no `doom-heading`), muted meta line; keep the green chip only on "Continue your program". The draft and freestyle heads-up states use the same box and plain titles.
4. Fix the existing eslint errors in `QuickActionSheet.tsx` (around lines 368-369).
5. Keep behaviour and 48px targets the same; existing Quick Actions tests must still pass (update only assertions that pin the removed row).

**Done when:** suite, tsc and eslint on the file pass; 390px screenshots of the sheet in each state (normal, draft in progress, freestyle) in light and dark.

**Shared fix found in UI2:** the ripit theme's unlayered `[data-theme="ripit"] .bg-card:hover { border-color: gold }` (`app/globals.css:2348`) turns folder box borders gold under the pointer, and the hover sticks after a tap on phones. Fixed at the source in UI2 (068), since a `hover:` override never applies on touch phones. UI3 adds a reusable paper-tab title primitive (`asChild`) so dialog titles stop copying `SectionTab` classes.
