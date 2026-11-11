# Ripit iOS roadmap

A native iPhone version of Ripit. Data lives on the phone; the web app stays as it is.
Updated by the lead at each checkpoint. The full log is in `status.md`.

**Now:** slice 9a on your phone for review (Hub `ios-slice9a-nav`). 9b (one-exercise logger): tests done; build (204, ios-impl), with the bar look B. After 9b I pause until you've reviewed 8, 9a and 9b.

## Done (first sweep, 2026-11-07)

| # | Slice | State |
|---|---|---|
| 1 | Skeleton: log a workout, 312 exercises and photos built in | ✅ on your phone |
| 2 | Import from the web's "Download my data" | ✅ (web export not in prod yet) |
| 3 | Programs: build, edit, Up Next, restart, archive | ✅ |
| 4 | Progress: weekly report, records, pinned lifts, lift page | ✅ |
| – | Parity inventory against the web (`parity-inventory.md`) | ✅ |

## Next (order you approved: 5 → 6 → 7; slices 9–11 added by Dustin 2026-11-08)

| # | Slice | Size | State | Items |
|---|---|---|---|---|
| 5 | **Logging help:** rest timer, workout clock, "Last time" line, RPE/RIR, warm-up sets, Info / Notes / History per exercise, confirm before Finish | M | ✅ approved, on phone | 174–178 |
| 6 | **Finish summary + saved workouts:** summary at the end, save to repeat, Library › Workouts, Pinned/Repeat on Training | M | ✅ approved, on phone | 179–183 |
| 7 | **Settings + look:** Settings tab, all 13 web themes, E-ink display, workout defaults; web font, square corners, offset shadows, switching folder tabs; largest text everywhere | L | ✅ approved, on phone | 184–188 |
| 8 | **Picker + custom exercises:** filters, pick several, create your own | S–M | 🟡 on your phone, your review (Hub: ios-slice8-picker) | 189–191, fixes 193–195 |
| 9a | **Bottom bar + quick actions:** the web's bar Training · Library · ⊕ Workout · Progress · Settings; Quick Actions (continue program, freestyle, saved; resume or discard an open one); History under Training › Recent; Programs under Library | M | 🟡 on your phone, your review (Hub: ios-slice9a-nav) | 198–200, fixes 201–202 |
| 9b | **One-exercise logger:** one exercise per screen, swipe, fixed ‹ Log set › bar, the web's keypads, Plan list (jump, reorder today only, swap, delete, add), supersets in order with a badge, light haptic on Log set | L | 🔨 build (204) | 203 tests · 204 build · 205 review |
| 10 | **Smart picker:** A–Z / Neglected ("+N planned") / Recovery / Anchors sorts in the workout's Add picker; Settings › Target movements; import muscle-balance targets | M | ⏳ | |
| 11 | **Muscle balance settings:** 18 ratios, secondary credit, ignore warm-ups, live preview, reset | M | ⏳ | |
| 12 | **Export from iOS + agent round trip:** phone writes the v1 JSON, plus CSV for a chosen date range (free for everyone); imports proposals to approve | M | ⏳ | |
| 13 | **Leftovers:** Top set/Volume tabs, "Week N of program", skip day, complete week | S | ⏳ | |

Ideas (not a plan): public release, and two tiers of AI access. See `ideas.md`. Slice 12 should treat the export format as an open spec.
Later (not planned): E-ink display parity beyond the basic theme (Dustin, 2026-11-08).
Not planned (Dustin, 2026-11-08): Recovery's heavy/comeback terms (need a server job); the Equipment checklist (no phone consumer). Target movements stay phone-only until the export carries them.
Later:; bundled curated programs; cardio; follow-along mode.
Left out for now: coaching, community publishing, accounts, admin.

## Backlog found along the way

- Web: half-step RPE presets (6.5, 7.5…) don't fit the `Int` RPE column; the ad-hoc logger truncates them (found in 174).
- Web: `/library?type=programs&tab=browse` may open My Programs instead of Browse (173, unverified).

- Web: Start Workout silently does nothing while a freestyle draft is open; only Quick actions explains why (176).
- Seed data: Barbell Bench Press has decline-bench instructions (`cmiz7vjju0000vr0m4b1o6bec`), shown in both apps (176).
- iOS: effort can't be changed when editing a logged set; Last time lacks the relative date and per-set "last:" hints (176, after slice 7).
- iOS and web: a planned weight ("275lbs") isn't prefilled, so a set logged untouched saves as bodyweight on iOS (176; the web prefills 0 the same way).

- iOS: program screen title breaks mid-word and the superset badge clips at the largest text size (178); fold into slice 7. Also the logger header's ⓘ and ··· touch at that size (182).
- Web and iOS: the workout summary adds kg volume as if it were lbs, and bodyweight "vs last" compares today's total reps with last time's top set. Kept for parity in slice 6; fix both apps together (179).
- Web: "Start a freestyle workout" fails with a generic error while a freestyle draft is open, and Training shows no way back to the draft (181; related to 176's note).
- iOS: Library rows show dates ("Nov 7"), where the web says "Today" (181).
- iOS E-INK: charts and tints still drawn in color; the web draws them solid (188; out of scope per Dustin's E-ink call).
- Web: Settings › Muscle balance "Completed workouts" field has no effect; the window is a fixed 14 days (192). Phone fixes it at 14.
- Web: equipment filter is single-choice; slice 8 spec corrected to match (192).

## Waiting on Dustin



- PRs into `dev` are open: #1054 (web export; merge first so your real history can be imported) and #1055 (iOS, slices 1–7). Review and merge when ready. Later iOS commits are pushed only when you ask.
- Run `initiatives/ios-app/handoff/cleanup.sh` when convenient.

Legend: ✅ done · 🔨 building · 🔍 in review · 📝 spec ready · ⏳ not started
