Feature: iOS slice 3 - programs on the phone
  Follow a strength program week by week, logging against the plan.
  Rules follow the web app (lib/db/*, lib/workout/prefill.ts) unless a scenario says otherwise.

  Scenario: Build a program
    When I create a program with 2 weeks, 3 workouts a week, exercises and prescribed sets
    Then it is saved with its weeks, workouts, exercises and sets in order
    And prescribed weight stays free text like "65%" or "RPE 8"

  Scenario: Only one program is active
    Given program A is active
    When I activate program B
    Then B is active and A is not

  Scenario: Up Next is the first unfinished workout of the current week
    Given the active program's week 1 has 3 workouts and I finished the first
    Then Up Next is week 1, workout 2
    And the current week is week 1

  Scenario: Finishing a week moves me to the next week
    Given I finish every workout in week 1
    Then the current week is week 2 and Up Next is its first workout

  Scenario: Start a program workout prefilled from the plan and last time
    Given workout 2 prescribes Squat 3 x 5 and I squatted 225 lbs x 5 last time
    When I start workout 2
    Then each Squat set shows the plan and is prefilled as the web app prefills it

  Scenario: Plan and logged sets stay apart
    When I log 2 sets where 3 were prescribed and change the reps on one
    Then the prescribed sets are unchanged and the completion holds my 2 logged sets

  Scenario: Supersets in a program
    Given a workout with A1/A2 grouped exercises
    Then they show and log as a superset, and stay grouped in history

  Scenario: Finishing the program offers a restart
    Given I finish the last workout of the last week
    Then the program shows as complete
    When I restart it
    Then week 1 is current again, the cycle number goes up, and old history is kept

  Scenario: Editing a program does not rewrite history
    Given I logged workout 1
    When I rename an exercise or change its prescribed sets
    Then my logged history for workout 1 is unchanged

  Scenario: Archive a program
    When I archive an inactive program
    Then it leaves the program list but its history stays
