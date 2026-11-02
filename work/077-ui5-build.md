---
id: 077
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI5 build: Settings main page

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/ui-settings` (stacked on UI4).

## Read
- `initiatives/ui-audit/spec.md` → shared rules, "UI5", and the 075 carry-overs; `features/ui-audit/settings-page.feature`.
- The 076 tests (read-only; interface pinned at the top of `__tests__/app/settings-page.test.tsx`), plus `settings-page-ssr.test.tsx` and `settings-save.test.tsx`.
- The audit's Settings section and `09-*`, `16-*` screenshots; `app/(app)/settings/page.tsx` today.

## Do
Build UI5 as the spec says. No lbs/kg control (hidden on purpose). Rows with a fixed icon column and chevrons, values on the right for Theme/Mode, one quiet outline Sign out. Fix the eslint error. For the shared popover, check every caller before dropping `doom-corners`/`doom-noise`; list them in the handback. Prove the SSR fix in a **production build**: `npm run build` then serve on your own port, `GET /settings` signed in → 200 with no server error in the log (the phone preview is not running). Touch-emulated 390px screenshots, light and dark, as admin and as a plain user, into `initiatives/ui-audit/docs/assets/077/`. Leave data as found. Don't commit.

## Done when
Spec "Done when".

## Hand back
Packet per `handoff-implementer`, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created after 076; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: handback: done, green, prod build 200. 078 review dispatched.
- 2026-11-01 MDT: Dustin on phone preview: "Everything else looks good". Accepted.
