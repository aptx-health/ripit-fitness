Feature: iOS slice 9b - The web's one-exercise logger
  A workout shows one exercise at a time with a fixed ‹ Log set › bar, swipe between exercises, and a Plan list to jump, reorder and edit.
  Oracle: components/workout-logging/ (ExerciseLoggingModal.tsx, NumberKeypad.tsx, the plan sheet, swipe handling);
  initiatives/ios-app/logger-nav-discovery.md §1-2, logic 1-5 and 7. Dustin 2026-11-10: supersets in list order with a badge;
  the web's custom keypads; reordering a program workout changes today's workout only; a light haptic on Log set.

  Scenario: One exercise at a time
    When a workout is open
    Then one exercise shows, with Plan n/N, the clock, Finish and Exit in the header, and Log / Info / Notes / History below

  Scenario: The bottom bar
    Then the bar shows ‹, Log set with the set's reps and weight, and ›
    And ‹ is off on the first exercise and › on the last
    And the bar fills the home-indicator area

  Scenario: Swipe between exercises
    When I swipe left or right far enough, mostly sideways
    Then the next or previous exercise shows, the same as › and ‹
    And a short or mostly vertical swipe, or a swipe while a keypad is open, does nothing

  Scenario: Log a set
    When I tap Log set
    Then the set is logged with a light haptic, the logger stays on the exercise, the weight is kept, reps and effort come from the next planned set, and the rest stopwatch starts

  Scenario: After the planned sets
    Given every planned working set is logged (warm-ups don't count)
    Then the bar shows + Extra set and Next exercise, or Finish on the last exercise
    And the header's Finish hides while the bar offers one

  Scenario: Enter numbers with the web's keypads
    Then reps use a −/+ stepper whose readout opens a keypad, weight uses the web's keypad (1-9, CLR, 0, ⌫, Cancel, Done; the first key replaces the value), and effort uses the web's grid
    And the bottom bar hides while a keypad is open

  Scenario: Freestyle workout with no exercises
    When I start a freestyle workout
    Then the logger asks for the first exercise and the bar offers only Add exercise

  Scenario: The plan list
    When I open Plan
    Then every exercise shows with sets done of planned, a tick when done, and a "Superset A" badge for grouped ones
    And tapping one jumps to it

  Scenario: Reorder, swap, delete and add
    When I drag an exercise to a new place
    Then the exercise I was on stays on screen and its number updates, and a program's future workouts don't change
    When I swap an exercise
    Then the picker replaces it in place
    When I delete an exercise and confirm
    Then it and its logged sets are removed, and I land on the one before it
    When I add exercises from the plan
    Then they're appended and the first new one opens

  Scenario: Supersets go in order
    Given a workout with a superset
    Then next and previous go in list order, and each exercise in the group shows its superset badge

  Scenario: Exit
    When I exit with nothing logged
    Then the empty workout is deleted
    When I exit with sets logged
    Then I can discard it or keep it as a draft to resume later

  Scenario: Everything from slices 5-8 still works
    Then warm-ups, effort, Last time, Info / Notes / History, the rest stopwatch, the finish summary and the picker work in the new logger
    And at the largest text size the logger and its bar stay usable
