# Training + Library redesign: decisions

Source: design agent handoff, kept verbatim in [design-handoff.md](design-handoff.md). Dustin answered these on 2026-10-31. Where they differ from the handoff, these win.

**Scope**
- "MCT" in the handoff is a typo for MCP. Suggestions are pending proposals made by agents through the MCP server.
- Browse Workouts is deferred to its own roadmap item; no community workout catalog exists. The Workouts tab ships with My Workouts only.
- "+ Create New Workout" is deferred; there is no workout builder today. The Workouts tab has no create action for now. Programs keep "+ Create New Program".

**Coach Suggestions**
- Any user sees them, not only editors. Kinds shown: `saved_workout.create`/`.update`, `program.create`, `anchors.update`, `balance_targets.update`. Exercise-library kinds (`exercise_definition.*`) stay admin-only.
- User-facing word is "Suggestions", not "Proposals".
- Accept or reject only. No user undo; revert stays in admin.
- Accepting a program asks "Make it active?" (Make active / Not now). It lands in My Programs either way.
- Rejected suggestions leave Training; proposal history stays.

**Training**
- Repeat on a recent workout starts a new freeform (ad-hoc) workout with the same exercises, using last time as the plan. A repeated program day does not count toward program progress.
- Up Next appears only when there is a real next workout (in practice, an active program).

**Pinning**
- Only My Workouts items can be pinned, no limit. Training shows newest-pinned first, up to 5, with "See all" into My Workouts.

**Shipping and process**
- One PR into dev per roadmap item. Release to prod once Program Detail, Training and Library are all in dev; Pinned and Suggestions can ride along or follow.
- No work-item sign-off forms. Dustin reviews each UI item on a phone preview before its PR goes to dev.
- Priority: above the FAU-targets item.

**After discovery 034 (2026-10-31)**
- Dustin: a non-active program's detail is view-only, with a "Make active to train" button. Logging, Up Next, progress and Complete Week stay tied to the one active program.
- Dustin: TL5 includes a user screen in Settings to create and revoke their own agent tokens. Notifications (Discord, Bark) go out only for proposals owned by an admin; other users' content never reaches Dustin's channels.
- Dustin: accepted program suggestions don't count toward the 3-program cap (a suggestion can take a user past it).
- Lead: Library URL is `/library`, Program Detail is `/library/programs/[id]`; `/programs`, `/programs/[id]` and `/workouts/saved` redirect (keeping `tab`, `cloning` and similar params).
- Lead: a skipped workout counts as done everywhere (Up Next skips it, as the current week does). Progress reads "N of M workouts done".
- Lead: Repeat carries exercises, sets, reps, RIR and RPE from the logged sets, not weight (PrescribedSet has no weight).
- Lead: anchors and balance-target suggestions show FAU display names, never keys.
- Dustin (TL1 preview): the final review of each UI item includes phone-width screenshots taken with Claude in Chrome (Playwright only if Chrome is unavailable), checked against the rest of the app's styling. Seen in TL1, fixed in TL2: the back link's styling doesn't match the app, and the nav doesn't highlight on the program detail page.
- Dustin (2026-10-31): no 'Start a workout' on Training for new users; the center Workout button is enough.
