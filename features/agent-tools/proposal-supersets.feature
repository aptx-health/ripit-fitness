Feature: Proposals keep supersets
  Program and saved-workout proposals (from agents now, coaches later) can
  group exercises into supersets, and approving keeps the grouping, the same
  way programs made in the app do (`exerciseGroup` on each exercise).

  Scenario: Agent proposes a superset
    Given an agent proposes a program whose day has Bench Press and Row in group "A"
    When the user approves it
    Then the created workout's Bench Press and Row share an exerciseGroup and the logger shows them as a superset

  Scenario: Saved workout proposals too
    Given an agent proposes a saved workout with two exercises in group "A"
    When the user approves it
    Then the saved workout keeps the group, and starting it keeps the superset

  Scenario: Groups are checked
    Then a group label is 1–3 letters, a group needs at least two exercises in the same workout, and grouped exercises sit next to each other
    And a proposal that breaks this is refused as invalid with the reason

  Scenario: Review screen shows it
    Then the suggestion review and the admin proposal page show grouped exercises together, labelled as a superset

  Scenario: Agents know about it
    Then the MCP tool descriptions for propose_program_create, propose_workout_create and propose_workout_update describe the optional group field

  Scenario: Old proposals still work
    Then proposals without groups behave exactly as before
