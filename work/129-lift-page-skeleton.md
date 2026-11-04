---
id: 129
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin ("a skeleton loaded immediately upon click")
updated: 2026-11-02
---
# Per-lift page: loading skeleton

Checkout: worktree2, branch `feature/lift-page`, uncommitted. Phone preview is running on :3200 from this checkout (the lead restarts it after you finish; don't stop it, use another port for your own checks).

## Goal
Dustin on the phone preview: tapping a lift takes 1–2 s with nothing happening. Make the last scenario in `features/analytics/lift-page.feature` ("A skeleton shows at once") true.

## Do
- A `LiftSkeleton` matching the real page's layout (back link, title, chips row, chart folder with tiles/chart/ranges, records and sessions folders), using the app's existing skeleton/pulse style (see `app/(app)/library/loading.tsx`, `app/(app)/training/loading.tsx`).
- Show it instantly on navigation: `app/(app)/progress/lift/[id]/loading.tsx` and the Suspense fallback, and as LiftView's loading state (replacing "Loading…"), including chip switches.
- Same height as the real page so nothing jumps. Respect reduced motion.
- Look for the slow part of the 1–2 s (route queries, client fetch waterfall, dynamic page compile) and report it; fix it only if it's small and inside this page.
- Tests: a component test that LiftView renders the skeleton (not "Loading…") while loading, and that loading.tsx renders it. Keep the suite green.
- Screenshot the skeleton at 390px, light and dark, into `initiatives/analytics/docs/assets/129/`.

## Hand back
Use `handoff-implementer`. First line `Report: …`. Don't edit `work/`, `STATE.md`, `status.md` or locked tests. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created from Dustin's preview feedback; small UI fix, test-builder skipped; dispatched to implementer (wF:p2).
- 2026-11-02 CST: back; lead re-ran lift tests + tsc; preview restarted.
- 2026-11-03 CST: Dustin approved on the phone preview ("I also approve of the fix and the change"). Accepted.
