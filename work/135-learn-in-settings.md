---
id: 135
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-06 Dustin ("Row in Help")
updated: 2026-11-06
---
# Learn: link it from Settings

Checkout: worktree2, branch `feature/learn-in-settings` (from origin/dev at 457afc54). Small: no separate test-builder; write the tests yourself.

## Goal
Learn has had no way in since Progress replaced it (2026-11-02). Dustin wants it found from Settings.

## Read
- `components/settings/HelpBlock.tsx`, `components/settings/SettingsBlock.tsx` (ROW, RowIcon)
- `components/features/learn/LearnBrowser.tsx` (header), `CollectionDetail.tsx`, `ArticleDetail.tsx` (their back links go to `/learn`)
- The "← Settings" header the Settings sub-pages use (`__tests__/components/settings-subpages.test.tsx` shows it)

## Do
1. Add a row to the Help block, first: BookOpen icon, label "Learn", hint "Articles and guides", chevron; a `Link` to `/learn`. Same 48px row as Send feedback.
2. `/learn` gets the shared "← Settings" back header above the LEARN title. Article and collection pages keep their back links to `/learn`.
3. Tests: the Help row links to `/learn`; the Learn page shows the Settings back link.
4. Nothing else changes: Learn stays out of the bottom nav.

## Done when
Tests pass, `npx tsc --noEmit` clean, `npm run perf:scan -- --changed origin/dev` clean, and a 390px screenshot of Settings (Help block) and `/learn` in `work/assets/135/`.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Stay inside the item.

## Log
- 2026-11-06 CST: created; Dustin chose "Row in Help". Small: test-builder skipped. Dispatched to implementer.
- 2026-11-06 CST: back "needs decision": /learn still redirects to /progress (next.config.ts:64-67). Lead decided (follows Dustin keeping Learn): remove both redirects. Lead amended locked `__tests__/components/learn-removal.test.tsx` and weekly-report.feature ("Learn links stay on Learn", work 135). Sent back to implementer: remove the redirects, retake the /learn screenshot. perf:scan's /learn and /settings no-loading findings: add loading.tsx for /learn only (in scope now); /settings → ROADMAP perf sweep.
- 2026-11-06 CST: back complete; lead re-ran (Learn tests 7/7, tsc clean). Phone preview for Dustin.
- 2026-11-06 CST: Dustin on the phone preview: "easily findable and works - approved". Accepted.
