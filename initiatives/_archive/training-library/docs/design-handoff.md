# Training + Library Redesign (design agent handoff, 2026-10-31)

Verbatim from the design agent, pasted by Dustin. Dustin's answers in [decisions.md](decisions.md) override this where they differ (no Browse Workouts or Create New Workout yet; "MCT" means MCP).

---

We want to restructure the app so it is no longer primarily organized around programs.

The current **Training** tab is heavily program-centric, and the current **Programs** tab is a separate destination for saved and community programs. We now also have saved workouts, and MCT can generate workout/program suggestions that require user review.

The new structure should make Training the user's day-to-day home, and replace Programs with a broader Library that contains both workouts and programs.

The bottom navigation should become:

**Training · Library · Workout · Learn · Settings**

The existing center Workout button remains the quick-action entry point for starting a workout.

---

# Training

Training should become the main home/dashboard for the user's current training activity.

Its purpose is essentially:

**"What should I do next?"**

It should not assume the user is currently following a program.

The page should be vertically scrollable and composed of sections that appear only when relevant.

## Coach Suggestions

Pending MCT proposals should move out of the admin-oriented workflow and become highly visible here.

User-facing language should use **Suggestions**, not **Proposals**.

MCT currently generates programs and saved workouts that require review and can be accepted or rejected. Training should surface these pending suggestions near the top of the page.

A suggestion should provide enough information to understand what it is, then allow the user to open a review/details screen.

Typical actions:

- Review
- Accept
- Reject

Accepted workout suggestions should become normal items in **Library → My Workouts**.

Accepted program suggestions should become normal items in **Library → My Programs**.

If appropriate, accepting a program can separately offer the ability to make it the active program.

Rejected suggestions disappear from the Training dashboard, while any internal proposal/audit history can continue to exist behind the scenes.

If multiple suggestions are pending, avoid filling the Training page with many large cards. Show the newest or most relevant suggestion prominently and provide a way to view all pending suggestions.

Example:

**COACH SUGGESTIONS · 2**

New 3-Day Strength Program  
Short Full-Body Workout

**View Suggestions**

This section should only appear when pending suggestions exist.

---

## Up Next

Up Next is optional.

It should appear when the app has a meaningful next workout to recommend, most commonly because the user is actively progressing through a program.

Example:

**UP NEXT**

Machine Starter  
Week 2 · Day 1  
5 exercises

**Start Workout**

If the user is not following a program and there is no obvious next workout, this section can simply be absent.

We do not need to manufacture a recommendation just to keep the section visible.

---

## Pinned Workouts

Users should be able to pin workouts they want readily available from Training.

Pinned workouts are intended to support informal routines that do not require building a full program.

Example:

**PINNED WORKOUTS**

Upper Body  
6 exercises  
Start

Quick Machines  
5 exercises  
Start

Mobility  
4 exercises  
Start

There should be a lightweight way to reach the full workout collection from this section if needed.

Pinning will likely require a small persistence/database addition if that concept does not already exist.

---

## Recent Workouts

Training should show a small number of recently completed workouts.

This section is primarily about making it easy to repeat something rather than acting as the full workout-history interface.

Example:

**RECENT WORKOUTS**

Full Body Machines  
Oct 28 · 31 min  
**Repeat**

Upper Body  
Oct 25 · 27 min  
**Repeat**

Keep this list relatively short.

Full historical data can remain available elsewhere.

---

## Current Program

If the user has an active program, show a compact summary toward the bottom of Training.

Example:

**CURRENT PROGRAM**

Machine Starter  
Week 2 of 5  
3 of 10 workouts complete

[progress indicator]

**View Program**

The current program should not dominate the Training screen anymore.

Selecting it should open the existing detailed program experience.

The current Training UI — week navigation, week overview, workout days, Complete Week, recent history, etc. — should effectively become the **Program Detail** screen.

This allows us to preserve most of the existing program-specific interface while removing the assumption that every Training user is currently following a program.

---

## Training Section Order

The intended order is:

1. Coach Suggestions
2. Up Next
3. Pinned Workouts
4. Recent Workouts
5. Current Program

Coach Suggestions and Up Next are conditional.

Current Program is also conditional.

The page should naturally collapse around whichever sections are relevant.

The overall principle is that Training should prioritize things that can lead directly to the user starting or choosing their next workout.

---

# Library

The current **Programs** tab should become **Library**.

Library is the place for managing and discovering reusable training content.

Its purpose is essentially:

**"What workouts and programs do I have, and what can I find?"**

Most of the existing Programs interface can be reused.

## Primary content type

At the top of Library, add a primary switch:

**WORKOUTS | PROGRAMS**

This determines what type of content is being viewed.

Within each content type, preserve the existing personal-vs-community distinction.

For workouts:

**MY WORKOUTS | BROWSE**

For programs:

**MY PROGRAMS | BROWSE**

This creates four straightforward states:

- Workouts → My Workouts
- Workouts → Browse
- Programs → My Programs
- Programs → Browse

---

## My Workouts

This contains workouts associated with the user's personal library.

This may include:

- workouts the user created
- community workouts they saved
- MCT-generated workouts they accepted
- copied or modified workouts

Use **My Workouts** rather than **Saved Workouts** because the library can contain content acquired in several different ways.

Items can indicate relevant state such as pinned status.

A pinned workout should still live normally in My Workouts; pinning simply controls whether it is surfaced prominently on Training.

---

## Browse Workouts

This is the community/public workout catalog.

It should follow the same general interaction model as the existing program browsing experience.

A user should be able to inspect a workout and then save/add it to My Workouts or start it.

---

## My Programs

This is essentially the existing My Programs experience.

It contains programs the user:

- created
- saved
- accepted from MCT
- has used or is currently using

The active program should appear as a normal program entry with an **ACTIVE** state/badge.

We should remove the need for the current oversized active-program card at the top of the Programs screen, because the active-program continuation experience now belongs on Training.

Example:

**Machine Starter**  
Week 2 of 5  
**ACTIVE**

The program can still be sorted or visually emphasized if useful, but Library should primarily be about managing the user's collection.

---

## Browse Programs

This is effectively the existing program browse experience.

Users can explore available/community programs and add them to My Programs.

---

## Create Actions

The existing Create New Program action should become contextual.

When viewing Workouts:

**+ Create New Workout**

When viewing Programs:

**+ Create New Program**

This allows most of the existing Programs page layout and interaction model to remain intact.

---

# Center Workout Button

The large center Workout button remains the fastest route to starting exercise.

Conceptually, it should mean:

**"Start something now."**

It is separate from Library.

Library is where the user manages workouts and programs.

Training helps them decide what to do.

The center Workout action starts the actual workout flow.

The existing label can remain **Workout** unless there is a compelling reason to rename it later.

It can continue to expose quick-start choices such as saved workouts, an empty workout, or a current-program workout as appropriate.

---

# Content Lifecycle

The intended relationship between the systems is:

**MCT creates suggestion → Training surfaces suggestion → user reviews → accept/reject**

If accepted:

**Workout suggestion → My Workouts**

or

**Program suggestion → My Programs**

From there, normal user actions determine whether the workout becomes pinned or whether the program becomes active.

Training then surfaces those states:

- pinned workout → Pinned Workouts
- recently completed workout → Recent Workouts
- active program → Up Next / Current Program

Library remains the persistent collection.

Training remains the contextual home.

---

# Overall Product Model

The final mental model should be:

**Training**  
What should I do now?

Includes:

- Coach Suggestions
- Up Next
- Pinned Workouts
- Recent Workouts
- Current Program

**Library**  
What workouts and programs do I have?

Includes:

- My Workouts
- Browse Workouts
- My Programs
- Browse Programs

**Workout**  
Start exercising now.

**Program Detail**  
Manage progress through one specific program.

This should mostly be an information-architecture and UI change using existing workout/program data and flows.

Some small persistence/schema changes may be required for states such as workout pinning or library ownership/saving, but the expectation is that the existing data model already supports most of what is needed.
