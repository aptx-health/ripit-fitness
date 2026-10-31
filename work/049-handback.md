Report: complete. Relayed by SendMessage 2026-10-31; saved by the lead (condensed).

**Verdict:** fix first, for two medium wording issues.

**Checks:** 1339 tests pass; tsc is clean.

**First pass:**
- **Authz:** sound. Every user path goes through `findSuggestion` or the list and count functions, filtered by user and kind. The exercise-library hiding was confirmed live, and the service is never reached for a hidden kind or another user's id.
- **Decisions:** the mapping, no revert, no cap check and `programId` are all right. Accept, Not now, reject and a second decision (409) were checked live.
- **Notifications:** approve and reject don't notify. Only create does.
- **The lift:** clean, with no duplicated logic.

**Findings**
1. **Medium:** users see the service summary as the title. It has raw keys and agent-style wording, e.g. "Update targets: mid-back 1 → 1.2" and "New saved workout: X (3 exercises)". The fix is a `suggestionTitle` built from display names, and a smaller h1.
2. **Medium:** `decision-route.ts:37` passes the service's `error` text to the user, which includes the word "proposal". It also returns the full proposal row as `data`.
3. **Low, service:** target and anchor proposals that change nothing are accepted. This belongs to an agent-tools item.
4. **Low:** the GET suggestion routes aren't rate limited.
5. **Nit:** "Undone" for reverted is fine.

**Visual:** consistent with TL1–TL4, apart from the length and casing of the h1. Screenshots are in `docs/assets/049/`, and the seeded data was cleaned up.
