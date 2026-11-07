# Ripit for iPhone

A native SwiftUI Ripit that keeps its data on the phone in SQLite. No account, no network.
Slice 1 (work items 153 and 154): log an ad-hoc workout, see it in history, with the exercise catalog and photos bundled.

## Layout

- `RipitCore/`: Swift package with the logic, tested headless on the Mac. GRDB (SQLite) schema and migrations in `Schema.swift`, the API in `API.swift` and `AppDatabase.swift`, the bundled catalog in `Resources/catalog.json`.
- `App/`: the SwiftUI app. `ExerciseImages/` holds the start/finish photos.
- `project.yml`: XcodeGen spec. The generated `Ripit.xcodeproj` is git-ignored; edit `project.yml` instead.

## Check

```bash
mise run ios-check   # RipitCore tests, xcodegen, simulator build
```

## Install on your iPhone

First time (about 10 minutes):

1. Plug the iPhone into the Mac, unlock it, and tap **Trust** if asked.
2. On the phone, turn on **Settings → Privacy & Security → Developer Mode** (it restarts the phone) if it isn't on already.
3. Run `scripts/ios/install.sh`. It builds with your free Personal Team (`3W38M2V9FB`) and installs with `devicectl`. macOS may ask for your password once.
4. If the phone says *Untrusted Developer*: **Settings → General → VPN & Device Management →** your Apple ID → **Trust**. Open Ripit again.

If the install fails because the bundle id `fit.ripit.ios` is unavailable, change `PRODUCT_BUNDLE_IDENTIFIER` in `project.yml` to `io.dustin.ripit` and run the script again.
If the script can't find the phone, open `ios/Ripit.xcodeproj` in Xcode, pick your iPhone as the destination and press **Run**.

Every 7 days: free signing expires. Plug in and run `scripts/ios/install.sh` again. Your data stays.
The free account allows 3 apps per device (Offscreen counts as one).

## Exercise catalog and photos

`node scripts/ios/build-catalog.ts` rebuilds `RipitCore/Sources/RipitCore/Resources/catalog.json` from `prisma/seeds/exercise-definitions.json` (312 system exercises) and downloads any missing photos into `App/ExerciseImages/` using `scripts/exercise-mapping.json`. 297 exercises have 2 photos each (594 files, about 36.5 MB); 15 have none and show a placeholder. Pass `--skip-images` to rebuild only the JSON.

Photos come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) by yuhonas, released under [The Unlicense](https://unlicense.org/) (public domain), which allows bundling them in the app. Checked 2026-11-07 via the repo's `LICENSE.md` (GitHub reports SPDX `Unlicense`).

## Debug launch arguments

Debug builds accept launch arguments for simulator screenshots (see `App/DebugHooks.swift`), for example:

```bash
xcrun simctl launch <sim> fit.ripit.ios -resetState YES -demoHistory YES -demoWorkout YES
```
