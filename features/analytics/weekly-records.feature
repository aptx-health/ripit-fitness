Feature: Progress tab, records, lifts and trend note (S2)
  Adds a Records / Lifts folder and a trend note under the 8-week chart to the
  weekly report from S1. Everything is for the week shown by the navigator,
  using the same local Monday-to-Sunday weeks. Only completed, non-archived
  workouts and working sets (not warmups) count. A lift's e1RM is the Epley
  estimate of its best set in a session; bodyweight sets (weight 0) have no
  e1RM and are compared by reps. Weights are shown in the user's unit.

  Background:
    Given a signed-in user in timezone "America/Denver"

  # Records tab: personal records set in the shown week
  Scenario: e1RM PR
    Given Back Squat's best e1RM before this week was 278 lb
    And this week they squatted 275 lb x 4 (Epley e1RM 312 lb)
    Then Records lists "Back Squat" with "275×4 · e1RM 312 lb (was 278)" and a "PR" chip

  Scenario: Rep PR
    Given Bench Press's heaviest 8-rep set before this week was 180 lb
    And this week they benched 185 lb x 8, which is not an e1RM PR
    Then Records lists "Bench Press" with "185×8 · best 8-rep set (was 180)" and a "Rep PR" chip

  Scenario: Rep PRs count heavier sets at 1 to 12 reps only
    Given this week's best new set is 95 lb x 15 on an exercise with no earlier 15-rep set
    Then it is not listed as a Rep PR

  Scenario: An exercise's first ever session is not a PR
    Given this week is the first time they did Hack Squat
    Then Records does not list Hack Squat

  Scenario: Bodyweight rep PR
    Given Pull-up's best before this week was 10 reps at bodyweight
    And this week they did 12 reps at bodyweight
    Then Records lists "Pull-up" with "12 reps (was 10)" and a "Rep PR" chip

  Scenario: One row per exercise
    Given Back Squat set an e1RM PR and a rep PR this week
    Then Records shows one Back Squat row with the "PR" chip

  Scenario: The Records tab shows a count
    Given 2 exercises set records this week
    Then the Records tab shows the count 2

  Scenario: No records
    Given no records were set in the shown week
    Then the Records tab shows "No records this week"
    And the Lifts tab is still available

  Scenario: Past weeks show the records set in that week
    When the user steps back to an earlier week
    Then Records compares that week only with history before it

  # Lifts tab: every exercise done in the shown week
  Scenario: Lifts lists each exercise done this week
    Given they did Back Squat, Overhead Press and Pull-up this week
    Then Lifts lists those three, most working sets first
    And each row shows the week's best set and its e1RM, and the change vs the exercise's previous session

  Scenario: Flat lift
    Given Overhead Press's best e1RM is 133 lb
    And this week's session is the 3rd in a row below it
    Then the Overhead Press row shows a "Flat" chip and "3rd session below 133"

  Scenario: Fewer than 3 sessions below the best is not flat
    Given Overhead Press is 2 sessions below its best
    Then the row shows no "Flat" chip

  # Trend note under the 8-week chart
  Scenario: Rising effort
    Given average RPE rose 4 weeks running, from 8.0 to 8.7
    Then the note says "Effort has risen 4 weeks running (8.0 → 8.7)."

  Scenario: Rising effort needs at least 3 weeks
    Given average RPE rose only 2 weeks running
    Then the note says nothing about effort

  Scenario: Last light week
    Given the last week with working sets at or below 60% of normal was 5 weeks ago
    Then the note says "Your last light week was 5 weeks ago."

  Scenario: No light week in the 8 weeks
    Given no week in the last 8 was light
    Then the note says "No light week in the last 8 weeks."

  Scenario: Little effort data
    Given fewer than half of the working sets in those weeks have an RPE
    Then the note says nothing about effort

  Scenario: Not enough history
    Given the user has fewer than 3 weeks since their first workout
    Then no trend note is shown

  # API and agents
  Scenario: Records and lifts come with the week
    When the client requests GET /api/progress/week
    Then the response includes records, lifts and trend for that week
    And the numbers are raw (e1RM, previous best, sessions below best), with the wording done in the UI

  Scenario: Shapes at phone width
    Then at 390px the Records / Lifts folder and the trend note fit with no horizontal scroll, in light and dark

  # Lead decisions after tests 111 (2026-11-02)
  Scenario: The open current week is never called light
    Given the shown week is the current, unfinished week
    Then it is not counted when finding the last light week

  Scenario: A rep PR needs an earlier set at that rep count
    Given this week has a first ever 9-rep set of Bench Press
    Then it is not a Rep PR

  Scenario: e1RM PRs only count sets of 12 reps or fewer
    Given Calf Raise's best before this week was 135 lb x 15
    And this week they did 155 lb x 16
    Then Records does not list Calf Raise as a "PR"
    And Calf Raise still shows in Lifts
