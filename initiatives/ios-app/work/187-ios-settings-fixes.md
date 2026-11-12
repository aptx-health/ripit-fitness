---
id: 187
state: accepted
waiting_on:
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-08 Dustin (slice 7 autonomy; E-ink calls answered)
updated: 2026-11-08
---
# iOS slice 7: fixes after review 186

## Goal
Close review 186's findings so slice 7 can be accepted.

## Read first
- `work/186-handback.md`: the review, with file pointers and screenshots.

## Dustin's answers (2026-11-08)
- **No E-ink parity work beyond the basic theme.** Don't chase motion: leave pushes and sheets native. Keep the existing E-ink display switch as it is, but change its hint so it only promises bolder text.
- **E-INK colors: yes, like the web.** Colored text and colored borders become black in the E-INK theme (`app/globals.css` ~2754). Tab and button fills stay as the web has them.

## Do
1. **Color scheme from the theme:** choose light or dark (status bar, tab bar, switches, alerts) from the theme's `background` brightness, not from the mode. DOOM, CYBER, SYNTHWAVE '84 and DRACULA stay dark in "light" mode, as on the web.
2. **Leaving E-INK restores your mode:** follow the mode part of the web's `pickTheme` (`hooks/useThemePreference.ts:74`). Picking E-INK remembers your mode, and leaving it restores that mode. Don't auto-enable E-ink display (Dustin: no display parity).
3. **Theme list keeps its place** after a pick (scroll to the selected row).
4. **E-INK black text and borders,** as above, done in one place (`TabTone.edge` and the text styles).
5. **Inline navigation titles scale with text size** (`Theme.swift:37`).
6. **E-ink display hint:** "Bolder text" only; no motion promise.

## Done when
- `mise run ios-check` exits 0. 184's locked files are unchanged.
- Each fix is checked in your simulator with screenshots: the 4 dark-in-light themes, RIPIT dark → E-INK → RIPIT, and E-INK beside the web's (`slice7-assets/web-eink-*`).

## Don't touch
- `work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.

## Hand back
The implementer packet.

## Log
- 2026-11-08: created from review 186 and Dustin's E-ink answers.
- 2026-11-08 06:47 MST: dispatched to ios-impl (running; context 2%, kept)
- 2026-11-08: handed back complete; lead re-ran ios-check (exit 0, 241), fixed the stale feedback-email comment, committed. Re-check in 188.
- 2026-11-08: accepted after re-check 188.
