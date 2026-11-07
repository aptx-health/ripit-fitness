Feature: Workout library, slice 3: where a workout came from, the New group, and archive
  Every saved workout records where it came from: a session the user saved,
  an agent proposal, or (coaching slice 2) a coach. AI and coach workouts wait
  in a "New" group at the top of Library → Workouts until the user starts or
  dismisses them. The user can archive any workout by hand; archived ones are
  hidden but can be restored. Builds on slice 1 (Pinned, Recent, Older).
  Note: initiatives/workout-library/docs/141-discovery.md.

  Background:
    Given a signed-in user with saved workouts, today 2026-11-07

  # Origin
  Scenario: Origin is recorded
    Then a workout saved after a session has origin "session"
    And a workout created by approving an agent's saved-workout proposal has origin "agent"
    And origin "coach" exists for coaching slice 2 to use

  Scenario: Existing workouts
    Given workouts saved before this change
    Then the ones created by an applied agent proposal get origin "agent" and the rest "session"

  # New group
  Scenario: AI workouts wait in New
    Given the user approved an agent's workout "Machine Upper" and hasn't started it
    Then it shows in a "New" group above Pinned, with who it came from ("From <agent name>") and Start and Dismiss
    And it is not also shown in Recent

  Scenario: Starting leaves New
    When the user starts a workout from New
    Then it moves to Recent

  Scenario: Dismiss
    When the user taps Dismiss on a workout in New
    Then it is archived, and an Undo toast brings it back

  Scenario: No New group
    Given no unstarted AI or coach workouts
    Then there is no New group

  # Archive
  Scenario: Archive by hand
    When the user archives a workout from its row menu
    Then it leaves every group, is unpinned, and no longer shows on Training or in the quick action sheet
    And an Undo toast brings it back as it was (pinned again if it was)

  Scenario: Show archived
    Given 3 archived workouts
    Then the end of the list has "Show archived (3)"
    When the user opens it
    Then the archived workouts show with Restore and Delete

  Scenario: Restore
    When the user restores an archived workout
    Then it goes back to Recent or Older by its date (not New, not Pinned)

  Scenario: Nothing is archived on its own
    Then no workout is archived or deleted without the user doing it

  # Agents
  Scenario: MCP list
    When an agent calls list_saved_workouts
    Then each workout includes origin, lastUsedAt, pinned and archived
    And archived workouts are left out unless it asks for them, and the order matches the app (last used, never-used by when saved)

  # Safety and fit
  Scenario: Scoped and rate limited
    Then archive, restore and dismiss only touch the user's own workouts, are rate limited and log errors

  Scenario: Phone width
    Then at 390px the New group, row menu and Show archived fit with 48px tap targets, in light, dark and E-INK
