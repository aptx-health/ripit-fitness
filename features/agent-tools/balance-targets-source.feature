Feature: One source of truth for muscle-balance targets
  Settings, the target picker and agent proposals write
  UserMuscleBalanceSettings.targets. Everything that reads targets reads that
  same row, so an edit reaches the planner and the stats right away.
  UserTrainingProfile.ratioTargets is no longer read or written (the column
  stays until a later cleanup).

  Background:
    Given a user with a training profile created when targets were all 1.0

  Scenario: A Settings edit reaches the workout planner
    When the user sets quads to 1.4 in Settings
    Then the suggest-workout payload's ratio_targets has quads 1.4

  Scenario: A Settings edit reaches the aggregates' target shares
    When the user sets chest to 2.0 in Settings
    Then computed aggregates use chest weight 2.0 for its target share

  Scenario: An approved agent proposal reaches the planner
    When an agent's balance_targets.update proposal for hamstrings 1.2 is approved
    Then the suggest-workout payload's ratio_targets has hamstrings 1.2

  Scenario: The profile read shows the Settings targets
    When the user sets calves to 0.5 in Settings
    Then reading the training profile returns ratioTargets with calves 0.5

  Scenario: No settings row means the default targets
    Given the user has no muscle-balance settings row
    Then the planner and the aggregates use the default targets
    And reading targets does not create a settings row

  Scenario: Nothing writes the old copy
    When a profile is created, the profile is updated with ratioTargets, or a targets proposal is approved
    Then UserTrainingProfile.ratioTargets is not changed
    And a profile update with ratioTargets updates the settings targets instead

  Scenario: Anchor staleness ignores archived workouts
    Given an anchor exercise last logged in an archived workout 3 days ago
    And logged in a non-archived workout 20 days ago
    Then its staleness says 20 days

  Scenario: Anchor staleness looks past the last 50 workouts
    Given an anchor exercise last logged 60 workouts ago
    Then its staleness uses that date, not "never logged"
