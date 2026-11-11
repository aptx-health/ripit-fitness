Feature: Edit an exercise definition from the logger (editors and admins)
  An editor or admin fixing an exercise mid-workout (bad name, instructions,
  muscles, equipment) can do it from the logger's Edit menu without leaving
  the workout. Changes apply for every user, so saving asks first.

  Background:
    Given I am signed in with the editor or admin role
    And a workout is open in the logger

  Scenario Outline: The Edit menu offers the definition editor
    Given I am in the <logger>
    When I open the exercise's Edit menu
    Then I see "Edit exercise definition (Admin)"
    Examples:
      | logger           |
      | program logger   |
      | freestyle logger |

  Scenario: Regular users don't see it
    Given I am signed in as a regular user
    When I open the exercise's Edit menu in either logger
    Then there is no "Edit exercise definition (Admin)" item

  Scenario: Opens the quick editor for this exercise
    When I choose "Edit exercise definition (Admin)"
    Then the quick editor opens over the logger with this exercise's name, instructions, notes, muscles and equipment
    And it has a link to the full editor

  Scenario: Saving asks first and shows the impact
    Given I changed a field in the quick editor
    When I tap Save
    Then a confirm says the change applies for every user and how many workouts use the exercise
    And it offers "Save for everyone" and "Keep editing"

  Scenario: Confirmed save returns to the workout
    When I confirm "Save for everyone"
    Then the exercise definition is saved
    And I am back in the logger on the same exercise and set, with my logged sets and entered values unchanged
    And the logger shows the new name

  Scenario: Keep editing
    When I choose "Keep editing" in the confirm
    Then nothing is saved and my edits stay in the editor

  Scenario: Leaving with unsaved changes asks
    Given I changed a field
    When I close the editor
    Then I'm asked to discard the changes or keep editing
    And closing with no changes just closes

  Scenario: The full editor confirms the same way
    When I open the full editor from the quick editor and save a change
    Then the same "applies for every user" confirm appears first

  Scenario: Dialogs sit above the logger
    Then the editor and its confirms are drawn above the logger and its sheets, and every button can be tapped
