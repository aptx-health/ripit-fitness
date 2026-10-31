Feature: Agents read and propose Dustin's anchors and muscle-balance targets
  Agents can see which anchor exercises Dustin has picked, his target for each
  functional unit (FAU), and how much volume each FAU got recently, as raw
  numbers. They can propose changes to anchors and targets. Nothing changes
  until Dustin approves, and an approved change can be reverted.
  Contract: initiatives/agent-tools/docs/spec.md ("Anchors and balance targets")

  Background:
    Given Dustin has an agent token named "coach"
    And the exercise library contains "Deadlift", "Romanian Deadlift", "Back Squat" and "Pull-up"

  Rule: Agents read anchors, targets and FAU volume

    Scenario: Reading anchors
      Given Dustin's hinge anchors are "Deadlift" and "Romanian Deadlift", and he last logged "Deadlift" 5 days ago
      When the agent calls "get_anchors"
      Then hinge lists both exercises, with "Deadlift" at 5 days and "Romanian Deadlift" never logged
      And the other 5 patterns are listed with no exercises

    Scenario: Default targets, and reading changes nothing
      Given Dustin has never saved muscle-balance settings
      When the agent calls "get_balance_targets"
      Then all 18 FAUs have target 1 and the targets are marked as defaults
      And no settings row has been created

    Scenario: FAU volume is raw set counts
      Given in the last 14 days Dustin logged 4 working sets of "Back Squat" and 2 warmup sets
      When the agent calls "get_fau_volume"
      Then quads shows 4 primary sets and glutes shows the squat's secondary sets
      And no FAU has a status, share or neglected label

    Scenario: Archived workouts and other users' training don't count toward volume
      Given another user logged "Back Squat" and one of Dustin's workouts is archived
      When the agent calls "get_fau_volume"
      Then only Dustin's unarchived sets are counted

  Rule: Anchor changes are proposed and approved

    Scenario: Proposing an anchor change changes nothing yet
      When the agent proposes hinge anchors "Romanian Deadlift"
      Then a pending anchor proposal exists, with the old hinge anchors recorded
      And Dustin's hinge anchors are unchanged

    Scenario: A bad anchor change is refused
      When the agent proposes 6 exercises for squat, or an unknown exercise for hinge
      Then the tool returns an error naming that pattern, and no proposal is created

    Scenario: Approving changes only the named patterns
      Given Dustin's squat anchor is "Back Squat" and a pending proposal sets hinge to "Romanian Deadlift"
      When Dustin approves it
      Then hinge is "Romanian Deadlift" and squat is still "Back Squat"

    Scenario: An anchor Dustin changed since the proposal is a conflict
      Given a pending proposal sets hinge to "Romanian Deadlift"
      And Dustin then changed his hinge anchors in Settings
      When Dustin approves it
      Then the result code is "conflict" and his hinge anchors are as he set them

    Scenario: Reverting an anchor change restores the old anchors
      Given Dustin approved a proposal that set hinge to "Romanian Deadlift"
      When Dustin reverts it
      Then hinge is back to "Deadlift" and "Romanian Deadlift"

  Rule: Target changes are proposed and approved

    Scenario: Proposing a target change changes nothing yet
      When the agent proposes quads 1.3 and hamstrings 1.2
      Then a pending target proposal exists, summarised as "quads 1 → 1.3, hamstrings 1 → 1.2"
      And Dustin's targets are unchanged

    Scenario: An out-of-range or off-step target is refused
      When the agent proposes quads 2.5, or quads 1.33
      Then the tool returns an error naming "quads", and no proposal is created

    Scenario: Approving changes only the named targets and never the calc settings
      Given Dustin set a 21-day lookback in Settings and a pending proposal sets quads to 1.3
      When Dustin approves it
      Then quads is 1.3, every other target is unchanged, and his lookback is still 21 days

    Scenario: Approving creates settings from the defaults when none exist
      Given Dustin has never saved muscle-balance settings and a pending proposal sets quads to 1.3
      When Dustin approves it
      Then quads is 1.3 and every other FAU and calc setting has its default

    Scenario: A target Dustin changed since the proposal is a conflict
      Given a pending proposal sets quads to 1.3
      And Dustin then set quads to 0.8 in Settings
      When Dustin approves it
      Then the result code is "conflict" and quads is still 0.8

    Scenario: Reverting a target change restores the old target
      Given Dustin approved a proposal that set quads from 1 to 1.3
      When Dustin reverts it
      Then quads is back to 1
