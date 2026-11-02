Feature: Workout logger tabs and plan sheet
  The exercise sits in a folder with paper tabs, and the plan shows where I am.

  Scenario: Exercise tabs are paper tabs with counts
    Given an exercise with 1 note and 3 past sessions
    Then I see the tabs "Log", "Info", "Notes" and "History"
    And Notes shows a count of 1 and History a count of 3, each with a spoken label
    And the exercise name appears once

  Scenario: The plan opener says what it is
    Given I am on exercise 2 of 6
    Then the header button reads "Plan 2/6"

  Scenario: The plan sheet shows progress
    Given I have logged 2 of 4 sets on exercise 2 and finished exercise 1
    When I open the plan
    Then it opens as a sheet titled "Workout plan" with "2/6"
    And exercise 1 is marked done, exercise 2 is marked now with "2 of 4 sets", and the rest show their number
    And the summary shows how many sets of the whole workout are done

  Scenario: Long names wrap instead of being cut off
    Given an exercise called "Dumbbell Romanian Deadlift"
    When I open the plan
    Then its full name is shown

  Scenario: Jumping to an exercise
    When I tap exercise 4 in the plan
    Then the plan closes and exercise 4 is shown

  Scenario: Reordering is a mode
    When I open the plan
    Then no drag handles are shown
    When I tap "Reorder"
    Then drag handles appear and reordering works as before

  Scenario: Exercise actions still work from the plan
    When I open an exercise's menu in the plan
    Then I can swap or delete it as before, and add an exercise from the sheet

  Scenario: One Finish on the last exercise
    Given I am on the last exercise and the bottom bar offers Finish
    Then only one Finish button is on screen
