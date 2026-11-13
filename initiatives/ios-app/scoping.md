# iOS app — scoping note (2026-11-07)

Goal: a native iOS Ripit that keeps its data on the phone, built and released on its own stream. The web app stays as it is.

## Observed

**Offscreen (template), ~/projects/offscreen**
- Native SwiftUI, no third-party packages. `ios/OffscreenCore/` is a Swift package holding the pure logic, tested headless with `swift test` (112 tests). `ios/App/` is a thin SwiftUI layer.
- XcodeGen (`ios/project.yml`) generates the Xcode project, which is git-ignored. Signing is automatic on the free Personal Team (`3W38M2V9FB`).
- `mise run ios-check` runs the core tests, xcodegen and a simulator build. Device install is `xcodebuild -allowProvisioningUpdates` then `xcrun devicectl device install app`. That command is only recorded in handbacks, not in a script.
- No database: JSON files in Application Support. No auth, no bundled assets, one-way download sync.
- Lessons: give each parallel agent its own simulator, since a shared one gets its data wiped. Don't install to the phone unattended (it can ask for the Mac password). The free account allows 3 apps per device and has no push, iCloud or App Groups.

**Ripit**
- 33 Prisma models. The per-user core is Program > Week > Workout > Exercise > PrescribedSet / LoggedSet, plus WorkoutCompletion (ad-hoc), SavedWorkout, cardio, settings, pins, balance targets and the training profile. This is relational and maps cleanly to SQLite.
- Catalog: 312 system ExerciseDefinitions (`prisma/seeds/exercise-definitions.json`). About 600 images, 2 per exercise (start/finish, cross-faded), are served from `cdn.ripit.fit` (MinIO). Their source is free-exercise-db on GitHub (`scripts/sync-exercise-images.ts`, `scripts/exercise-mapping.json`). 15 exercises have no image.
- Logic to port is about 6–7k lines: insights/progress, stats, program mechanics (`lib/db`), workout logging and prefill, muscle balance and FAU, training home, transformations.
- Server-only: BetterAuth, coaching (user to user), community publish/clone worker, the MCP server and proposals (Postgres/Prisma bound), the LLM suggest pipeline, admin CMS, Learn management, Sentry, rate limiting, analytics.
- MCP: `app/api/mcp/route.ts` has 17 read tools and 7 propose tools. Approve/revert is a web flow. It cannot see data that lives only on a phone.
- Design: semantic theme tokens and 13 themes (ripit default, e-ink, ...), folder-block UI, 48px touch targets.

## Inferred
- Offscreen's split (a logic package plus a thin app, XcodeGen, mise check) carries over directly. Its storage does not: Ripit needs a real database with migrations. GRDB (SQLite, explicit migrations, testable headless inside the core package) fits better than SwiftData.
- Bundling the catalog plus images is likely tens of MB, which is fine for an app.
- The BullMQ jobs (aggregates, cloning) become plain local code.
- MCP has two real paths: (a) the phone syncs to the server, so the existing MCP and approve flow keep working, but this needs auth and conflict handling; or (b) agents work from an export the phone produces, with proposals imported back. (b) fits "raw exports over server analysis".

## Unknown
- The free-exercise-db license (believed Unlicense / public domain). Check before bundling.
- Whether Dustin wants his existing ripit.fit history on the phone.
- Image file sizes: measure when the catalog is pulled.

## Decision needed
See the Needs Dustin batch in status.md.

## Proposed slices
1. Skeleton: `ios/` with XcodeGen, `RipitCore` package (GRDB schema + migrations), bundled catalog + images, `mise run ios-check`, an install script. Log an ad-hoc workout and see it in history.
2. Programs: build/edit, the active program, the week and next workout, logging prescribed vs logged sets, supersets.
3. Progress: records, per-lift page, pins, balance/FAU.
4. Data in/out: import from the ripit.fit export, plus a raw export for agents.
5. Later: themes, saved workouts library, cardio, the MCP path, curated community programs bundled as JSON.
