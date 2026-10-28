---
name: break-matrix
description: Use when you must prove a new test file can fail (handoff-test-builder step 7) by running it against a scratch fake with one rule broken at a time; runs the variants in parallel and only the targeted tests, so a 50-variant matrix takes minutes, not tens of minutes.
version: 0.1.0
author: Dustin Mays, Claude
license: MIT
metadata:
  hermes:
    tags: [testing, test-builder, mutation, break-matrix, vitest, testcontainers]
    related_skills: [handoff-test-builder]
---

# Break matrix

Proves a test file catches each rule it claims to test. You run the tests against a **scratch fake** that implements the spec correctly (must pass), then against variants of the fake with **one rule broken each** (each must fail, and only the tests aimed at that rule).

Used from `handoff-test-builder` step 7. This skill is only about how to run the matrix fast.

## Why it is slow, and what fixes it

Each run is its own vitest process. With a testcontainers database, each process starts a Postgres container and pushes the schema (about 10 to 15 seconds). Running 50 variants one after another costs about 10 minutes. The variants share no state, so:

1. **Run variants in parallel.** One process per variant, 4 at a time (`xargs -P 4`). Each gets its own container on a random port. Go to 6 if the machine copes; drop to 2 if tests start timing out (low CPU or RAM in Colima or Docker causes false failures).
2. **Run only what the break should hit.** Keep the file under test, skip other files, and use `-t "<name>"` when you already know which tests a variant targets. Run the full file once for the baseline.
3. **Share one container (optional).** Alias the repo's test-database module to a scratch one that connects to a single persistent Postgres, and reset data between tests. Saves the container start per variant. Only worth it above about 30 variants.
4. **Don't start a database for pure logic.** If a break only touches pure functions, test it without the container.

## Procedure

1. **Build the fake outside the repo** (the scratchpad dir). Alias it over the module under test with a scratch vitest config: `mergeConfig` of the repo config, `root` set to the repo, regex aliases like `/^@\/lib\/foo$/`. Import `mergeConfig` from the repo's `node_modules/vitest/dist/config.js` by absolute path, and symlink the repo's `node_modules` into the scratch dir so bare imports resolve.
2. **Make breaks switchable by one env var**, e.g. `FAKE_BREAK=name`, read in the fake. One name = one broken rule.
3. **Baseline:** run with no break. Everything must pass. If not, the tests or the fake are wrong; fix before going on.
4. **Run the matrix in parallel** with a script like this, with the same env vars you use for normal runs (for testcontainers on Colima: `DOCKER_HOST`, `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE`, `TESTCONTAINERS_RYUK_DISABLED`):

   ```bash
   BREAKS="warmup units sort ..."
   run() {
     FAKE_BREAK=$1 npx vitest run --config "$SP/vitest.fake.config.ts" "$FILE" 2>&1 \
       | grep -E "^ FAIL|Tests  " | sed -E 's/ FAIL  .*> //' | cut -c1-110 | sort -u \
       | sed "s/^/[$1] /"
   }
   export -f run; export SP FILE
   printf '%s\n' $BREAKS | xargs -P 4 -I{} bash -c 'run {}'
   ```
   Output from parallel jobs interleaves by line; the `[name]` prefix keeps each line attributable. Sort the output if you want it grouped.
5. **Read the results:**
   - A break that fails **no tests** survived: add a test, or say in the packet why it is unobservable.
   - A break that fails **unrelated tests** is too broad, or a test is too coupled. Say so.
   - A break that fails the expected tests only is proven.
6. **Delete the fake and the scratch config** when done.

## Report

In the packet, list the breaks by group (not one line each), say how many failed only their targets, and name any survivors and why.

## Pitfalls

- Two rules that share a code path (for example, a tab and a leading-whitespace guard) can hide each other in a break. Check each variant fails the tests you meant; make the fake's rules independent if not.
- Timeouts under parallel load look like failures. Re-run a surprising variant alone before believing it.
- Don't run breaks against the real implementation. They are only for the scratch fake.
