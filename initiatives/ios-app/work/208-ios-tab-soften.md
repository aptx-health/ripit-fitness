---
id: 208
state: running
executor: ios-impl
skill: handoff-implementer
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-11 Dustin ("Can we soften the highlight on the active tab? Right now it's a hard edge")
updated: 2026-11-11
---
# iOS bottom bar: soften the active tab highlight

## Read first
Dustin's screen: `initiatives/ios-app/handoff/slice9b-assets/dustin-tab-hard-edge.png` (Settings active, RIPIT dark). The lit block is a hard rectangle that runs flush to the screen edge, with a full-width square accent line on top.

## Do
In `ios/App/Shell.swift`, keep look B (lit block, dimmed tabs, slide, nudge, haptic) but soften it:
- **Inset and round the block:** a few points in from the screen edges and the bar's top, with rounded corners close to the centre WORKOUT button's radius.
- **Soften the top edge:** the accent line becomes a short rounded pill centred over the tab (about half the tab's width), not a full-width square line.
- **Fade the fill:** `accent-muted` strongest at the top and fading toward the bottom, so there is no hard bottom or side edge.
- The pill and block still slide together. E-ink keeps its bold underlined label; Reduce Motion still jumps.

## Done when
- `mise run ios-check` exit 0.
- Shots of the end tabs (Training, Settings) and a middle tab in RIPIT dark, Blossom dark, one light theme and E-ink.

## Don't touch
`work/`, `STATE.md`, `status.md`. Don't `rm`.

## Hand back
A short packet, first line `Report: complete`, with the shots.

## Log
- 2026-11-11: created (ready).
- 2026-11-11 15:19 MST: dispatched to ios-impl (running; context 22%, kept)
