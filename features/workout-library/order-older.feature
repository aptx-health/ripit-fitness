Feature: Workout library, slice 1: order and the Older fold
  Library → Workouts stops being one flat list. Pinned first, then recently
  used, then a collapsed Older fold. No schema change. Later slices add
  search and tags (2), the New group for AI and coach workouts plus archive (3),
  and bulk tidy (4). Note: initiatives/workout-library/docs/141-discovery.md.

  Background:
    Given a signed-in user with saved workouts, today 2026-11-06

  Scenario: Groups in order
    Then Library → Workouts shows Pinned, then Recent, then a collapsed "Older (n)" fold
    And empty groups are not shown

  Scenario: Pinned first
    Given "Upper A" is pinned and was last used 60 days ago
    Then it shows under Pinned, not under Older

  Scenario: Recent
    Then Recent holds unpinned workouts used or created in the last 30 days, last used first
    And a workout that was saved but never started counts from when it was saved, so a just-approved AI workout is at the top of Recent, not the bottom

  Scenario: Older fold
    Given 12 unpinned workouts were last used (or, if never used, saved) more than 30 days ago
    Then they sit in a fold labelled "Older (12)", closed by default
    When the user opens it
    Then they show, last used first
    And nothing is deleted or archived automatically

  Scenario: Pinning and unpinning moves the row
    When the user pins a workout in Older
    Then it moves to Pinned without a reload
    When they unpin it
    Then it goes back to Recent or Older by its date

  Scenario: Training's quick actions
    Then the quick action sheet and Training show the same pinned workouts as before

  Scenario: Phone width
    Then at 390px the groups and fold fit with 48px tap targets, in light, dark and E-INK, and the fold header reads as a button
