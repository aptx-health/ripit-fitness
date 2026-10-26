Feature: Agents propose exercise database changes for Dustin to approve
  Agents can read training data and propose exercise changes through MCP tools.
  Nothing changes until Dustin approves, and approved changes can be undone.
  Contract: initiatives/agent-tools/docs/spec.md

  Background:
    Given Dustin has an agent token named "mac-claude"
    And the exercise library contains "Barbell Bench Press"

  Rule: Agents authenticate with a personal access token

    Scenario: A valid token identifies Dustin
      When the token is resolved
      Then it resolves to Dustin
      And the token's last-used time is recorded

    Scenario: A revoked token is refused
      Given the "mac-claude" token has been revoked
      When the token is resolved
      Then it resolves to nobody

    Scenario: The agent tool list has no way to approve its own proposals
      When the agent lists its tools
      Then it sees "propose_exercise_create" and "propose_exercise_update"
      And it sees no tool that approves, rejects or reverts a proposal

  Rule: Agents can read Dustin's data

    Scenario: Searching the exercise library
      When the agent calls "search_exercises" with query "bench"
      Then the results include "Barbell Bench Press"

    Scenario: Reading recent workout history
      Given Dustin completed a workout with 3 logged sets of "Barbell Bench Press"
      And another user completed a workout
      When the agent calls "get_workout_history"
      Then it returns Dustin's workout with its 3 logged sets
      And it does not return the other user's workout

  Rule: Proposals change nothing until approved

    Scenario: Proposing a new exercise
      When the agent proposes creating "Larsen Press" with a rationale
      Then a pending proposal exists for "Larsen Press"
      And the exercise library does not contain "Larsen Press"
      And Dustin is notified with a link to the proposal

    Scenario: An invalid proposal is refused
      When the agent proposes creating an exercise with an unknown muscle group
      Then the tool returns a validation error naming the field
      And no proposal is created

    Scenario: A duplicate exercise is refused
      When the agent proposes creating "Barbell Bench Press"
      Then the tool returns an error that points to the existing exercise
      And no proposal is created

    Scenario: A notification failure does not block the proposal
      Given notifications are failing
      When the agent proposes creating "Larsen Press" with a rationale
      Then a pending proposal exists for "Larsen Press"

  Rule: Dustin decides

    Scenario: Approving a new exercise
      Given a pending proposal to create "Larsen Press"
      When Dustin approves it
      Then the exercise library contains "Larsen Press"
      And the proposal is applied

    Scenario: Approving an update changes only the proposed fields
      Given a pending proposal to change the notes of "Barbell Bench Press"
      When Dustin approves it
      Then the notes of "Barbell Bench Press" are updated
      And its other fields are unchanged

    Scenario: An update that went stale is not applied
      Given a pending proposal to change the notes of "Barbell Bench Press"
      And "Barbell Bench Press" was edited after the proposal was made
      When Dustin approves it
      Then the proposal is marked as a conflict
      And "Barbell Bench Press" keeps the later edit

    Scenario: Rejecting a proposal
      Given a pending proposal to create "Larsen Press"
      When Dustin rejects it
      Then the proposal is rejected
      And the exercise library does not contain "Larsen Press"

    Scenario: A proposal is applied only once
      Given a pending proposal to create "Larsen Press"
      And Dustin has approved it
      When Dustin approves it again
      Then it is refused because the proposal is not pending

  Rule: Approved changes can be undone

    Scenario: Reverting an applied update
      Given an applied proposal changed the notes of "Barbell Bench Press"
      When Dustin reverts it
      Then "Barbell Bench Press" has its original notes
      And the proposal is reverted

    Scenario: Reverting an update is refused when the exercise changed afterwards
      Given an applied proposal changed the notes of "Barbell Bench Press"
      And "Barbell Bench Press" was edited after the proposal was applied
      When Dustin reverts it
      Then it is refused because the exercise changed since it was applied
      And "Barbell Bench Press" keeps the later edit
      And the proposal is still applied

    Scenario: Reverting an unused new exercise removes it
      Given an applied proposal created "Larsen Press"
      When Dustin reverts it
      Then the exercise library does not contain "Larsen Press"

    Scenario: Reverting a new exercise already used in a workout is refused
      Given an applied proposal created "Larsen Press"
      And "Larsen Press" is used in one of Dustin's workouts
      When Dustin reverts it
      Then it is refused because the exercise is in use
      And the exercise library still contains "Larsen Press"
