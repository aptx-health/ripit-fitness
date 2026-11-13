Feature: iOS slice 5 - Logging help
  Help while logging a set on the phone, matching the web logger.
  Oracle: hooks/useRestTimer.ts, components/workout-logging/LastSessionReference.tsx,
  components/workout-logging/inputs/IntensitySelector.tsx, lib/constants/intensity-presets.ts,
  components/workout-logging/ExerciseHistoryPanel.tsx, ExerciseInfoContent.tsx, ExerciseDisplayTabs.tsx.

  Scenario: Rest timer starts when I log a set
    Given a workout in progress
    When I log a set on an exercise
    Then a rest timer for that exercise starts at 0:00 and counts up
    And logging another set on it resets the timer to 0:00

  Scenario: Rest timer keeps true time
    Given a rest timer is running
    When I switch apps or lock the phone for 2 minutes and come back
    Then the timer shows about 2 minutes more, because it counts from when the set was logged

  Scenario: Workout clock
    Given a workout in progress
    Then I see how long the workout has been running, and it stays right after a relaunch

  Scenario: Last time line
    Given I logged this exercise in an earlier finished workout
    When I open it in a new workout
    Then I see a "Last time" line with that workout's sets and date
    And tapping it fills the next set with last time's weight and reps
    But an exercise I've never logged shows no "Last time" line

  Scenario: Logging effort
    Given effort tracking is set to RPE (or RIR)
    When I log a set
    Then I can pick an effort from the web's presets (RPE 6 to 10, RIR 0 to 5+) or leave it blank
    And the effort is saved on the set, shown in history, and counted in Progress's effort number
    And a planned RPE/RIR on the set is offered as the default

  Scenario: Warm-up sets
    When I mark a logged set as a warm-up
    Then it is saved as a warm-up, labelled in the workout and history, and left out of records as on the web

  Scenario: Exercise info
    When I open an exercise's Info while logging
    Then I see its photos, its instructions, and its muscles and equipment

  Scenario: Exercise notes
    Given the plan has notes for an exercise
    Then the notes show for that exercise while logging
    But an exercise with no notes shows no notes section

  Scenario: Exercise history while logging
    When I open an exercise's History while logging
    Then I see its recent finished workouts, newest first, each with sets and the best set's e1RM
    And the all-time best is marked PR once there are at least 2 workouts to compare, as on the web
    And warm-up sets are tucked away, as on the web

  Scenario: Finish asks first
    Given a workout with logged sets
    When I tap Finish
    Then I'm asked to confirm before the workout ends, and Cancel keeps it open
