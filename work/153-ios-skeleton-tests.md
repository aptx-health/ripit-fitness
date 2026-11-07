---
id: 153
state: running
waiting_on:
executor: ios-tests
skill: handoff-test-builder
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 1 plan, this worktree, bundle id fit.ripit.ios)
updated: 2026-11-07
---
# iOS slice 1: tests and check for the skeleton

## Goal
Failing Swift Testing tests for `features/ios-app/skeleton.feature`, plus one check command, so the implementer (item 154) has a fixed target.

## Read first
- `initiatives/ios-app/scoping.md`: decisions and the Offscreen template.
- `features/ios-app/skeleton.feature`: the acceptance criteria.
- `~/projects/offscreen/ios/` (`project.yml`, `OffscreenCore/Package.swift`, `Tests/`) and `~/projects/offscreen/mise.toml`: the layout to copy.
- `prisma/schema.prisma`: the core models (Program > Week > Workout > Exercise > PrescribedSet / LoggedSet, WorkoutCompletion, SavedWorkout, ExerciseDefinition) that the local schema mirrors.
- `prisma/seeds/exercise-definitions.json`, `scripts/exercise-mapping.json`: catalog and image mapping.

## Do
- Set up `ios/RipitCore/` (Swift package, swift-tools 6.0, iOS 18 / macOS 15, GRDB dependency) with the test target only, plus the public API surface the tests need (protocols/types, no logic).
- Test the logic-level scenarios headless: migrations, catalog load and search, ad-hoc logging, free-text weight, resume and discard, supersets. Test names follow the scenario names.
- UI-only parts (photo display, placeholder) get a UITest stub or a manual-check line in the handback.
- Add `mise.toml` at the repo root with `ios-check` (`swift test` on RipitCore; xcodegen + simulator build is added by 154).
- Prove the tests can pass against a throwaway fake and fail without it (`break-matrix` if useful), then mark them read-only for 154.

## Done when
- `mise run ios-check` runs and the new tests fail for lack of an implementation, not harness errors.
- Every logic scenario maps to at least one test; the handback lists the mapping.

## Decide alone
- Swift type and module names, test file layout, GRDB version (latest stable).

## Escalate to Dustin when
- A scenario looks wrong or untestable as written.

## Don't touch
- The web app (`app/`, `lib/`, `prisma/`), `work/`, `STATE.md`, `initiatives/`.

## Hand back
The `handoff-test-builder` packet, with first line `Report: complete | needs decision | further handoff`.

## Log
- 2026-11-07 CST: created (ready).
- 2026-11-07 11:37 MST: dispatched to ios-tests (running)
- 2026-11-07 CST: handback e039c913, check re-run (30 red on stub). Dustin decided logged weight mirrors web: Float weight + weightUnit (default lbs); prescribed weight stays free text. Spec scenario updated; sent back to ios-tests to amend the weight tests.
- 2026-11-07 CST: amended 86be3729; lead re-ran check (32 red on stub, tests locked). State review; locked for 154.
