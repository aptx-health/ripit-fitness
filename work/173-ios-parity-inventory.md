---
id: 173
state: review
waiting_on:
executor: parity-disco
skill: discovery
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (one discovery agent, as written)
updated: 2026-11-07
---
# iOS vs web: parity inventory

## Goal
Dustin has the iOS app on his phone and finds it basic next to the web app. List every feature the web app has, mark where the iOS app stands on each one, and propose the next slices so we close the biggest gaps first. Nothing gets built in this item.

## Read first
- `initiatives/ios-app/scoping.md`: the first scoping note and the original slice list.
- `initiatives/ios-app/handoff/handoff.md`: what the first sweep built, and what it deferred.
- `features/ios-app/*.feature`: what the iOS app is specified to do now.
- Web: `app/` routes, `components/`, `lib/`. iOS: `ios/App/`, `ios/RipitCore/Sources/RipitCore/`.

## Do
1. **Web inventory, from the code:** every user-facing screen and feature (routes, settings, themes, cardio, saved workouts, library/Learn, the training home, progress, balance/FAU, community, coaching, MCP/agents, onboarding...). You may split the code reading across Sonnet subagents.
2. **Use both apps side by side at phone width (about 390 px).**
   - Web: run it locally in this worktree with `DOPPLER_PROJECT=fitcsv DOPPLER_CONFIG=dev_personal ./scripts/dev.sh start -l postgres,app` (first-run steps are in `AGENTS.md`) and log in as dmays@test.com / password. Or use https://staging.ripit.fit for reading only. Drive it with Chrome (claude-in-chrome; resize the window to phone width) or Playwright (`webapp-testing`).
   - iOS: build and run it in your **own** simulator (create a new one; don't reuse another agent's). Import `docs/fixtures/ripit-export-v1.json` (it's in worktree3, `~/projects/worktrees/ripit-fitness/worktree3/docs/fixtures/`) so the screens have data.
   - Screenshot matching screens of both apps (training home, workout logging, exercise picker, program, progress, settings, plus anything that exists only on the web). Save them in `initiatives/ios-app/handoff/parity-assets/` (git-ignored) with names like `web-training.png` / `ios-training.png`.
3. **Write `initiatives/ios-app/parity-inventory.md`:**
   - A table by area: feature | web | iOS (have / partial / missing / not planned) | size (S/M/L) | notes. For "partial", say what's missing.
   - Look and feel: how the iOS screens differ from the web's (theme, density, folder blocks, touch targets), using the screenshots.
   - Things that can't work on a local-only phone (coaching, community, MCP), and the options for each, for example an export, sync, or leaving it out.
   - A ranked proposal for the next 3–6 slices, each with a sentence on why and the main web files to port from.

## Done when
- `initiatives/ios-app/parity-inventory.md` exists and covers every web route under `app/` (or says why one was skipped).
- There are paired screenshots for at least the 6 core screens above.
- Every row says whether it was observed in the running app or only inferred from the code.

## Decide alone
- How to group areas, and the S/M/L sizes.
- Whether to use local or staging for the web.

## Escalate to Dustin when
- You need a staging login, or the local stack won't start after the `AGENTS.md` steps.

## Don't touch
- No code changes in `ios/`, `app/`, `lib/` or anywhere else. Don't write to `work/`, `STATE.md` or `status.md`.
- Staging: read only, and log nothing.
- Don't install on Dustin's phone.
- Don't `rm` anything. List temp files, simulators and any dev stack you started under "Cleanup for Dustin" in your packet. Stop the dev stack you started (`./scripts/dev.sh quit`) when you're done.

## Hand back
The discovery packet with first line `Report: complete | needs decision | further handoff`, the path to the inventory, the top 3 gaps in one line each, and Cleanup for Dustin.

## Log
- 2026-11-07: created (ready). Dustin asked for the inventory with a phone-width comparison to the web.
- 2026-11-07 18:04 MST: dispatched to parity-disco (running)
- 2026-11-07: 173 handed back; on Hub for Dustin.
