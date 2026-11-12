Feature: iOS slice 2 - move my ripit.fit history onto the phone
  The web app gives a signed-in user a JSON file of their own data.
  The iOS app imports that file into its local database.

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

  Scenario: Import a file on the phone
    Given a fresh install
    When I import a ripit-export version 1 file
    Then my programs, history, saved workouts and custom exercises appear
    And logged weights keep their number and unit
    And the active program is still active

  Scenario: Importing the same file twice does not duplicate anything
    Given I have imported a file
    When I import the same file again
    Then nothing is duplicated

  Scenario: A bad or newer file is refused without changing anything
    When I import a file that is not ripit-export, is corrupt, or has version 2
    Then I see a plain reason and my data is unchanged

  Scenario: Exercises missing from the phone catalog still import
    Given the file references an exercise id the bundled catalog does not have
    When I import it
    Then the exercise is kept with its name, and its sets are kept
