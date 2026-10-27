Feature: Agents propose new programs for Dustin to approve
  Agents can read an existing program in full and propose a whole new one:
  weeks, workouts, exercises and prescribed sets. Nothing is created until Dustin
  approves. Once approved it is an ordinary program: he edits or deletes it
  from Programs, and the proposal can't be reverted.
  Contract: initiatives/agent-tools/docs/spec.md ("Programs")

  Background:
    Given Dustin has an agent token named "mac-claude"
    And the exercise library contains "Barbell Bench Press" and "Back Squat"

  Rule: Agents can read a program in full

    Scenario: Reading one of Dustin's programs
      Given Dustin has a 2-week program "Base Strength"
      When the agent calls "get_program" for "Base Strength"
      Then it returns both weeks with their workouts, exercises and prescribed sets

    Scenario: Another user's program is not found
      Given another user has a program "Their Plan"
      When the agent calls "get_program" for "Their Plan"
      Then the tool returns a not-found error

  Rule: Proposing a program changes nothing until approved

    Scenario: Proposing a valid program
      When the agent proposes a 2-week program "Agent Block" using "Barbell Bench Press" and "Back Squat"
      Then a pending program proposal exists
      And Dustin has no program named "Agent Block"
      And Dustin is notified with a link to the proposal

    Scenario: A program that uses an unknown exercise is refused
      When the agent proposes a program that uses an exercise id that does not exist
      Then the tool returns an error naming the field "exerciseDefinitionId"
      And no proposal is created

    Scenario: A program with an empty workout is refused
      When the agent proposes a program with a workout that has no exercises
      Then the tool returns an error naming the field "exercises"
      And no proposal is created

    Scenario: A program with out-of-range effort is refused
      When the agent proposes a program with a set at RPE 11
      Then the tool returns an error naming the field "rpe"
      And no proposal is created

  Rule: Approving creates the program, inactive

    Scenario: Approving a program proposal
      Given a pending proposal for the 2-week program "Agent Block"
      When Dustin approves it
      Then Dustin has a program "Agent Block" with 2 weeks, its workouts, exercises and prescribed sets
      And the program is not active and is marked user-created
      And the proposal is applied

    Scenario: Approving fails cleanly when an exercise has since disappeared
      Given a pending proposal for the 2-week program "Agent Block"
      And "Back Squat" is deleted from the library
      When Dustin approves it
      Then the result code is "invalid"
      And Dustin has no program named "Agent Block"
      And the proposal is still pending

    Scenario: Rejecting a program proposal
      Given a pending proposal for the 2-week program "Agent Block"
      When Dustin rejects it
      Then the proposal is rejected
      And Dustin has no program named "Agent Block"

  Rule: An approved program is managed like any other program

    Scenario: Reverting a program proposal is refused
      Given Dustin approved the program "Agent Block"
      When Dustin reverts it
      Then the result code is "invalid"
      And Dustin still has the program "Agent Block"
      And the proposal is still applied
