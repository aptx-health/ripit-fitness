# STATE

## Needs Dustin
None

Running quietly: None.

## Active
- Coaching (initiatives/coaching): slice 1 (invite + link) approved 2026-11-06; PR #1041 into dev. Next: slice 2 (send), after workout library slice 3.
- Workout library (initiatives/workout-library): tidy saved workouts (pinned + tags), incl. where AI and coach workouts land. Slice 1 (order + Older fold) approved 2026-11-06; PR into dev.
- Learn linked from Settings (work 135): merged to dev 2026-11-06 (#1039); next release to prod.
- E-ink theme + display toggle (initiatives/eink-theme): merged to dev 2026-11-06 (#1038); next release to prod.
- Progress tab replacing Learn (initiatives/analytics): S1–S3 in prod 2026-11-02 (release #1034, infra #136). Per-lift page (/progress/lift/[id]) in prod 2026-11-05 (release #1037, infra #137).
- Planned sets in the workout logger (initiatives/agent-tools): in prod 2026-11-02 (release #1034, infra #136).
- Balance targets, one source of truth (initiatives/agent-tools): in prod (#1028, release #1029, infra #135, 2026-11-01).
- UI audit (initiatives/ui-audit): UI1–UI6, L1 (#1024) and L2 (#1025) are in prod (release #1026, infra #134, 2026-11-01). L3 (#1027) in prod via release #1029 / infra #135 (2026-11-01). Workout screen L1–L3 complete. Next: logger L4 and FAU targets (ROADMAP).

## Blocked
None

## Dormant/Proposed
See [ROADMAP.md](ROADMAP.md).

## Recently completed
- Agent tools: `get_equipment` read tool (#1023), in prod via release #1026 (2026-11-01).
- Training + Library redesign released to prod (ripit-infra #133, 2026-10-31; dev #1006 carrying stacked #1007–#1012, release #1013, images 9afbb6f7). Training is a home with tabbed folder blocks, Library replaces Programs, plus pinned workouts, coach suggestions for users and user agent tokens. Items 034–058 accepted. Dustin: "all working fine in prod".
- Agent tools slice 5 released to prod (ripit-infra #132, 2026-10-31): agents propose saved workouts and edits; readOnlyHint on read tools. Items 030–033 accepted.
- Agent tools slice 4 released to prod (ripit-infra #131, 2026-10-30): agents read anchors, targets and FAU volume and propose anchor and target changes. Items 024–029 accepted. The faster test harness (#1002) shipped in the same release.
- Agent tools slice 3 released to prod (ripit-infra #130, 2026-10-27): stall and effort numbers, raw export (MCP + CSV), break-matrix skill. Items 016–023 accepted.
- Agent tools slice 2 released to prod (ripit-infra #129 merged 2026-10-27).
- Agent tools slice 2: items 009 to 015 accepted (2026-10-26). Agents read programs and propose new ones; no revert for programs; admin back arrow fix; phone-preview skill. First run under Project Structure V3.
- Agents read feedback: `list_feedback`, proposals linked to feedback, and resolve on approve (007 and 008, 2026-10-25).
- Agent tools slice 1: items 001 to 006 accepted (2026-10-25). Covers the MCP server, proposals with approve/reject/revert, the admin pages and Discord #proposals notifications.
- AGENTS.md trimmed to 114 lines (2026-10-25).
