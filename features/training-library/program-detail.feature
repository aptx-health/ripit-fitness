Feature: Program Detail
  Each program has its own detail screen showing its weeks. Only the active
  program can be trained from it; other programs are view-only.
  Contract: initiatives/training-library/docs/spec.md ("TL1 Program Detail")

  Background:
    Given a user with programs "Machine Starter" (active, 5 weeks) and "Old Split" (not active, 3 weeks)

  Rule: Every program the user owns has a detail screen

    Scenario: The active program opens at its current week
      Given "Machine Starter" week 1 is all completed or skipped and week 2 has an unfinished workout
      When the user opens the detail screen for "Machine Starter"
      Then it shows week 2 of 5
      And the user can start a workout and complete the week

    Scenario: A chosen week is shown
      When the user opens the detail screen for "Machine Starter" at week 4
      Then it shows week 4 of 5

    Scenario: A finished program opens at its last week
      Given every workout in "Old Split" is completed
      When the user opens the detail screen for "Old Split"
      Then it shows week 3 of 3

    Scenario: Another user's program is not found
      When the user opens the detail screen for another user's program
      Then the page is not found

    Scenario: A deleted program is not found
      Given "Old Split" was deleted
      When the user opens the detail screen for "Old Split"
      Then the page is not found

  Rule: Programs that aren't active are view-only

    Scenario: A non-active program can't be trained
      When the user opens the detail screen for "Old Split"
      Then its weeks and workouts are shown
      And there is no way to start or log a workout or complete a week
      And a "Make active to train" button is shown

    Scenario: Making it active from the detail screen
      When the user makes "Old Split" active from its detail screen
      Then "Old Split" is the active program
      And its detail screen lets the user train

    Scenario: An archived program has no Make active button
      Given "Old Split" is archived
      When the user opens the detail screen for "Old Split"
      Then its weeks are shown read-only without a "Make active to train" button

  Rule: Old addresses lead to the detail screen

    Scenario: Training opens the active program's detail for now
      When the user opens Training with week 3 and a workout to resume
      Then they land on the "Machine Starter" detail screen at week 3 with that workout resumed

    Scenario: Training without an active program
      Given the user has no active program
      When the user opens Training
      Then they see the no-active-program screen

    Scenario: The old program address redirects
      When the user opens the old program address for "Old Split"
      Then they land on the "Old Split" detail screen

    Scenario: Workout history links to the right program
      Given the user completed a workout in "Machine Starter"
      When the user follows that workout's program link in their history
      Then they land on the "Machine Starter" detail screen
