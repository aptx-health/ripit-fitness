---
name: break-matrix
description: Use when you must prove a new test file can fail (handoff-test-builder step 7) by running it against a scratch fake with one rule broken at a time; each variant runs only the tests aimed at its break, in small parallel batches with visible progress.
version: 0.2.0
author: Dustin Mays, Claude
license: MIT
metadata:
  hermes:
    tags: [testing, test-builder, mutation, break-matrix, vitest, testcontainers]
    related_skills: [handoff-test-builder]
---

# Break matrix

Proves a test file catches each rule it claims to test. You run the tests against a **scratch fake** that implements the spec correctly (must pass), then against variants of the fake with **one rule broken each** (each must fail the tests aimed at that rule).

Used from `handoff-test-builder` step 7. This skill is about how to run the matrix at a sensible cost.

## Scale: what it costs

Measured on a 162-test Gherkin file with testcontainers Postgres (Colima, one laptop):

- One full-file run is about 25 s. Almost all of it is per-test database seeding, which is CPU-bound. Container start is only 3 to 5 s of it.
- Running variants in parallel helps only until the CPUs are full: 6 at once took 180 s for 12 full-file variants (about 15 s each), barely better than serial.
- So **60 full-file variants is about 15 minutes**. Don't run a matrix that way.
- A variant that runs only the 1 to 5 tests aimed at its break takes about 8 to 12 s, mostly the one container start.

Sharing one Postgres container across variants was tried and saved only the 3 to 5 s start. It added moving parts (a template database, a resolver plugin) for little gain, so it was removed. Don't re-add it.

## Always run targeted tests

Every variant runs `vitest -t "<regex>"` with only the tests aimed at that break. Run the **full file once**, for the baseline (all must pass). Never run the full file per variant.

1. For each break, write the regex of the test names it should fail (describe and test names; use `a|b` for several). Put them in `breaks.tsv`, one per line: `break_name<TAB>regex`.
2. A targeted run proves the break is **killed**. It does not prove the break fails *only* its targets. If you want that for a suspicious break, rerun that one variant on the full file.
3. With Gherkin step files (vitest-cucumber), each step is its own test and `-t` would skip the Background steps that build the scenario's state, so the scripts add `|Background` to every regex. If you run `vitest -t` by hand, add it yourself. Failures such as `Cannot read properties of undefined` mean missing setup, not a caught break.
4. A break that fails no targeted test **survived**: add a test, or say in the packet why it is unobservable. Check the regex matches something first (the output says how many tests ran).

## Procedure

1. **Build the fake outside the repo** (the scratchpad dir). Alias it over the module under test with a scratch vitest config: `mergeConfig` of the repo config, `root` set to the repo, regex aliases like `/^@\/lib\/foo$/`. Import `mergeConfig` from the repo's `node_modules/vitest/dist/config.js` by absolute path, and symlink the repo's `node_modules` into the scratch dir so bare imports resolve.
2. **Make breaks switchable by one env var**, e.g. `FAKE_BREAK=name`, read in the fake. One name = one broken rule.
3. **Baseline:** run the full file with no break. Everything must pass. If not, the tests or the fake are wrong; fix before going on.
4. **Run the matrix in batches** with `scripts/run-batch.sh` (set `REPO`, `FILE`, `SCRATCH`, and `PAR` if you want to change the default of 4):
   - One batch per call, about 12 variants, run in the background. Say "batch N of M done" between batches so progress is visible.
   - It prints one line per variant as it finishes: `killed by N tests`, `SURVIVED` (with how many tests ran), `TIMEOUT`, or `ERROR` with the first error line, so a crashed run is never read as "failed as intended". Logs are per variant.
   - Stopping a run means killing the xargs and vitest children too. Ryuk is disabled, so also check for leftover Postgres containers (`docker ps`) and remove only the ones you started.
5. **Read the results:**
   - `SURVIVED` and the regex matched tests: the break is not caught.
   - `ERROR`: the run did not execute; fix the setup, don't count it.
   - `killed`: proven, for the tests you aimed at.
6. **Delete the fake and the scratch config** when done.

## Report

In the packet, list the breaks by group (not one line each), say how many were killed, and name any survivors and why. Say the matrix was run targeted, with one full-file baseline.

## Pitfalls

- Two rules that share a code path (for example, a tab and a leading-whitespace guard) can hide each other in a break. Make the fake's rules independent.
- A kill caused by missing setup (a skipped Background step) is a false kill. The runner flags these as `SETUP errors`; check the log before counting it.
- A `-t` regex that matches no tests passes silently. Check the "ran" count.
- Timeouts under parallel load look like failures. Rerun a surprising variant alone before believing it.
- macOS has no `timeout`; `run-batch.sh` uses `gtimeout` if installed and otherwise runs without a time limit, and says so.
- Don't run breaks against the real implementation. They are only for the scratch fake.
