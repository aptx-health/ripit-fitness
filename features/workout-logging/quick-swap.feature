Feature: Quick exercise swap in an active workout
  Swapping an exercise mid-workout should take one tap for someone who
  doesn't know the library: the picker opens with similar exercises first,
  and a program swap keeps the prescribed sets unless asked otherwise.

  Background:
    Given I am signed in
    And a workout is open in the logger

  # --- Similar exercises first ---

  Scenario Outline: The swap picker opens with similar exercises
    Given I am in the <logger>
    And the current exercise is "Dumbbell Goblet Squat" (primary quads and glutes, dumbbell)
    When I choose "Swap this exercise" from the Edit menu or the workout plan
    Then before I type anything, a "Similar" list shows up to 8 exercises
    And "Dumbbell Lunge" is among them
    And the current exercise is not in the list
    Examples:
      | logger           |
      | program logger   |
      | freestyle logger |

  Scenario: Similar is ranked by muscles, then equipment
    Given candidates that share the current exercise's primary muscles
    Then exercises sharing more primary muscles rank higher
    And among equal muscle matches, ones sharing the current equipment rank higher
    And among those, ones with the same movement pattern rank higher when both are tagged
    And exercises sharing no primary muscle are not in the list

  Scenario: Similar only offers exercises I can use
    Then the list holds library exercises and my own custom exercises
    And never another user's custom exercise

  Scenario: Typing switches to normal search
    Given the "Similar" list is showing
    When I type in the search box
    Then the normal search results replace the list
    And clearing the search brings the "Similar" list back

  Scenario: An untagged exercise still opens a usable picker
    Given the current exercise has no primary muscles
    When I open the swap picker
    Then there is no "Similar" list
    And the normal search shows as it does today

  # --- Program swap: pick means done ---

  Scenario: Picking swaps right away and keeps the program's sets
    Given I am in the program logger
    And the current exercise is prescribed 3 sets of 8 at RIR 2
    When I open the swap picker and tap "Dumbbell Lunge"
    Then the exercise is replaced with "Dumbbell Lunge" without any further screen
    And it keeps 3 sets of 8 at RIR 2
    And I am back in the logger on the new exercise

  Scenario: The picker shows what will be kept in one line
    Given I am in the program logger
    When I open the swap picker
    Then one line reads "Keeps 3 × 8 @ RIR 2 · This week only" with a "Change" button
    And tapping "Change" shows "Keep original sets" (on) and "Also swap in future weeks" (off) as the app's switches
    And the line updates to match what I choose

  Scenario: The picker opens on similar exercises, not filters
    When I open the swap picker
    Then the muscle and equipment filters are collapsed behind one filter button next to search
    And Cancel is an X in the header
    And at least 6 similar exercises fit on a phone screen

  Scenario: More like this
    Given the "Similar" list is showing
    When I tap "More like this"
    Then chips for the current exercise's muscles and equipment appear
    And the list below shows more exercises matching the chips I leave on

  Scenario: Unchecking "Keep original sets" opens the set editor
    Given I turned off "Keep original sets"
    When I tap an exercise
    Then the set editor opens prefilled with the original sets
    And saving it swaps the exercise with the edited sets

  Scenario: Also swap in future weeks
    Given I turned on "Also swap in future weeks"
    When I tap an exercise
    Then this exercise and the same exercise in later weeks of the program are replaced
    And each keeps its own prescribed sets

  Scenario: Logged sets are kept
    Given I already logged sets on the current exercise
    When I swap it
    Then the logged sets stay with the workout as today

  Scenario: A failed swap leaves the workout unchanged
    Given the swap request fails
    When I tap an exercise
    Then I see an error that says the swap didn't happen
    And the original exercise is still there
    And I can try again

  # --- Freestyle ---

  Scenario: Freestyle swap stays one tap
    Given I am in the freestyle logger
    When I open the swap picker and tap a "Similar" exercise
    Then the exercise is swapped as today, with no extra step
