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
    When I add "Barbell Bench Press" and log sets of 135 lbs x 8 and 155 lbs x 5
    And I finish the workout
    Then the history shows one workout dated today with 1 exercise and 2 sets

  Scenario: Logged weight is a number with a unit, like the web app
    When I log a set of 62.5 kg x 5
    Then it is saved as weight 62.5 with unit "kg" and reps 5
    And a set logged with no unit defaults to "lbs"

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
