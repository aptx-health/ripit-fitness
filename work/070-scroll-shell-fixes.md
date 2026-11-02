---
id: 070
state: accepted
waiting_on:
executor: scroll-shell
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("Ok yes" to the scroll-shell item)
updated: 2026-11-01
---
# Scroll shell fixes from review 069

Checkout: worktree1, branch `feature/ui-scroll-shell`. Read `worktree2/work/069-handback.md`.

## Do
1. Fix the eslint error at `app/(app)/welcome/page.tsx:28` (`useRef(Date.now())` during render), without changing behaviour.
2. Make `lockAppScroll()` nest safely: a counter (or find `#app-scroll` by id without checking its overflow), so the container only unlocks when the last lock releases. Add a test for two overlapping locks.

Don't commit.

## Done when
Suite, tsc, eslint and biome on changed files pass.

## Hand back
Short packet, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created from 069 findings 1–2; dispatched to scroll-shell (wF:p5).
- 2026-11-01 MDT: committed 1aa44d33, PR #1015 (base feature/ui-shared). Accepted on Dustin's device check.
