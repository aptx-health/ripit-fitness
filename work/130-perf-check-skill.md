---
id: 130
state: accepted
waiting_on:
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-03 Dustin ("let's have the reviewer take care of that and wrap this in some skills")
updated: 2026-11-03
---
# perf-check: automated performance checks for reviews

Checkout: **worktree1**, branch `feature/perf-check` (from dev; does not have the lift page yet; PR #1035 is on worktree2's `feature/lift-page`, read it there or with `git show 432dd90b`). Don't touch worktree2 or its DB.

## Why
Review 127 checked the lift page on localhost, where each request takes a few ms, and missed a 1–2 s blank tap on the phone (work 129: a client waterfall RSC → route JS → client fetch, no `loading.tsx`, so no prefetch). Coding agents also write sequential awaits or per-row queries that only hurt on real links. We want checks a reviewer (and implementer) can run, not rules they must remember.

## Goal
A project skill `.claude/skills/perf-check/` (SKILL.md + scripts) that a reviewer runs on any UI or API change, and that catches the lift-page problem automatically.

## Do
1. **Static scan** (fast, no server; a script with file:line output and a non-zero exit on findings, plus an allowlist for accepted cases):
   - App Router pages under `app/(app)/**` that load data (client fetch or dynamic segment) with no `loading.tsx` in or above their folder.
   - Independent `await`s in a row in route handlers / loaders that could be `Promise.all` (heuristic is fine; say how noisy it is), and awaits inside loops.
   - Client components that fetch page data in `useEffect` on mount where the server page could pass it in (report-only).
2. **Throttled tap test** (Playwright, already in the repo): emulate a phone link (CDP network conditions, e.g. ~150 ms RTT, ~1.5 Mbps down; CPU 4× slowdown), tap a given link/button and measure (a) time until the screen visibly changes and (b) time until the content selector appears; record the request chain after the tap and report its depth (sequential dependent requests). Budgets, configurable: feedback ≤ 100 ms after the tap, content ≤ 2 s; fail with a clear message and save the timeline.
3. **Query counts**: a small helper for DB tests that counts Prisma queries for one call (via `$on('query')` or the test client), so a test can assert "≤ N queries regardless of row count". Show it on one existing route's test only as an example; don't rework other tests.
4. **Fold in what exists**: reference `.claude/skills/prisma-check` and `.claude/skills/network-resilience-audit` from the new skill rather than duplicating them; say which parts each covers.
5. **Prove it**: run the tap test against the lift page with and without `loading.tsx` (in a throwaway copy or a stash of PR #1035's tree, using a seed user on a DB you start for worktree1, leaving data as found): it must fail without and pass with. Run the static scan on dev and report what it finds today (findings only; don't fix app code).
6. **Wire it in, as proposals**: in your packet, give the exact one-line additions you'd make to the reviewer brief and to implementers' "done when" for UI work (the lead applies them), and any `package.json` script names you added.

## Done when
The skill's SKILL.md says when and how to run each check; the scripts run from the repo root with one command each; the before/after proof is recorded with numbers; Biome clean on new files; existing suite still passes.

## Hand back
First line `Report: complete | needs decision`. List files, commands, the proof numbers, today's static findings, and the proposed brief lines. Commit nothing. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-03 CST: created from Dustin's ask after work 129; dispatched to reviewer (wF:p3) in worktree1.
- 2026-11-03 CST: back; lead re-ran perf:scan; AGENTS.md bullet added; PR opened.
- 2026-11-03 CST: Dustin merged #1036. Accepted.
