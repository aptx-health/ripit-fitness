# STATE

## Needs Dustin
None

Running quietly: None.

## Active
- UI audit (initiatives/ui-audit): bring Library, the Workout center and Settings up to the Training style, plus research the iOS PWA top blur. Building UI1–UI6 as a gh stack; UI1 is PR #1014 (stack bottom); style stack in worktree2 (UI2 next); scroll fix is PR #1015 (on #1014, outside the stack); UI2 on phone preview.

## Blocked
None

## Dormant/Proposed
See [ROADMAP.md](ROADMAP.md).

## Recently completed
- Training + Library redesign released to prod (ripit-infra #133, 2026-10-31; dev #1006 carrying stacked #1007–#1012, release #1013, images 9afbb6f7). Training is a home with tabbed folder blocks, Library replaces Programs, plus pinned workouts, coach suggestions for users and user agent tokens. Items 034–058 accepted. Dustin: "all working fine in prod".
- Agent tools slice 5 released to prod (ripit-infra #132, 2026-10-31): agents propose saved workouts and edits; readOnlyHint on read tools. Items 030–033 accepted.
- Agent tools slice 4 released to prod (ripit-infra #131, 2026-10-30): agents read anchors, targets and FAU volume and propose anchor and target changes. Items 024–029 accepted. The faster test harness (#1002) shipped in the same release.
- Agent tools slice 3 released to prod (ripit-infra #130, 2026-10-27): stall and effort numbers, raw export (MCP + CSV), break-matrix skill. Items 016–023 accepted.
- Agent tools slice 2 released to prod (ripit-infra #129 merged 2026-10-27).
- Agent tools slice 2: items 009 to 015 accepted (2026-10-26). Agents read programs and propose new ones; no revert for programs; admin back arrow fix; phone-preview skill. First run under Project Structure V3.
- Agents read feedback: `list_feedback`, proposals linked to feedback, and resolve on approve (007 and 008, 2026-10-25).
- Agent tools slice 1: items 001 to 006 accepted (2026-10-25). Covers the MCP server, proposals with approve/reject/revert, the admin pages and Discord #proposals notifications.
- AGENTS.md trimmed to 114 lines (2026-10-25).
