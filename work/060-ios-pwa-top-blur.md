---
id: 060
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (asked for this research directly)
updated: 2026-11-01
---
# Research: blur at the top of the screen in the iOS PWA

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/ui-audit`. Research only: **no app code changes.** Write one note at `initiatives/ui-audit/docs/2026-11-01-ios-pwa-top-blur.md`.

## The problem (Dustin's words, summarised)
Since the latest iOS update, the Ripit PWA (installed from Safari to the home screen) shows a **blur at the top of every page**: anything that scrolls up toward the notch / status bar area gets blurred. It's most noticeable on the Training page. Other PWAs he uses (e.g. Collie) don't do this. Not a deal breaker, but he wants it understood.

## Do
1. **Read how the app handles the top of the screen:**
   - the viewport meta and `viewport-fit`, `apple-mobile-web-app-status-bar-style`, `theme-color`, and the manifest (`display`, colours), via `app/layout.tsx`, `app/manifest*` and `public/`;
   - safe-area handling (`env(safe-area-inset-top)`) and any sticky or fixed header;
   - any `backdrop-filter` / blur, or translucent backgrounds near the top, in `app/globals.css` and the layout components.
2. **Research what changed in recent iOS** (the newest release as of 2026-11) for standalone web apps: for example a system blur or "scroll edge effect" under the status bar, a change in how `black-translucent` works, or `theme-color` handling. Use primary sources first (WebKit blog, release notes, Apple developer docs), then credible bug reports or forum threads. Label every claim FACT (with link), INFERENCE or NOT VERIFIED.
3. **Compare with Collie,** if you can find how it sets these (it's Dustin's own app; look for it under `~/projects` and read only).
4. **Write the note:**
   - the likely cause, with your confidence;
   - 1–3 candidate fixes, each with the exact change, its trade-off, and how Dustin could check it on his phone (the phone-preview skill can serve a branch over the tailnet);
   - what you could not verify.

## Done when
- The note exists with sources and a recommended fix (or a clear "can't fix from our side, here's why").
- No app code has changed.

## Hand back
A short packet: the likely cause, the recommended fix, and your confidence. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created at Dustin's request; read-only, so his request counts as confirmation.
- 2026-11-01 MDT: dispatched to implementer (wF:p2).
- 2026-11-01 MDT: handback received; note exists, no app code changed. Review: waiting on Dustin.
- 2026-11-01 MDT: handback received; note exists, no app code changed. Review: waiting on Dustin.
- 2026-11-01 MDT: correction: the line above was appended twice by a lead shell mistake; it is one event.
- 2026-11-01 MDT: Dustin: do all of them, blur fix included. Accepted.
