Feature: Agents compose saved workouts for Dustin
  Agents can read Dustin's saved workouts and his live session, and propose a
  new saved workout or a change to one. Nothing changes until Dustin approves,
  and an approved change can be reverted. Agents never write a live session.
  Contract: initiatives/agent-tools/docs/spec.md ("Saved workouts")

  Background:
    Given Dustin has an agent token named "coach"
    And the exercise library contains "Bench Press", "Overhead Press", "Pull-up" and "Back Squat"

  Rule: Agents read saved workouts and the live session

    Scenario: Listing and reading saved workouts
      Given Dustin has a saved workout "Push day" with "Bench Press" 3 sets of "8" at RIR 2
      And another user has a saved workout "Their day"
      When the agent calls "list_saved_workouts" and "get_saved_workout" for "Push day"
      Then the list shows only "Push day"
      And "Push day" shows "Bench Press" with 3 sets of "8" at RIR 2

    Scenario: Another user's saved workout is not found
      When the agent calls "get_saved_workout" with the other user's saved workout id
      Then the call fails with "not found"

    Scenario: Reading the live session changes nothing
      Given Dustin is in the middle of a session with 2 logged sets of "Bench Press"
      When the agent calls "get_active_draft"
      Then it shows that session with "Bench Press" and 2 logged sets
      And the session is unchanged

    Scenario: Read tools are marked read-only
      When the agent lists the tools
      Then every read tool is marked read-only
      And the propose tools are not

  Rule: New saved workouts are proposed and approved

    Scenario: Proposing a new saved workout changes nothing yet
      When the agent proposes a saved workout "Push day" with "Bench Press" 3 sets of "8" and "Overhead Press" 3 sets of "10"
      Then a pending proposal "New saved workout: Push day (2 exercises)" exists
      And Dustin has no saved workouts

    Scenario: A bad saved workout is refused
      When the agent proposes a saved workout with an exercise that doesn't exist, another user's exercise, no exercises, or a set with RIR 11
      Then each proposal is refused, naming the bad field
      And no proposal is created

    Scenario: Approving creates the saved workout
      Given the agent proposed a saved workout "Push day" with "Bench Press" 3 sets of "8" at RIR 2
      When Dustin approves it
      Then Dustin has a saved workout "Push day" with 1 exercise, "Bench Press", 3 sets of "8" at RIR 2
      And no session was started

    Scenario: Reverting a new saved workout deletes it
      Given Dustin approved a proposed saved workout "Push day"
      When Dustin reverts it
      Then Dustin has no saved workouts

    Scenario: A saved workout Dustin has started can't be reverted
      Given Dustin approved a proposed saved workout "Push day" and started it
      When Dustin reverts it
      Then the revert is refused as a conflict
      And "Push day" and the started session still exist

  Rule: Changes to saved workouts are proposed and approved

    Scenario: Proposing a change changes nothing yet
      Given Dustin has a saved workout "Push day" with "Bench Press"
      When the agent proposes renaming it "Push A" and replacing its exercises with "Overhead Press" 4 sets of "6"
      Then a pending proposal "Update saved workout Push day: name, exercises" exists
      And "Push day" is unchanged

    Scenario: Approving changes only the named fields
      Given Dustin has a saved workout "Push day" with notes "Heavy" and "Bench Press"
      And the agent proposed replacing its exercises with "Overhead Press" 4 sets of "6"
      When Dustin approves it
      Then "Push day" has "Overhead Press" 4 sets of "6" and still has notes "Heavy"

    Scenario: A field changed since the proposal is a conflict
      Given the agent proposed renaming "Push day" to "Push A"
      And Dustin then renamed it "Push B" himself
      When Dustin approves the proposal
      Then the proposal is marked as a conflict
      And the saved workout is still named "Push B"

    Scenario: A saved workout deleted since the proposal is a conflict
      Given the agent proposed renaming "Push day" to "Push A"
      And Dustin then deleted "Push day"
      When Dustin approves the proposal
      Then the proposal is marked as a conflict

    Scenario: Reverting a change restores the named fields
      Given Dustin approved renaming "Push day" to "Push A" and replacing its exercises
      When Dustin reverts it
      Then the saved workout is named "Push day" with its original exercises again

    Scenario: Another user's saved workout can't be changed
      When the agent proposes a change to the other user's saved workout
      Then the call fails with "not found"
      And no proposal is created
