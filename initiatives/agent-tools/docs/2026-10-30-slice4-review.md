# Slice 4 review: agents read and propose anchors and targets

**Your call:** accept slice 4 (then I open the PR into dev), or tell me what to change.

## Try it on your phone
Link: https://dustins-macbook-pro.tailc29f1d.ts.net:10000/admin/proposals
Login: `dmays@test.com` / `password` (local dev data, no Discord posts)

1. Open **Update anchors: Squat, Horizontal Push, Vertical Pull**. Each pattern is a row showing before (empty) and after, with exercise names (Barbell Back Squat, Leg Press, ...), not ids.
2. Approve it. Then open Settings → muscle balance and check the anchors are there. Back on the proposal, **Revert** should now show; try it.
3. Open **Update targets: quads 1 → 1.3, hamstrings 1 → 1.2, rear-delts 1 → 0.8**. Approve, check Settings shows the new targets, and that lookback and the other calc settings didn't change.
4. Optional: change quads in Settings yourself, then try Revert on the targets proposal. It should refuse with a conflict instead of overwriting your edit.

## What changed
- **Three read tools** for your coach agent: `get_anchors` (anchors per pattern, with days since each was last logged), `get_balance_targets` (your 18 muscle-group targets plus the calc settings, read-only), `get_fau_volume` (raw primary and secondary set counts per muscle group over a window, plus target and days since last trained). Numbers only, no verdicts.
- **Two proposal tools:** `propose_anchor_update` and `propose_target_update`. Nothing changes until you approve in the Workbench. Approve only touches the patterns or muscle groups named; revert puts them back, and refuses if you changed one of them since.
- Targets must be 0–2 in 0.05 steps; off-step values are refused, not rounded. Calc settings (lookback, secondary weight, ...) can't be proposed.

## Evidence
- 168 tests for this slice, all 15 scenarios plus edge cases; all 564 agent-tools tests pass (I re-ran them). Type check clean.
- The tests were proven able to fail: 59 of 60 deliberately broken versions were caught.
- Live check on the preview: the MCP calls above created the proposals; a proposal trying to change `lookbackDays` was refused by name.

## Reviewer's verdict
**Ship with fixes**, one real defect, now fixed: approving an anchor change when you had no training profile created one with empty targets, so balance numbers would quietly ignore your Settings. You chose to copy the Settings targets in; done and tested against the app's own profile setup.

Checked and fine: everything is scoped to your own data, reads change nothing, agent text shows as plain text, query counts are small.

## Choices made where the spec was silent
- Approved target values are stored exactly (0.35, not 0.35000000000000003). The Settings save rounds with float noise; that's left as is.
- An anchor that points to a deleted exercise is left out of `get_anchors`.
- Undoing an anchor change leaves a profile it created in place.

## Not verified
- The admin page has no automated tests; this phone check is its first real look.
- Volume over a 365-day window loads every set in memory. Fine at your volume; same note as the export.
