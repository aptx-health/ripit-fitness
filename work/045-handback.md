Report: complete (045, TL4 Pinned workouts build). Relayed by SendMessage 2026-10-31; saved by the lead (condensed).

**Migration:** `20261031200017_saved_workout_pinned_at` (ADD COLUMN `pinnedAt`, plus an index on `(userId, pinnedAt DESC)`).
- It was created with `db execute` + `migrate resolve --applied` against the wt2 DB, not with `migrate dev`.
- The wt2 DB was built with `db push`, so `migrate dev` would have reset it.
- The SQL is identical to the `migrate diff` output.

**Checks**
- 624/624 in the targeted files.
- Full suite: 2036 passed. The lead re-ran it with the same result.
- tsc, biome and eslint are clean.

**Built**
- **PATCH:** `pinned` works alone or with a rename.
  - Pinning again keeps the original `pinnedAt`.
  - A non-boolean value is a 400 before any DB read.
  - Another user's id is a 404.
  - A pin-only change restores `updatedAt`, so pinning never trips the proposal guards.
- **GET** returns `pinnedAt`.
- **`getTrainingHome`** gains `pinned`, as a fourth query.
- **`TrainingHome`:**
  - `PinnedSection` with "See all".
  - A shared `useSessionStart` hook for Start and Repeat: one request at a time, and the same 409 message.
- **`PinToggle`:** on the row (with a PINNED marker) and in the detail dialog header. It updates optimistically and reverts on failure.

**Screenshots:** `docs/assets/045/` (Playwright). The temporary data was cleaned up.

**Open points**
1. The spec says `migrate dev`, but in practice it was `db execute` + `resolve`.
2. GET and DELETE `/api/workouts/saved/[id]` still return 403 for another user's id.
