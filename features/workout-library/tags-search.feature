Feature: Workout tags and search
  Saved workouts get the user's own tags, and Library → Workouts gets a search
  box and a row of tag chips, so a workout is easy to find.

  Background:
    Given I am signed in
    And I have saved workouts in Library → Workouts

  # --- Tagging ---

  Scenario: Tag a workout from its row menu
    When I choose "Tags…" from a workout's ⋮ menu
    Then a sheet shows my existing tags and the starter tags as chips
    And I can toggle chips on and off, or type a new tag and add it
    And when I close the sheet the workout's tags are saved and shown on its row

  Scenario: Starter tags
    Then the starter tags are "Push", "Pull", "Legs", "Upper", "Lower", "Full body", "Core", "Cardio" and "Quick"
    And a starter tag becomes one of my tags once I use it

  Scenario: Tags are tidied
    When I add " full  BODY "
    Then it is saved as "Full body" (trimmed, single spaces, matched without case to a tag I already have or a starter tag)
    And a new tag keeps the case I typed
    And the same tag is never on a workout twice

  Scenario: Tag limits
    Then a tag is at most 24 characters
    And a workout has at most 8 tags
    And I have at most 50 different tags in all
    And past a limit the sheet tells me which one and adds nothing

  Scenario: Remove a tag from everything
    When I remove the last workout using a tag
    Then that tag no longer shows as a chip

  # --- Finding ---

  Scenario: Search
    When I type in the search box on Library → Workouts
    Then only workouts whose name, notes or tags contain the text (any case) show
    And the groups (New, Pinned, Recent, Older) keep their order, hiding empty ones
    And Older opens by itself when it has a match
    And clearing the search brings everything back

  Scenario: Filter by a tag chip
    When I tap a tag chip above the list
    Then only workouts with that tag show
    And one chip is active at a time; tapping it again clears it
    And search and the chip combine

  Scenario: No matches
    When nothing matches
    Then I see "No workouts match" with a "Clear" button

  Scenario: Archived stays out
    Then search and chips never show archived workouts unless "Show archived" is on

  # --- Agents and coaches ---

  Scenario: Agents and coaches can tag, but only with existing tags
    When an agent or a coach sends a saved workout with tags
    Then tags I already have or starter tags are kept, matched as above
    And any other tag is dropped, and the response says which were dropped
    And list_saved_workouts returns each workout's tags and can filter by one tag

  Scenario: Tags are private
    Then my tags are only ever read or changed through my own account
    And tag changes are rate limited like other workout edits
