Feature: Workout logger bottom bar
  One bottom bar for every kind of workout, which never disappears mid-workout.

  Scenario: Log set shows what will be saved
    Given I am on an exercise with 8 reps and 135 lbs entered
    Then the main button reads "Log set" with "8 reps × 135 lbs" under it
    And tapping it logs that set as before

  Scenario: The bar stays after the last planned set
    Given I have logged every planned set of an exercise that is not the last
    Then the bar shows Previous, "+ Extra set" and "Next exercise"
    And "+ Extra set" lets me log one more set
    And "Next exercise" moves to the next exercise

  Scenario: On the last exercise the bar offers Finish
    Given I have logged every planned set of the last exercise
    Then the bar shows Previous, "+ Extra set" and "Finish"
    And "Finish" opens the Complete confirmation

  Scenario: The banner counts sets done
    Given an exercise has 7 planned sets and I have logged all 7
    Then the banner reads "7 of 7 done"

  Scenario: Previous and next are clearly off at the ends
    Given I am on the first exercise
    Then Previous is disabled and announced as disabled

  Scenario: Follow-along uses the same bar
    Given I am in a follow-along workout
    Then the bar shows Previous and "Next exercise", or "Finish" on the last exercise

  Scenario: Freestyle with no exercises
    Given I started a freestyle workout and added nothing yet
    Then the bar's main button is "Add exercise"
