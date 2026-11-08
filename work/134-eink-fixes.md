---
id: 134
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-04 Dustin (e-ink spec); lead decides fix details
updated: 2026-11-05
---
# E-ink: fixes after review 133

Checkout: worktree2, branch `feature/eink-theme`, uncommitted. Small fixes: no separate test-builder; add tests yourself for 1, 2, 3 and 7.

## Read
`work/133-handback.md` (findings 1–8 with file:line) and `initiatives/eink-theme/docs/assets/133/`.

## Do
1. Inputs visible under E-INK: `border-input` black (and check the `bg-input` uses still read as fields).
2. Under E-INK, `opacity-*` fades don't drop text below 7:1: pending/planned rows use muted-foreground at full opacity; disabled controls keep a visible cue that isn't a fade (dashed border or muted fill + `cursor-not-allowed`), still distinguishable from enabled.
3. Guard both inline scripts' first `localStorage.getItem` (and the darkMode migration) so the cookie fallback applies when storage throws; ThemeInitializer must not throw either. Pre-existing, but it's the e-ink first-paint path.
4. Follow-along progress segments: done vs remaining not by colour alone under E-INK (e.g. filled vs outlined).
5. The semibold floor covers arbitrary small sizes (`text-[10px]`/`[11px]`/`[12px]`) too.
6. Auth pages' hard-coded greys meet 7:1 under E-INK (placeholder, Google button border).
7. Leaving E-INK restores the mode the user had before picking it (store it when picking E-INK; fall back to the default mode).
8. Fix the stale comment in LiftSkeleton.tsx:15.
- Fresh screenshots of sign-in, a logger with planned rows, a disabled control and follow-along at 390 and 632×840, plus grey copies, into `initiatives/eink-theme/docs/assets/134/`. Leave data as found.

## Done when
Full suite and `npx tsc --noEmit` clean; locked e-ink tests untouched and passing (list any conflict with line and value instead of editing); Biome clean on your files.

## Hand back
Use `handoff-implementer`. First line `Report: …`. Don't edit `work/`, `STATE.md`, `status.md` or locked tests. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-04 CST: created after review 133; dispatched to implementer (wF:p2).
- 2026-11-04 CST: back; lead re-ran; preview for the BOOX check.
- 2026-11-05 CST: Dustin checked on the BOOX via phone preview ("Looks good"). Accepted.
