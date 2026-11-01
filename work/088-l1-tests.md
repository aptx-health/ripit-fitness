---
id: 088
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (picked direction A for all three; "heavy alterations")
updated: 2026-11-01
---
# L1 tests: logger confirmations

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/logger-shared` (from origin/dev). Write tests only; no app code.

## Read
`initiatives/ui-audit/spec.md` → "Workout screen (logger) build" and "L1"; `features/ui-audit/logger-confirm.feature`; the six confirm components named in the spec and their callers; `components/ui/radix/alert-dialog.tsx`; existing logger tests (`rg -l ExerciseLoggingModal __tests__`).

## Do
Write failing tests for every scenario against a `LoggerConfirm` component (pin its path and props at the top of the file; suggested `components/workout-logging/LoggerConfirm.tsx` with `open`, `onOpenChange`, `title`, `body`, `confirmLabel`, `onConfirm`, `destructive?`, `tone?`) and against each of the six call sites (role `alertdialog`, labelled; Escape cancels without calling the action; focus in and returned; each confirm's callback still fires; the titles and summary text in the feature; toast instead of `alert()` on completion failure). Keep existing logger tests passing. Prove the tests can fail (break matrix, small batches). Lock them read-only.

Run: `export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock && npm run test:run -- <paths>`.

## Hand back
Packet with test paths, the pinned interface, scenario → test map. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created; dispatched to test-builder (wF:p1).
- 2026-11-01 MDT: back; lead re-ran (red). Accepted; uncovered visual items go to the implementer (with a test for the 'First time logging' hide) and the reviewer's screenshots.
