Report: complete

Done: the tests, golden and the rules at the top of Picker.swift now follow Dustin's three calls:
• Trimmed names: spaces around a name are removed when it's saved, on create and edit. Duplicate
  checks use the trimmed name.
• Sort, then cut: search scores and sorts every match, then keeps the first 50.
• A letter or digit is required: a name like "!!!" is refused with "Name must include a letter or
  number". A search with no letter or digit acts like an empty search.

Aliases still match exact words only, and "Other" still includes resistance bands, as on the web.
Nothing is committed.

Verified:
• mise run ios-check gives 79 failures, all notImplemented, and the app builds.
• The golden came out byte-identical on two runs.
• The full suite passes against a correct fake (262 tests).
• The break matrix ran only on the changed rules: 12 of 12 breaks were caught.
• Changing one expected value failed only that case.

One test change beyond comments and counts: in CustomExerciseGoldenTests.swift, a custom made during
the create run is now looked up by its trimmed name, because that is how the golden labels it.
Without this, a correct implementation failed the trimmed-duplicate case. The files and picker.json
are locked again.

The full packet, with the cleanup list, is in
/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/3b78e
369-d8c9-4578-ab14-19da0c1828f9/scratchpad/189-handback-2.md. I didn't write it into work/ because
this request didn't allow it.
  📌 pin

✻ Sautéed for 5m 44s · done 10:15 AM

● How is Claude doing this session? (optional)
  1: Bad    2: Fine   3: Good   0: Dismiss
                                                               new task? /clear to save 131.8k tokens

❯

  [Opus 5.5]  worktree-brave-field-c150 git:(feature/ios-skeleton*)
  Context █░░░░░░░░░ 13%  Usage Weekly ████░░░░░░ 43% (resets in 2d 19h)
  -- INSERT -- ⏵⏵ auto mode on (shift+tab to cycle) · ← 3 agents
