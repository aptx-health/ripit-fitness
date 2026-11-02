---
id: 079
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI5 fixes from review 078

Checkout: worktree2, branch `feature/ui-settings`. Read `work/078-handback.md`.

## Do
1. Sign-in methods: show "Couldn't load" (not "…" forever) when `/api/settings/connected-accounts` fails.
2. Intensity: the whole row toggles the switch (48px hit area), keeping `role="switch"` semantics and the label.
3. `connected-accounts` returns `hasPassword` (whether a `credential` account exists); hide Change password when it's false. Keep the existing fields so nothing else breaks.
4. Clear the password fields after a successful change; tidy `HelpBlock.tsx` indentation.

Add tests in a new file for 1–4 (the 076 files stay read-only). Don't commit.

## Done when
Suite, tsc, eslint/biome on touched files pass.

## Hand back
Short packet, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created from 078 findings; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: done; lead re-ran Settings tests. Phone preview next.
- 2026-11-01 MDT: Dustin on phone preview: "Everything else looks good". Accepted.
