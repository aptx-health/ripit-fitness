Feature: Workout logger confirmations
  Every confirmation in the workout logger is a real dialog and keeps its behaviour.

  Scenario: A confirmation is a real dialog
    Given I am logging a workout
    When I open any logger confirmation
    Then it is announced as an alert dialog with its title and message
    And focus moves into it and stays there until it closes
    And when it closes, focus returns to what opened it

  Scenario: Escape cancels a confirmation
    Given a logger confirmation is open
    When I press Escape
    Then it closes and nothing is changed

  Scenario: Completing a workout shows what will be saved
    Given I have logged 18 sets over 42 minutes
    When I tap Complete
    Then the confirmation says "18 sets · 42 min"
    And confirming completes the workout as before

  Scenario: Leaving a workout
    Given I have logged sets
    When I tap Exit
    Then I can save it as a draft, discard it, or cancel
    And each choice does what it did before

  Scenario: Deleting an exercise names it
    Given "Barbell Squat" is in my workout
    When I choose Delete from its actions menu
    Then the confirmation is titled "Delete Barbell Squat?"
    And confirming removes it as before

  Scenario: Deleting the only set
    Given an exercise has exactly one logged set
    When I delete it
    Then the confirmation is titled "Delete the only set?"

  Scenario: Switching from follow-along to logging, and completing a freestyle workout
    Given I am in a follow-along or freestyle workout
    When I switch to logging or complete the freestyle workout
    Then I get the same kind of confirmation, and confirming does what it did before

  Scenario: A failed completion is shown in the app
    Given completing my workout fails
    When I confirm Complete
    Then I see an error message in the app, not a browser alert
