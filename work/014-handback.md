Report: complete

(Received from test-builder via SendMessage, 2026-10-26; summarized by the lead.)

- `program-proposals`: 4 failed, 55 passed (59). All 10 scenarios are bound, and the old revert scenarios are removed. The other files pass 180/180. Biome is clean; the file is re-locked.
- The 4 failures are all new behaviour: inverse is still set on approve, and revert still deletes the program and marks the proposal reverted.
- The new scenario asserts:
  - `{ ok:false, code:'invalid' }` with the exact spec text;
  - the full program tree unchanged;
  - the proposal `applied`, with `decidedAt` and `targetId` unchanged and `inverse` null.
- Pass-proof: the fake passed 59/59, and 8 broken variants were each caught by their targeted step. The fake is deleted.
- Note for 015: `revertProposal` refuses with `not_applied` when `inverse` is null, so the program refusal must be decided before that check.
- Not verified:
  - the admin route and UI (button hidden);
  - revert of a rejected or reverted program proposal (which code wins);
  - old rows that still have an inverse.
