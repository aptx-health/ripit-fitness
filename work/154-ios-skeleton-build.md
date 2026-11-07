---
id: 154
state: waiting
waiting_on: 153
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 1 plan, this worktree, bundle id fit.ripit.ios)
updated: 2026-11-07
---
# iOS slice 1: build the skeleton app and ad-hoc logging

## Goal
A native SwiftUI Ripit on Dustin's iPhone that logs an ad-hoc workout into a local SQLite database, with the exercise catalog and photos bundled. It is the base for history import (slice 2).

## Read first
- `initiatives/ios-app/scoping.md`, `features/ios-app/skeleton.feature`, `work/153-handback.md`.
- `~/projects/offscreen/ios/project.yml`, `mise.toml`, `initiatives/iphone-app/iphone-check.md` (in Offscreen): build, signing, install.
- `docs/STYLING.md`, `lib/theme.ts`: the ripit default theme colours and folder-block style to echo.

## Do
- `ios/RipitCore`: GRDB schema and migrations for the core model (all of Program > Week > Workout > Exercise > PrescribedSet / LoggedSet, WorkoutCompletion, SavedWorkout, ExerciseDefinition with user-created rows), even though slice 1 only uses the ad-hoc parts, so slice 2 can import into it.
- `ios/App`: SwiftUI screens: history, start/resume workout, exercise search with photos, set logging, finish/discard. Ripit default theme colours, 48pt touch targets.
- `ios/project.yml` (XcodeGen): bundle id `fit.ripit.ios` (fallback `io.dustin.ripit`), free Personal Team `3W38M2V9FB`, automatic signing, iOS 18.
- `scripts/ios/build-catalog.ts` (or similar): builds the bundled catalog from `prisma/seeds/exercise-definitions.json` and downloads the free-exercise-db images using `scripts/exercise-mapping.json`. Confirm the free-exercise-db license first and record it in `ios/README.md`. Commit the generated catalog and images if under ~60 MB; otherwise say so.
- Extend `ios-check` with xcodegen + simulator build. Add `scripts/ios/install.sh` for a device install (`xcodebuild -allowProvisioningUpdates` + `xcrun devicectl`). Do not run it unattended.
- Bundle id `fit.ripit.ios` confirmed by Dustin.
- Use your own simulator (not a shared one).

## Done when
- `mise run ios-check` passes with 153's tests unchanged.
- Simulator screenshots of each screen at iPhone size in the handback.
- Install steps for Dustin are written in `ios/README.md`.

## Decide alone
- SwiftUI structure, navigation, small visual details within the ripit theme.

## Escalate to Dustin when
- The image license does not allow bundling, or the catalog is far over 60 MB.

## Don't touch
- 153's tests, the web app, `work/`, `STATE.md`, `initiatives/`.

## Hand back
The `handoff-implementer` packet, with first line `Report: complete | needs decision | further handoff`.

## Log
- 2026-11-07 CST: created (waiting on 153).
