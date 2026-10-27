Report: needs decision

Verdict (provisional, until the lead answers)

Meets spec; good to accept once Q1 is settled. All 13 scenarios behave as written. Code fits lib/proposals and lib/mcp. Approve is one transaction, every query is scoped to the token's
user, and agent text is rendered as plain text. Only Q1 could block acceptance.

First pass (unaided, written before reading the handbacks)

Checks run
- npm run test:run -- agent-tools: 4 files, 240 tests, all pass.
- doppler run --project fitcsv --config dev_personal -- npm run type-check: clean.
- npx biome check on the in-scope files: one fixable import-order error in the steps file (see 5).

Scenarios. All 13 meet the feature file and the spec's "Programs" section:
- get_program is scoped by userId and deletedAt: null. Order comes from orderBy at every level, and the test seeds rows in reverse to prove it.
- Propose creates nothing. Unknown exercise, empty workout and RPE 11 each return the right field.
- Approve builds the whole tree inactive, with isUserCreated, strength, ready, targetId and inverse all as specified.
- A deleted exercise gives invalid, leaves no rows and keeps the proposal pending with error set.
- Revert deletes an unused program and refuses with in_use once a workout is completed.

Defects and risks
1. Transaction timeout on large programs (medium). lib/proposals/service.ts:226 runs the approve with Prisma's default 5-second limit. createProgram (lib/proposals/program.ts:103) is one
   - At the spec's maximum (16 × 7 × 15 = 1,680 exercises) that is about 3,500 round trips through PgBouncer.
   - The timeout error (P2028) isn't caught at service.ts:290-301, so Dustin would get a 500. The proposal stays pending with no error recorded.
   - The codebase already allows for this elsewhere: app/api/programs/[programId]/duplicate/route.ts:108-112 uses one transaction per week with a 30-second limit. Not measured.
2. Revert can delete the active program (low; spec allows it). deleteProgram (program.ts:162) only checks for workout completions. If Dustin activates the approved program but hasn't
   trained yet, revert removes it and he is left with no active program.
3. Wrong field for unknown keys (low). issueField (program.ts:63) returns the container's name. An extra key on a set reports prescribedSets, not the extra key, because zod puts the key
   names elsewhere in the issue. Valid shapes are unaffected, and the slice 1 exercise paths still map the same as before.
4. Minor.
   - weight: "" passes validation and is stored as an empty string rather than null (program.ts:15).
   - The admin page looks up exercise names without visibleTo ([id]/page.tsx:27). That's harmless because the page is admin-only and the proposal is the admin's own.
5. Test file.
   - Biome import-order error at program-proposals.steps.ts:12. CI's test.yml doesn't lint, but npm run lint:all will flag it.
   - A duplicated program.count() assertion at about line 627.
   - The tests are otherwise strong: they compare the full stored tree, check row counts and prove nothing is left behind after a failed approve.
   - The P2003 mapping, for an exercise deleted between the check and the create, has no test.

Secure and sound: approve and revert claim the proposal with a conditional updateMany, so a double approve can't apply it twice. Linked feedback is resolved inside the approve
transaction. The outline renders as JSX text with no dangerouslySetInnerHTML. The screenshots at 390px look right and the "Open the created program" link works with the existing
/programs/[id] route.

Questions for the lead

1. Timeout (blocks acceptance):
   - (a) Pass { timeout: 30000 } to the approve transaction. This is the smallest change and matches the duplicate route.
   - (b) Lower the size limits.
   - (c) Accept the risk for now and record it.
2. Revert of an activated but untrained program:
   - (a) Allow it, as the spec says now.
   - (b) Refuse with a new code.
   - (c) Allow it, but warn in the UI.
3. Field for unknown keys:
   - (a) Leave it as it is.
   - (b) Report the key itself.

Not verified

- I didn't run the app; for the UI I relied on the two screenshots.
- I didn't time an approve at maximum size, so the timeout in 1 is reasoned from how Prisma sends nested creates, not observed.
- I didn't check a real Discord send or the HTTP MCP route; the tests call the lib functions directly.

Outside this item (not fixed)

- The duplicate program.count() line and the import order in the steps file can go to the implementer as a one-line fix.

✻ Brewed for 1m 55s · done 8:29 PM

⎿  “Ask lead 3 review questions for 011” → sent to lead-ripit-mcp — another Claude session on this machine

I sent the three questions to lead-ripit-mcp. The message is in its inbox but hasn't been read yet.

- Q1, transaction timeout (blocks acceptance): I recommended giving the approve transaction a 30-second limit, matching the duplicate route.
- Q2, revert of an activated program Dustin hasn't trained on: options are allow it (what the spec says now), refuse it, or allow it with a UI warning.
- Q3, error field for an unknown key: options are leave it reporting the container name, or report the key itself.

Once the lead answers, I'll write the revised review and final verdict.

✻ Cogitated for 13s · done 8:30 PM

› Message from @lead-ripit-mcp: Lead's answers for review 011. The spec doesn't settle any of these, so they're my calls. (ctrl+o to expand)
⎿  “Revised verdict for review 011” → sent to lead-ripit-mcp — another Claude session on this machine

Report: complete

Verdict (revised, after the lead's answers)

Ready to accept after 4 small changes. Nothing else needs to change. All 11 scenarios are proved by tests that check database state. I wrote 13 earlier, which was my mistake.

Changes needed:
1. Longer approve timeout: give the approve transaction a 30-second limit (lib/proposals/service.ts:226), as the duplicate route does.
2. Clean refusal on timeout: catch Prisma's timeout error (P2028) and return a clean refusal. The proposal stays pending with error recorded, instead of Dustin getting a 500. Add a test
   for it.
3. Empty weight: store weight: "" as null (lib/proposals/program.ts:15).
4. Test file tidy-up: fix the import order in program-proposals.steps.ts:12 and remove the duplicate program.count() check at about line 627.

Recorded, not blocking:
- Q2: revert may delete a program Dustin has activated but not trained on. The lead allows it and will point it out on Dustin's Hub page.
- Q3: an unknown key reports its container's name as field. The lead is leaving it.

I've sent this verdict and the scenario-to-test mapping to lead-ripit-mcp. Its inbox received the message, but it hasn't been read yet.

Not verified

- I didn't run the app; I relied on the two screenshots.
- I didn't time an approve at maximum size.
- I didn't check a real Discord send or the HTTP MCP route.
- One race has no test: an exercise deleted between the check and the create (P2003).

✻ Brewed for 15s · done 8:31 PM


---
Re-review (2026-10-26 20:39 MDT, received via SendMessage)

Report: complete. Final verdict: ready to accept. All 4 must-change items are fixed: 246/246, type-check and biome clean. Not blocking: a blank program description is stored as "" (program.ts:117); P2028 is tested with a Proxy, not a real timeout, so a maximum-size approve hasn't been timed. The reviewer didn't read the 012/013 handbacks.

---
Second re-review (2026-10-26 21:41 MDT, via SendMessage)

Report: complete. Ready to accept, nothing must change. 239/239; type-check and biome clean on all 13 touched files. (1) No program revert: correct check order, exact text, no writes; canRevert={!isProgram}. (2) Back arrow: correct for all nested admin routes (articles, messages, community-programs, tuning/preview now go back to their section). From articles/[id]/edit, back goes to the Articles list, not the article. Not verified: no phone screenshot of the new arrow. Still open, not blocking: blank program description stored as "".
