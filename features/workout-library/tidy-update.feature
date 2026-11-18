Feature: Tidy saved workouts and update one after a session
  Clean up many saved workouts at once, and after a session that started from
  a saved workout, update it instead of saving a duplicate.

  Background:
    Given I am signed in
    And I have saved workouts in Library → Workouts

  # --- Select mode ---

  Scenario: Enter and leave select mode
    When I tap "Select" on Library → Workouts
    Then each row shows a checkbox and tapping a row toggles it instead of opening it
    And a bar at the bottom shows how many are selected with Archive, Tag and Delete
    And "Done" leaves select mode and clears the selection

  Scenario: Select all that show
    Given a search or tag chip is active
    When I tap "Select all"
    Then only the workouts that show are selected

  Scenario: Bulk archive
    Given I selected 3 workouts
    When I tap "Archive"
    Then the 3 are archived and leave the list
    And a toast offers "Undo", which restores all 3

  Scenario: Bulk tag
    Given I selected 3 workouts
    When I tap "Tag" and pick a tag (existing, starter, or typed)
    Then that tag is added to all 3, keeping their other tags
    And a workout already at 8 tags is skipped, and the toast says how many were skipped

  Scenario: Bulk delete
    Given I selected 3 workouts
    When I tap "Delete"
    Then a confirm says "Delete 3 workouts? Your workout history stays."
    And confirming deletes them; past sessions done from them are kept

  Scenario: Bulk actions only touch my own workouts
    Then a bulk request containing another user's workout id changes nothing for that id
    And bulk requests are rate limited and capped at 100 workouts

  # --- Update vs save as new ---

  Scenario: A session from a saved workout offers Update
    Given I started a session from my saved workout "Push A"
    And I changed its exercises or sets during the session
    When I finish and the summary opens
    Then instead of a single Save I see "Update Push A" and "Save as new"

  Scenario: Update keeps the saved workout's identity
    When I tap "Update Push A"
    Then "Push A" gets this session's exercises and sets
    And keeps its name, notes, tags, pin and origin
    And no second "Push A" is created

  Scenario: Save as new
    When I tap "Save as new"
    Then a new saved workout is created as today, and "Push A" is unchanged

  Scenario: Nothing changed
    Given the session's exercises and sets match "Push A"
    Then the summary says it matches "Push A" and offers no Update

  Scenario: The saved workout is gone
    Given "Push A" was deleted or archived during the session
    Then only "Save as new" is offered

  Scenario: A freestyle session not from a saved workout
    Then the summary offers Save as today
