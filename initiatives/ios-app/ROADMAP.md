# Ripit iOS roadmap

A native iPhone version of Ripit. Data lives on the phone; the web app stays as it is.
Updated by the lead at each checkpoint. The full log is in `status.md`.

**Now:** slice 5, logging help — tests done (178, 46 waiting on the build). 175 build running (ios-impl). Then 176 review (parity-disco).

## Done (first sweep, 2026-11-07)

| # | Slice | State |
|---|---|---|
| 1 | Skeleton: log a workout, 312 exercises and photos built in | ✅ on your phone |
| 2 | Import from the web's "Download my data" | ✅ (web export not in prod yet) |
| 3 | Programs: build, edit, Up Next, restart, archive | ✅ |
| 4 | Progress: weekly report, records, pinned lifts, lift page | ✅ |
| – | Parity inventory against the web (`parity-inventory.md`) | ✅ |

## Next (order you approved: 5 → 6 → 7)

| # | Slice | Size | State | Items |
|---|---|---|---|---|
| 5 | **Logging help:** rest timer, workout clock, "Last time" line, RPE/RIR, warm-up sets, Info / Notes / History per exercise, confirm before Finish | M | 🔨 building (175) | 174 tests · 175 build · 176 review |
| 6 | **Finish summary + saved workouts:** summary at the end, save to repeat, Library › Workouts, Pinned/Repeat on Training | M | ⏳ | |
| 7 | **Settings + look:** Settings tab, themes (incl. e-ink), effort defaults, web font/corners/folder tabs | M | ⏳ | |
| 8 | **Picker + custom exercises:** filters, pick several, create your own | S–M | ⏳ | |
| 9 | **Export from iOS + agent round trip:** phone writes the v1 JSON; imports proposals to approve | M | ⏳ | |
| 10 | **Leftovers:** Top set/Volume tabs, "Week N of program", skip day, complete week | S | ⏳ | |

Later: balance/FAU, target movements, equipment; bundled curated programs; cardio; follow-along mode.
Left out for now: coaching, community publishing, accounts, admin.

## Backlog found along the way

- Web: half-step RPE presets (6.5, 7.5…) don't fit the `Int` RPE column; the ad-hoc logger truncates them (found in 174).
- Web: `/library?type=programs&tab=browse` may open My Programs instead of Browse (173, unverified).

## Waiting on Dustin

- Open PRs into `dev` for `feature/ios-skeleton` and `feature/data-export`? (The web export must reach prod before you can import your real history.)
- Run `initiatives/ios-app/handoff/cleanup.sh` when convenient.

Legend: ✅ done · 🔨 building · 🔍 in review · 📝 spec ready · ⏳ not started
