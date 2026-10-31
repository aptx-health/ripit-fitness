Report: complete (047, TL5a Coach Suggestions tests, red). Relayed by SendMessage 2026-10-31; saved by the lead (condensed). The full seam spec is in the header comment of `__tests__/features/training-library/coach-suggestions.steps.ts`.

**Files** (locked)
- `coach-suggestions.steps.ts`: 107 tests. Proposals are seeded through the real MCP `callTool`, and the real routes and loaders are used.
- `__tests__/components/suggestions-view.test.tsx`: 46 tests.

**Seams**
1. **`lib/suggestions/kinds.ts`:** `SUGGESTION_KINDS` and `suggestionKindLabel(kind)`, which returns null for hidden kinds.
2. **Routes** (user-scoped; 401 with no user; 404 for another user's, an unknown or a hidden-kind id, with no state change):
   - `GET /api/suggestions` → `{suggestions:[{id, kind, kindLabel, summary, rationale, createdAt}]}`.
   - `GET /api/suggestions/[id]` → `{suggestion: SuggestionDetail}`.
   - `POST .../accept`: the service's approve.
     - Failures return `{error, code}`: `not_found` 404, `not_pending` 409, `conflict` 409, `invalid` 422.
     - Success returns `200 {success, data, programId}`.
   - `POST .../reject` → `200 {success, data}`, or 409 `not_pending`.
   - There's no revert route, and a test asserts that.
3. **`lib/suggestions/detail.ts`:** `getSuggestionDetail(userId, id)` returns `{id, kind, kindLabel, status, outcome, summary, rationale, createdAt, programId, body}`.
   - `outcome` is null, 'Accepted', 'Rejected' or 'No longer applies'.
   - The body depends on the kind: `saved_workout_create`, `saved_workout_update` rows, `program`, or a `diff` of rows.
   - Rows use display names and exercise names, plus `current` when the value has moved.
   - This logic is lifted from the admin page's renderers.
4. **`getTrainingHome`:** gains `suggestions: {count, items}`, with the newest 3 items.
5. **`TrainingHome`:**
   - "Coach Suggestions · N" is the first section.
   - The newest item shows its label, summary, rationale and Review.
   - Up to 2 more items are shown as summary links, plus a View Suggestions link.
   - The section is hidden at 0, and suggestions suppress the empty home.
6. **`components/suggestions/SuggestionsList.tsx`:** an empty list says "No suggestions right now" and links to `/training`.
7. **`components/suggestions/SuggestionReview.tsx`:**
   - Accept and Reject show only while the suggestion is pending.
   - Accepting a workout shows a link to `/library?type=workouts`.
   - Accepting a program asks "Make it active?":
     - Make active calls activate, then pushes the detail page.
     - Not now pushes the detail page.
   - Accepting anchors or targets says "Updated".
   - A 409 conflict says "This suggestion no longer applies".
   - Only one request runs at a time.
   - After Reject it calls `GET /api/suggestions` and goes to `/training` or `/suggestions`.
   - The UI never says "proposal".
8. **Nav:** `/suggestions*` highlights Training.

**Decisions** (confirmed by the lead)
- The response keys `suggestions`, `suggestion` and `programId`.
- Reject decides where to go by calling GET.
- 404, not 403.

**Locked tests changed**
- `training-home.steps.ts`: the new-user `toEqual`.
- The `training-home-view` and `pinned-workouts-view` fixtures.
- `nav-active-tab`: added `/suggestions` rows.

**Red state**
- Steps: 79 of 107 fail.
- View: 43 of 46 fail.
- Nav: 8 fail.
- 1 TL2 test fails.
- Everything else passes.

**Break matrix:** 60 breaks, all killed.

**Not covered**
- The page glue, and the admin page sharing the lifted renderers.
- Rate limiting.
- The outcome label for a reverted suggestion.
