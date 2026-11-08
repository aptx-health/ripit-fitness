Feature: iOS slice 8 - Exercise picker filters and custom exercises
  Find the right exercise fast, pick several at once, and add your own. Matches the web.
  Oracle: app/api/exercises/search/route.ts (match rules, FAU and equipment filters incl. "other", order),
  components/exercise-selection/ExerciseSearchInterface.tsx, FilterChoiceSheet.tsx,
  components/features/exercise-definition/ExerciseDefinitionEditorModal.tsx, EquipmentSelector.tsx, FAUSelector.tsx,
  app/api/exercise-definitions/route.ts and check-duplicate.

  Scenario: Search like the web
    When I search the picker
    Then the results and their order match the web's search for the same text, across name, aliases and the normalized name

  Scenario: Filter by muscle group
    When I pick a muscle group
    Then only exercises with it as a primary muscle show, as on the web, and I can clear it

  Scenario: Filter by equipment
    When I pick an equipment type (one at a time, as on the web)
    Then only exercises using it show, and "Other" matches every specialized type, as on the web

  Scenario: Search and filters together
    When I search and filter at once
    Then both apply, and the photos still show

  Scenario: Pick several at once
    When I tick several exercises and tap Add
    Then they're all added to the workout, in the order I picked them

  Scenario: Create a custom exercise
    Given a search finds nothing I want
    When I tap Create, starting from my search text as the name
    Then I can set its equipment, primary and secondary muscles and instructions
    And a name that already exists is flagged, as on the web
    And once saved it shows in search, can be added right away, and is marked as mine

  Scenario: Edit a custom exercise
    When I edit one of my exercises
    Then the change shows in search, in the logger and in history
    But built-in exercises can't be edited

  Scenario: Custom exercises everywhere
    Then my custom exercises work like built-in ones in the logger, Last time, History, Progress, saved workouts and programs
    And they survive a relaunch, and an import of a ripit export keeps them matched
