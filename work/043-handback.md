Report: complete. Relayed by SendMessage 2026-10-31; saved by the lead (condensed).

**Verdict:** fix first, for one medium issue.

**Checks:** 320 tests pass; tsc is clean.

**First pass:** all OK.
- The page glue: the loader is copied line for line from `/programs`.
- The redirects, checked live.
- The cloning flow, from reading the code.
- The deletions.
- No stale links.
- The nav.

**Findings**
1. **Medium:** `LibraryView.tsx:76`. `libraryType` is `useState` seeded from `?type`, and it never re-syncs.
   - From `/library?type=workouts`, tapping the Library tab still shows Workouts.
   - From Programs, opening the saved-workouts entry in the QuickActionSheet keeps Programs.
   - `activeTab` (`?tab`) uses the same pattern.
2. **Low:** `library/page.tsx:62`. The week SQL has no `isArchived = false`. This came over unchanged from `/programs`.
3. **Nit:** `library-support.ts:16` names `ConsolidatedProgramsView` in a comment.

**Outside the item:** `/settings` gave an SSR 500 in dev ("Invalid hook call" at `useSession`, `settings/page.tsx:20`), then recovered on the client.

**Visual:** the switch hierarchy, header, badge, actions and nav underline all OK (Playwright). Screenshots are in `docs/assets/043/`.
