Feature: Pinned workouts
  Users pin saved workouts so their informal routines are one tap away on
  Training. Pinned workouts still live in My Workouts.
  Contract: initiatives/training-library/docs/spec.md ("TL4 Pinned workouts")

  Background:
    Given the user has saved workouts "Upper Body", "Quick Machines" and "Mobility"

  Rule: Workouts are pinned from My Workouts

    Scenario: Pinning a workout
      When the user pins "Upper Body" in My Workouts
      Then "Upper Body" is marked as pinned
      And it appears under Pinned Workouts on Training

    Scenario: Unpinning a workout
      Given "Upper Body" is pinned
      When the user unpins "Upper Body"
      Then it is no longer marked as pinned
      And Training has no Pinned Workouts section

    Scenario: Pinning again keeps its place
      Given "Upper Body" was pinned before "Mobility"
      When the user pins "Upper Body" again
      Then "Mobility" is still listed before "Upper Body" on Training

    Scenario: Another user's workout can't be pinned
      When the user pins another user's saved workout
      Then it is not found

  Rule: Training shows the newest pins

    Scenario: The five newest pins are shown with Start
      Given the user has pinned 6 workouts
      When the user opens Training
      Then Pinned Workouts shows the 5 most recently pinned, newest first, each with its exercise count and Start
      And "See all" opens My Workouts

    Scenario: Starting a pinned workout
      Given "Quick Machines" is pinned
      When the user starts "Quick Machines" from Training
      Then a session from "Quick Machines" is in progress

    Scenario: Start is refused while another session is in progress
      Given "Quick Machines" is pinned and the user has a session in progress
      When the user starts "Quick Machines" from Training
      Then they are told a session is already in progress

    Scenario: Sections keep their order
      Given the user has an active program, a pinned workout and a completed session
      When the user opens Training
      Then the sections are Up Next, Pinned Workouts, Recent Workouts and Current Program, in that order
