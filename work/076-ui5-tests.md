---
id: 076
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI5 tests: Settings page

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/ui-settings`. Write tests only; no app code.

## Read
`initiatives/ui-audit/spec.md` → "UI5"; `features/ui-audit/settings-page.feature`; `app/(app)/settings/page.tsx` today; how the sub-pages read the user (`getCurrentUser()`); existing Settings tests, if any; `lib/auth/roles.ts`; the repo's BDD step setup (`__tests__/features` or wherever `library.steps.ts` lives).

## Do
Write failing tests for every scenario, against the interfaces the spec implies: a server `page.tsx` that reads the user on the server (no `useSession` in the server render path), blocks in a fixed order with accessible names, the Admin block gated by `isAdminRole`/`isEditorRole`, an Equipment row linking to `/settings/equipment`, the Theme/Mode rows showing current values, and settings still saving (through the existing `useUserSettings`/API). Pin any component names or paths you assume at the top of the test file. For "renders on the server", test that rendering the page server-side doesn't call client-only hooks (or render it in a node environment); say how in the handback. Prove the tests can fail (break matrix, small batches). Lock the files read-only.

Run: `export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock && npm run test:run -- <paths>`.

## Done when
Tests exist for each scenario, fail for the right reason now, and the break matrix shows each can catch its break.

## Hand back
Packet with test paths, the assumed interface, and the scenario → test map. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created; dispatched to test-builder (wF:p1).
- 2026-11-01 MDT: handback received. Sent back: (1) no weight-unit control (Dustin hid lbs/kg in fba784df; spec and .feature corrected); payload still carries defaultWeightUnit unchanged. (2) test-builder deletes the superseded TL5b settings-agent-access-link.test.tsx (its coverage is in the new file). Connected sign-in methods: keep today's behaviour, don't pin the GOOGLE question.
- 2026-11-01 MDT: revision back; lead re-ran 59 red. Accepted.
