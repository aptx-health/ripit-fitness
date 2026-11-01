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

## UI3: Library tabs and Workouts

Branch `feature/ui-library-tabs`, stacked on UI2. Audit sections "Library → Tabs", "Workouts", "Workout detail dialog".

1. **Paper tabs, not SegmentedControls.** Top level: "Workouts" (Bookmark icon, brown `mine` tone, count chip) and "Programs" (BookOpen, green `next` tone), driving the existing `?type=` URL. Inside Programs: "My Programs" and "Browse" as that folder's own green paper tabs, driving `?tab=`. Content sits in the folder box under its tabs. Use `PaperTabs` from UI1, controlled from the URL; check the URL value before passing it (an unknown value falls back to the default). Render each panel with the `${idPrefix}-panel-${id}` ids, or set `aria-controls` to what exists.
2. **Remove the "MY WORKOUTS" label** that repeats the selected tab.
3. **Saved workouts as rows in one box** (`divide-y`, like Pinned on Training): no per-row cards, no `doom-corners`; pin and ⋮ as borderless 48px icon buttons; "PINNED" becomes the Pin icon in brown (or a small brown chip).
4. **Empty state:** a quiet box with Training's `EmptyLine` style.
5. **Row menu (⋮):** plain `border-2 border-border bg-card`, no brackets.
6. **Workout detail dialog:** a brown "Workout" paper tab on a `border-2 border-secondary folder-box` box, no brackets. Add a reusable paper-tab title piece (e.g. `PaperTabTitle` with `asChild`) so dialog titles stop copying `SectionTab` classes, and switch the Quick Actions sheet to it. Start button matches Training's Start Workout (Play icon + label).
7. `SegmentedControl` stays only for in-form switches.

**Tests:** keep existing Library tests passing; add tests for URL-driven tabs (clicking a tab updates `?type=`/`?tab=`; an unknown value falls back; back/forward follows the URL).

**Done when:** suite, tsc, eslint/biome on touched files pass; 390px screenshots (light, dark) of Library Workouts, Programs → My Programs, Programs → Browse (tabs only; Browse cards are UI4), the row menu, and the detail dialog; Training and Quick Actions unchanged.

**Carried into UI4 from review 072:** Browse's sticky filter strip uses `bg-card` (not `bg-background`) inside the green box; no boxes in boxes (My Programs drops its own list border; Browse cards are not separate bordered frames inside the Programs box); the Workouts count chip follows a new server count after `router.refresh()`; `PaperTabTitle` can render a non-heading (`span`) so the detail dialog has one h2; the close square and row menu get `folder-box` so mouse hover doesn't turn them gold.

## UI4: Browse and program detail

Branch `feature/ui-browse`, stacked on UI3. Audit sections "Browse", "My Programs", "Program detail", plus the 072 carry-overs above.

1. **Browse cards are compact rows/folders inside the green Programs box** (no separate bordered frames, no `doom-corners`, no noise): name (bold uppercase) with the STRENGTH/level chip in Training's filled chip style; a 2-line description; one meta line ("Beginner · machines · 5 wk · 3×/wk"); "Add" as an outline button on the right like Training's Start. Drop or fold in "Published …". Aim for ~5 programs per screen at 390px. Keep every existing action (add, view details, cloning progress).
2. **Filter and footer:** the sticky filter strip uses `bg-card`; "Level" becomes a small dimmed tab or chips; "Request a program" is a quiet row with an outline button (no dashed box). Empty and filtered-empty states use `EmptyLine`.
3. **My Programs:** drop its own outer list border (it's inside the box now); row titles lose `doom-heading`; ACTIVE as a green chip; Create new program as Training's quiet outline button.
4. **Program detail:** the program name is the title; the week is a green folder with a "Week 1 of 2" tab carrying the arrows, day rows inside; Recent History a quiet folder with a count chip; no `doom-corners`; day titles plain.
5. **From 072:** Workouts count follows a new server count after `router.refresh()`; `PaperTabTitle` can render a `span` (dialog gets one h2); close square and row menu get `folder-box`.

**Done when:** suite, tsc, eslint/biome on touched files pass; 390px touch-emulated screenshots (light, dark) of Browse (top and scrolled), filtered-empty, My Programs, program detail (week + history); Training, Quick Actions and Library Workouts unchanged.

**Carried into UI5/UI6 from 075:** the shared `components/ui/radix/popover` adds `doom-corners` and `doom-noise` for every caller (drop them there once its callers are checked); `ProgramBackLink` "← Library" is a 20px target (give it 48px, like `SubpageHeader`'s back link).

## UI5: Settings main page (and the SSR 500)

Branch `feature/ui-settings`, stacked on UI4. Audit section "Settings → Main page" and bug 1. **Behaviour:** `features/ui-audit/settings-page.feature`.

1. **Fix the SSR 500.** `app/(app)/settings/page.tsx` is a client page calling `useSession()` during server render. Make the page a server component that reads the user with `getCurrentUser()` (as the sub-pages do) and passes what the client parts need (role for the Admin block, email); client interactivity moves into child components. `GET /settings` must return 200 in a production build.
2. **Split the 546-line file** into a server page plus small client blocks (e.g. `components/settings/*`), each under the repo's file-length limit.
3. **`PageTitle`**: SETTINGS.
4. **Folder blocks** with tabs and rows, one box each, in this order: **Look** (Theme, Mode), **Workouts** (Workout mode, Intensity, Rating type; no lbs/kg control: Dustin hid it on purpose in fba784df, and it stays hidden), **Training targets** (Muscle balance, Target movements, **Equipment** (new row → `/settings/equipment`), Agent access), **Account** (email, connected sign-in methods, Change password, Sign out), **Help** (Feedback, Support), **Admin** (admins/editors only).
5. **Rows, not heavy buttons:** navigation rows have a fixed-width icon column and a chevron; Theme and Mode show their value on the right ("Theme · Ripit ›"); Sign out is one quiet outline button at the end of Account. The in-form `SegmentedControl`s (Workout mode, RPE/RIR) stay.
6. Every existing setting still saves and loads exactly as before; Change password still works; Admin rows only for admin/editor.
7. Fix the existing eslint error in the file (around line 308). Look into the "Connected sign-in methods: GOOGLE" for a password user; fix it if it's a real bug, or say it's seed data.
8. Carry-over from 075: drop `doom-corners`/`doom-noise` from the shared `components/ui/radix/popover` if no other caller relies on them (check them all).

**Done when:** the 076 tests pass; suite, tsc, eslint/biome on touched files pass; prod build serves `/settings` 200 with no server error in the log; touch-emulated 390px light/dark screenshots of the whole page, as admin and as a plain user.
