Feature: Admin agents manage the shared exercise library
  An admin's agent (MCP token owned by an admin) can create and edit shared
  library exercises directly, and propose deletes and merges for Dustin to
  approve. Every direct change is recorded in Admin → Proposals as already
  applied, with before/after, and can be reverted there.
  Builds on: features/agent-tools/exercise-proposals.feature

  Background:
    Given Dustin is an admin with an agent token
    And the shared library contains "Barbell Bench Press"

  Rule: Only admin tokens see or use the library tools

    Scenario: Admin token lists the library tools
      When the agent lists its tools
      Then it sees "library_exercise_search", "library_exercise_create", "library_exercise_update", "propose_exercise_delete" and "propose_exercise_merge"
      And it still sees no tool that approves, rejects or reverts a proposal

    Scenario: Non-admin token
      Given a token owned by a regular user
      Then the library tools are not listed
      And calling one returns "forbidden" without checking its arguments

  Rule: Search shows usage before a change

    Scenario: Search returns definitions with usage
      When the agent searches the library for "bench"
      Then each result has id, name, aliases, equipment, primary and secondary muscles, whether it is shared or custom (and whose)
      And usage counts: users who logged it, logged sets, program exercises, saved workout exercises

  Rule: Create and update apply at once

    Scenario: Create a shared exercise
      When the agent creates "Cable Cross Upright Row" with equipment and primary muscles
      Then it is a shared library exercise every user can find
      And Admin → Proposals shows it as an applied "New library exercise" by that agent
      And the admin Discord notification says it was applied, not that it waits for review

    Scenario: Create as a personal custom exercise
      When the agent creates an exercise with scope "mine"
      Then it is Dustin's custom exercise, not shared

    Scenario: Duplicate name refused
      When the agent creates "barbell bench press"
      Then it gets an error naming the existing exercise and its id, and nothing is created

    Scenario: Update any library exercise
      When the agent changes the instructions of "Barbell Bench Press"
      Then the change is saved for every user
      And Admin → Proposals shows it applied, with before and after
      And the response includes the usage counts

    Scenario: Revert a direct change
      When Dustin reverts an applied library update in Admin
      Then the exercise returns to its before values
      And reverting an applied create removes the exercise if nothing uses it yet, otherwise the revert is refused with why

    Scenario: Invalid fields refused
      When the agent sends an unknown muscle or equipment value
      Then it gets the field and the reason, and nothing changes

  Rule: Delete and merge wait for Dustin

    Scenario: Propose deleting an unused exercise
      Given "Old Row" has no logged sets, program, saved workout, pin or preference uses
      When the agent proposes deleting it with a reason
      Then a pending "Delete exercise" proposal appears in Admin with the reason and its usage (all zero)
      And nothing is deleted until Dustin approves

    Scenario: Delete refused when in use
      Given "Old Row" has logged sets
      When the agent proposes deleting it
      Then it is refused with the usage counts and a hint to propose a merge instead

    Scenario: Usage appears between proposal and approval
      Given a pending delete for "Old Row"
      And someone logs "Old Row" before Dustin approves
      When Dustin approves
      Then the delete fails with why, nothing is removed, and the proposal shows the failure

    Scenario: Propose a merge
      When the agent proposes merging "DB Bench" into "Dumbbell Bench Press" with a reason
      Then a pending "Merge exercises" proposal shows both, the usage that would move, and the reason

    Scenario: Approve a merge
      When Dustin approves the merge
      Then every logged set, program exercise, saved workout exercise, pin and preference that used "DB Bench" now uses "Dumbbell Bench Press"
      And where a user already had a pin or preference on both, one remains and nothing errors
      And "DB Bench" is added to "Dumbbell Bench Press"'s aliases
      And "DB Bench" is deleted
      And it all happens in one transaction: on any failure nothing changes

    Scenario: Merge refusals
      Then merging an exercise into itself, into a missing exercise, or a shared exercise into someone's custom one is refused with why

    Scenario: Merge and delete are not revertable
      Then approved deletes and merges show no Revert button, and the confirm before approving says so

  Rule: Guard rails

    Scenario: Rate limited
      Then the library write tools are rate limited per token like the other proposal tools

    Scenario: Logged
      Then every library write and refusal is logged with the token, tool, exercise id and outcome
