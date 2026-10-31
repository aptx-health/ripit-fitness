Feature: Library
  The Library replaces Programs as the place to manage workouts and programs.
  Contract: initiatives/training-library/docs/spec.md ("TL3 Library")

  Rule: Library is a tab with workouts and programs

    Scenario: The nav shows Library instead of Programs
      When the user opens any page
      Then the nav shows Training, Library, Workout, Learn and Settings
      And Library is highlighted on the Library and on a program's detail page

    Scenario: Library opens on programs
      Given the user has programs
      When the user opens the Library
      Then they see "LIBRARY" with Programs selected and My Programs shown

    Scenario: Switching to workouts shows My Workouts
      Given the user has a saved workout "Push day"
      When the user switches the Library to Workouts
      Then they see My Workouts with "Push day"
      And there is no create action and no Browse

    Scenario: A first-time user lands on Browse
      Given the user has no programs
      When the user opens the Library
      Then Programs → Browse is shown

  Rule: My Programs is a plain collection

    Scenario: The active program is a normal entry with a badge
      Given the user has an active program "Machine Starter" in week 2 of 5 and another program "Old Split"
      When the user opens My Programs
      Then "Machine Starter" is listed first with ACTIVE and "Week 2 of 5"
      And "Old Split" is listed too
      And there is no separate active-program card

    Scenario: Opening a program from the Library
      When the user chooses View on "Old Split"
      Then they land on the "Old Split" detail screen
      And its back link returns to the Library

    Scenario: Create New Program is only on programs
      When the user opens My Programs
      Then "Create New Program" is shown

  Rule: Old addresses still work

    Scenario: The old Programs address redirects
      When the user opens the old Programs address with the Browse tab
      Then they land on the Library with Programs → Browse

    Scenario: The old saved workouts address redirects
      When the user opens the old saved workouts address
      Then they land on the Library with Workouts shown

    Scenario: Adding a community program still shows its progress
      When the user adds a community program from Browse
      Then the Library shows that program being added
