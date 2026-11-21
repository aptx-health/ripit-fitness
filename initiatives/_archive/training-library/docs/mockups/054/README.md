# Training as three tabbed blocks (054)

Static mockups at 390px, built from the TL6 build and `../050/mockup-a.html`. They use the real Ripit tokens, Rajdhani, the TL6 clip-path paper tab and the dimmed-green "See all" tab, with the wt2 preview data. In a full-page shot the bottom nav sits at the end of the page; in the app it stays fixed. No app code was changed.

| File | State |
|---|---|
| `current.png` | Today's TL6 build (with the "See all" tab tweak), for comparison |
| `state-1.html` / `.png` | 3 suggestions, with **Pinned Workouts** and **Up Next** selected |
| `state-2.html` / `.png` | The same data, with **Recent** and **Active Program** selected |
| `state-3.html` / `.png` | No suggestions and no active program. The coach block is hidden, Pinned Workouts is selected, and the Program block shows "No active program" with "Find a program" |

## The blocks

1. **Coach:** the "From your coach · 3" tab with the "See all" tab, and the same content as TL6.
   - Dustin called these "Proposals", but users only ever see "suggestions", and the tab says "From your coach". The mockup keeps that, because "proposal" is the admin word and the TL5a spec bans it in user-facing text.
2. **Workouts:** "Pinned Workouts" and "Recent" tabs side by side. The selected tab is filled in barrel brown and sits in front; the other is the quiet tan tab, slightly lower.
   - "See all" fits as a third, dimmed tab on the right, but only just: the tab type comes down from 15px to 14px, and the unselected "Recent" drops its icon.
   - It shows only while Pinned is selected, since it goes to My Workouts, where pins live. Recent has no "See all" today (full history lives on each program's page), so none is shown.
3. **Program:** "Up Next" and "Active Program" tabs, filled in green.
   - Up Next is today's Up Next.
   - Active Program is today's Current Program row ("Week X of Y · N of M workouts done", the bar and View), plus a one-line "Next: Week 1 · Day 1 · Upper" so the tab still points at the next workout.
   - With no active program, the block stays and shows the placeholder under whichever tab is selected.

## How the tab switching would work

- **Client state:** each two-tab block becomes a small client component. It uses `SegmentedControl`'s accessibility pattern (`role="tablist"`, `aria-selected`, arrow keys), styled as paper tabs. Both panels are server-rendered with the page, and switching just hides one, so there's no fetch and no layout jump.
- **Remembering the choice:** I recommend remembering it per device in `localStorage`, under keys like `training.workoutsTab` and `training.programTab`.
  - Read it after mount, like the TL2 dates, so the server render and hydration agree. The first paint shows the defaults, and a stored "Recent" switches in a beat later. That's acceptable for a tab, and avoids storing a UI preference in the database.
  - Don't remember it per user in the database (the `UserSettings` table) unless Dustin wants the choice to follow him across devices.
- **Defaults:** Pinned Workouts when the user has pins, otherwise Recent. Up Next when there's an active program with a next workout, otherwise Active Program.
  - A stored choice only applies when that tab has content. For example, a stored "Pinned" with no pins falls back to Recent, so a remembered tab never opens onto an empty panel.

## Trade-offs

- **Shorter page:** three blocks instead of five sections. The first screen shows the coach card and the start of Workouts; Program sits just below.
- **One tap away:** Recent, and either Up Next or Active Program, are one tap away instead of visible on scroll. That's fine when the default is right, but someone who mostly repeats recent sessions pays a tap each visit, unless the choice is remembered.
- **Two things hidden:**
  - With Active Program selected, the Start Workout button is hidden. The "Next: …" line keeps the context, but starting takes a tap back to Up Next (or View).
  - With Recent selected, pinned workouts are hidden.
- **Tight header:** the Workouts header is full at 390px. A longer label ("Pinned Workouts" is already long) or a bigger count won't fit. Shortening "Pinned Workouts" to "Pinned" would free space.
- **Hidden count:** the hidden tab shows no count or badge, so "Recent" doesn't say how many there are. TL6 showed counts on both.

## Open questions for Dustin

1. Remember the selected tab per device (my recommendation), per account, or not at all (always the defaults)?
2. Should Active Program keep a Start button, so you can start from either tab, or is the "Next: …" line enough?
3. Keep "Pinned Workouts", or use "Pinned" so the Workouts header has room?
4. With no active program, should the Program block show at all? This mockup keeps it with "Find a program", as asked. An alternative is hiding it and letting the empty home's "Find a program" cover that case.
5. Is "suggestions" ("From your coach") still the right word, rather than "proposals", which admin uses?
