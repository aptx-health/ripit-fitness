---
id: 160
state: accepted
waiting_on:
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal; lead runs the loops)
updated: 2026-11-07
---
# iOS slice 2: import a ripit-export file

## Goal
The phone imports the file from the web's "Download my data", so Dustin's history and programs land on the phone.

## Read first
- `features/ios-app/import.feature` (the phone scenarios), `work/158-handback.md` and its Log (the lead's calls on exercise refs, drafts and the active program).
- The format: `git -C ~/projects/worktrees/ripit-fitness/worktree3 show feature/data-export:docs/RIPIT_EXPORT_FORMAT.md`.

## Do
- Implement `AppDatabase.importExport(data:)` in RipitCore so the locked Import tests pass. Run it in one transaction.
- In the app: an "Import from ripit.fit" action (Settings or the history empty state) using the iOS file picker (`.fileImporter`), a summary afterwards ("12 programs, 340 workouts..."), and a plain error message for refused files.
- Custom exercises in the file resolve like refs: by id, then a catalog normalizedName match (map to the catalog row and rewrite references), then their own row. This avoids the UNIQUE normalizedName clash (lead call).
- Imported program-linked completions must show in history with their workout name, even though program screens come in slice 3.

## Done when
- `mise run ios-check` passes, with every test unchanged.
- Simulator screenshots: the import action, the summary after importing the fixture, the history after import, and a refused file.

## Decide alone
- Where the action lives, and the wording.

## Don't touch
- Locked tests, `work/`, `STATE.md`, `initiatives/`. Commit only your own paths: other agents work on this branch.

## Hand back
The `handoff-implementer` packet, first line `Report: ...`, sent to wX:p1. Don't run rm: list cleanup.

## Log
- 2026-11-07 CST: created (waiting on 158's amendment).
- 2026-11-07 12:20 MST: dispatched to ios-impl (running)
- 2026-11-07 CST: back 4d3a414c; lead re-ran: Import + slice 1 pass, the only failures are the expected Program suites. ios-check stays red until 161 merges (accepted). To review (162). Asked programs-impl to merge it into feature/ios-programs.
- 2026-11-07 CST: 164 re-check says accept; lead accepts slice 2 under 4h autonomy (should-fix follows in 167).
