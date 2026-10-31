---
id: 052
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (picked mockup A)
updated: 2026-10-31
---
# Build: TL6 Training folder tabs (mockup A)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/training-folder-tabs`, stacked on TL5a (#1010). Don't commit.

## Goal
Restyle the Training home to match mockup A, which is your own `docs/mockups/050/mockup-a.*`. Read the TL6 section of `initiatives/training-library/docs/spec.md`.

The test-builder is updating the locked view tests in parallel to the spec's new strings. Build to the spec, and expect the view tests to settle once its packet lands.

## Do
1. **Cleanup first.** Clean up the TL5a preview seed on the wt2 DB:
   - proposals `cmvwvkcoy0002vr23g4e0vcrx` and `cmvwvkdjq0004vr236n93ktwz`, and token `cmvwvkcos0000vr23swamdmf0`;
   - plus anything Dustin's accepts created from them (a saved workout, a program and any activation; check whether the active program changed, and restore "Agent Strength Block" if it did).
2. **Build `SectionTab`** and restyle `TrainingHome` per the spec, with no behaviour changes. Reuse the existing tokens and classes. Keep it calm, like the mockup.
3. **Self-check visually:**
   - Take phone-width screenshots at 390px, full page: Training with 3 suggestions, with 1, and with none; plus the empty home.
   - Use Chrome if it's connected, otherwise Playwright.
   - Put them side by side with `mockup-a.png` in `initiatives/training-library/docs/assets/052/`.
   - Seed safely, with the notification URLs blank, and clean up.
4. **Run the check:** all training-library, suggestions, nav and pinned tests; the full suite; tsc; biome.

## Done when
- It matches the mockup.
- All tests are green once the test-builder's updates are in.
- The screenshots exist.
- The seed is cleaned up.

## Don't touch
- The test files.
- `work/`, `STATE.md`, status files.
- No schema change.

## Hand back
The `handoff-implementer` packet. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to implementer (wF:p2).
- 2026-10-31 MDT: handback saved; the side-by-side matches the mockup closely. Review 053 dispatched.
- 2026-10-31 MDT: review 053 fixes sent: shadow fallback, aria-labels, clamp-2, short row label for targets.
- 2026-10-31 MDT: retry in; tests updated by the test-builder. Lead re-ran: full suite green, tsc clean. Preview up; waiting on Dustin.
- 2026-10-31 MDT: three blocks plus the 055 fixes are in (inset focus ring, tablist label, hasContent). Lead re-ran the full suite: green. Preview restarted; waiting on Dustin's final look.
- 2026-10-31 MDT: Dustin: "Perfect!" Accepted.
