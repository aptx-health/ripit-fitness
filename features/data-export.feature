Feature: Download my data (ripit-export v1)
  The web app gives a signed-in user a JSON file of their own data.
  The iOS app imports that file into its local database.
  Format: docs/RIPIT_EXPORT_FORMAT.md. Fixture: docs/fixtures/ripit-export-v1.json.

  Scenario: Download my data from Settings
    Given I am signed in on the web app
    When I choose "Download my data" in Settings
    Then I get a file named like "ripit-export-2026-11-07.json"
    And it holds format "ripit-export", version 1, and the export time

  Scenario: The export holds only my data
    Given another user has programs and workouts
    When I download my data
    Then none of their rows are in my file

  Scenario: The export is complete enough to rebuild my training
    Given I have programs with weeks, workouts, exercises, prescribed sets and supersets
    And finished, abandoned and ad-hoc workouts with logged sets
    And saved workouts and custom exercises
    When I download my data
    Then all of it is in the file, with plan and logged sets kept apart
    And system exercises are referenced by id, not copied

  Scenario: Export is rate limited and needs a session
    Given I am not signed in
    When I request my data
    Then I get 401
    And repeated requests past the limit get 429
