---
id: 062
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI1 build: shared folder pieces

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/ui-shared`.

## Read
- `initiatives/ui-audit/spec.md` (UI1) and `features/ui-audit/shared-folder-pieces.feature`.
- The tests from 061 (read-only, don't edit): `__tests__/components/paper-tabs.test.tsx` (interface pinned at the top), `tabbed-block-behaviour.test.tsx`, `tabbed-block-uses-paper-tabs.test.tsx`, `__tests__/app/middleware-matcher.test.ts`, `__tests__/app/layout-pwa.test.tsx`.
- `initiatives/ui-audit/docs/audit/README.md` (S2, S3, S4, S6) and `docs/2026-11-01-ios-pwa-top-blur.md`.

## Do
Build UI1 as the spec says: `PaperTabs`, `TabbedBlock` on top of it, `PageTitle` (used by Training and Library), `SubpageHeader` (not adopted yet), the STYLING.md "Folder blocks" note, the status bar + `themeColor`, and the matcher exclusions. Leave `public/site.webmanifest` alone. Training must look identical: take a 390px screenshot of Training before and after (Playwright is fine; the phone-preview build serves on localhost if you set localhost auth, as the 059 audit did) and put both under `initiatives/ui-audit/docs/assets/062/`.

Don't commit; the lead commits.

## Done when
- The 061 tests pass, plus the whole suite, `npm run lint` and the type-check.
- The before/after Training screenshots match.

## Hand back
Packet per `handoff-implementer`, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created after 061; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: handback: built, all green; needs decision on 14 pre-existing eslint errors. Lead: baseline (CI runs no eslint; errors predate this branch); later items fix the ones in files they touch (settings/page.tsx, QuickActionSheet.tsx, TargetMovementsEditor.tsx). State → review; 063 reviewer dispatched.
- 2026-11-01 MDT: Dustin: keep UI1 as is (blur needs the scroll-shell item, 065). Accepted.
