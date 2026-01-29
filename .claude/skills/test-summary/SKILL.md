---
name: test-summary
description: Run type-check and/or tests with concise output. Use when verifying code changes, checking for type errors, or running tests. Automatically filters verbose output to show only failures and key metrics.
allowed-tools: Bash
argument-hint: [test-pattern]
---

# Test Summary Skill

Run type-check and/or tests, then provide a concise summary focusing on failures only.

## Instructions

1. **Determine what to run:**
   - If $ARGUMENTS is empty: Run type-check AND full test suite
   - If $ARGUMENTS contains "type" or "typecheck": Run only type-check
   - If $ARGUMENTS contains a test pattern: Run that specific test file/pattern
   - Examples:
     - `/test-summary` → Run type-check + all tests
     - `/test-summary type` → Run only type-check
     - `/test-summary draft` → Run only draft.test.ts
     - `/test-summary clone-worker` → Run only clone-worker.test.ts

2. **Run commands:**
   - Type-check: `doppler run -- npm run type-check`
   - All tests: `doppler run --config dev_test -- npm test`
   - Specific test: `doppler run --config dev_test -- npm test [pattern]`

3. **Parse output and return ONLY:**

   **Type-check:**
   - ✓ Status (Pass/Fail)
   - If failed: List each error with `file:line` format for easy navigation
   - Example: `src/app/api/programs/route.ts:42 - Type 'string' is not assignable to type 'number'`

   **Tests:**
   - ✓ Status with counts (e.g., "48 passed, 2 failed")
   - If failed: List each failing test with:
     - Test file and name
     - Key error message (1-2 lines max)
     - No stack traces unless critical
   - Example:
     ```
     __tests__/api/draft.test.ts - "should handle concurrent logging"
       Expected 2 sets, got 3
     ```

4. **Format output:**
   ```
   Type-check: ✓ Passed

   Tests: 48 passed, 2 failed

   Failed tests:
   - __tests__/api/draft.test.ts - "should handle concurrent logging"
     Expected 2 sets, got 3

   - __tests__/api/clone-worker.test.ts - "should handle retry"
     Timeout waiting for status='ready'
   ```

5. **Keep it concise:**
   - NO output from passing tests
   - NO verbose stack traces (unless truly needed)
   - NO build warnings (unless blocking)
   - Focus on actionable information only

6. **Provide recommendation:**
   - If all pass: "All checks passed ✓"
   - If failures: One-line summary of what needs fixing

## Important Notes

- Always use Doppler for environment variables
- Use `dev_test` config for tests (not default config)
- Docker must be running for tests (Testcontainers)
- If tests hang, it usually means Docker isn't running
