# Slice 3 review: training insight tools

**What you need to do:** accept the slice (or not), and answer 3 small questions. Nothing here is a blocker.

## What changed
Agents get two new read-only tools. They return **raw numbers only**: no verdicts, flags or thresholds. The agent decides what counts as a stall or a hard week.

- **`get_stall_signals`**: for each exercise, its recent sessions (6 by default). For each it returns the best set's estimated 1-rep max (e1RM), the change % from the first 2 to the last 2 sessions, how many sessions since the best, the rep range, and the full series. The biggest drops are listed first.
- **`get_effort_summary`**: the last 4 weeks, newest first. For each week: sessions, working sets, how many sets have RPE/RIR logged (coverage %), average effort, the count at each RPE, the % at 9+ and at 10, and exercises whose top set hit 10. RIR counts as effort (RIR 0 = 10).

No database changes, no UI. The e1RM, kg→lbs and RPE/RIR rules are the app's existing helpers, so the numbers match the history view.

## Evidence
- All 10 scenarios in `features/agent-tools/training-insights.feature` pass, checked against exact hand-worked numbers. 74 tests are new. **Full suite: 1,165 pass**, and the type check is clean. The lead re-ran both.
- The test-builder broke a scratch version 32 ways (warmups counted, kg not converted, wrong sort, off-by-one…), and each break was caught.
- Each tool reads the database once, whatever the number of exercises.
- I ran both tools against the local synthetic "bodybuilder" user. A trimmed sample of what an agent sees:

```
Overhead Press: 6 sessions over 31 days, e1RM 153.8 → 155.3 lbs (+1%), best 157.2 one session ago, reps 10–11
Latest week: 5 sessions, 112 working sets, 100% rated, avg effort 7.5, RPE 7: 61, RPE 8: 51, 0% at 9+
```

## Reviewer's verdict: ship
The first pass was independent (it hadn't seen the implementer's notes). It found no blocking defects. Low risks:
1. The stall tool loads up to a year of working sets to keep the last 12 per exercise. That's fine at today's volume (~6.5k rows/year) and grows slowly.
2. A failed set logged with 0 reps counts toward effort but not toward stall (no e1RM from 0 reps). Spec wording only.
3. Two tiny test and rounding nits.

## Not verified
- Your real prod history (the local data is synthetic), and speed on a long history.
- A call over the live `/api/mcp` HTTP route. That happens on staging after merge, or in a Hermes trial.

## Your questions (recommended answer first)
1. **Bodyweight sets.** Pull-ups and dips are logged at 0 weight, so today they **don't count in the effort summary at all**. A bodyweight-heavy week looks easy.
   - **A (recommended):** count every non-warmup set for effort, whatever the weight. Stall still needs weight.
   - B: keep as is.
   - C: keep, but add a separate bodyweight-set count.
2. **Abandoned workouts.** They count today. One cut short can drag a stall average down.
   - **A (recommended):** keep. The agent sees the per-session series and can spot an outlier.
   - B: stall uses completed workouts only.
3. **Year-long stall query.**
   - **A (recommended):** accept for now; revisit if it gets slow.
   - B: lower the max window.

## To accept
Reply "accept" (plus answers to 1–3). If you pick 1A, it's a small follow-up through test → build → re-review before the PR.
