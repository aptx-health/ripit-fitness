Report: complete

(Received from test-builder via cross-session message, 2026-10-26; summarized by the lead.)

- `npm run test:run -- proposals-approve-transaction`: 5 failed, 1 passed. The failures are: no timeout passed; P2028 rethrown; and blank weight, notes and week name stored as ''. The passing test checks that an unrelated P1001 error is still rethrown.
- agent-tools 240/240 still pass. Biome is clean on both files, and both are read-only.
- Steps-file cleanup:
  - Import order fixed with biome.
  - The redundant `program.count()` in "Approving fails cleanly" (about line 630) was removed; there was no exact duplicate. A similar pattern remains in the Reject and Revert scenarios.
- New file `__tests__/lib/proposals-approve-transaction.test.ts`: a real test DB, with the client wrapped in a Proxy to record or fail `$transaction`.
- Pass-proof: the fake passed 6/6. Each of 8 broken variants failed exactly its targeted test, including a 29999 ms timeout and a P2028 handler that swallows every error. The fake is deleted.
- Assumptions for 013: P2028 returns code `invalid`, and its error mentions timeout / timed out. The empty-string test edits the payload directly, so propose-side validation can go either way.
- Not verified: the P2003 race, review risks 2 and 3, a real large-program timing, and rollback after a mid-transaction timeout.
