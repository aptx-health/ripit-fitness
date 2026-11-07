Feature: iOS app slice 1 - skeleton and ad-hoc logging
  The phone keeps its own data in a local SQLite database. No account, no network.

  Scenario: Fresh install opens to an empty history
    Given the app has never been opened
    When I open it
    Then the database is created at the latest schema version
    And the history list says there are no workouts yet

  Scenario: Schema migrations run in order and only once
    Given a database at an older schema version
    When the app opens it
    Then each missing migration runs once in order
    And existing rows are kept

  Scenario: The exercise catalog ships with the app
    Given a fresh install
    Then all 312 system exercises are available offline
    And each exercise with a matched image shows its start and finish photos
    And an exercise with no image shows a placeholder, not an error

  Scenario: Search the catalog
    When I search for "bench"
    Then matching exercises appear by name and alias
    And the match ignores case and punctuation

  Scenario: Log an ad-hoc workout
    Given I start a new workout
    When I add "Barbell Bench Press" and log sets "135lbs x 8" and "155lbs x 5"
    And I finish the workout
    Then the history shows one workout dated today with 1 exercise and 2 sets

  Scenario: Weight stays free text
    When I log a set with weight "RPE 8"
    Then it is saved and shown exactly as "RPE 8"

  Scenario: A workout in progress survives the app closing
    Given I have logged 1 set in an unfinished workout
    When the app is closed and reopened
    Then the unfinished workout is offered to resume with its set

  Scenario: Discard an unfinished workout
    Given an unfinished workout with sets
    When I discard it and confirm
    Then it is gone and history is unchanged

  Scenario: Supersets are kept
    When I group two exercises as a superset in an ad-hoc workout
    Then they stay grouped after finishing and in history
