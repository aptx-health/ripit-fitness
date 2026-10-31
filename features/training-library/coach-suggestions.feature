Feature: Coach Suggestions
  Agents suggest workouts, programs and training-target changes. The user
  reviews each suggestion in the app and accepts or rejects it. Nothing
  changes until they accept.
  Contract: initiatives/training-library/docs/spec.md ("TL5a Suggestions for users")

  Background:
    Given the user has an agent that made suggestions for them

  Rule: Training surfaces pending suggestions

    Scenario: The newest suggestion is shown first on Training
      Given the user has pending suggestions "Short Full-Body Workout" (newest) and "New 3-Day Strength Program"
      When the user opens Training
      Then the first section is "Coach Suggestions · 2"
      And "Short Full-Body Workout" is shown with its rationale and a Review button
      And "New 3-Day Strength Program" is listed below it
      And "View Suggestions" opens the list of suggestions

    Scenario: No section without pending suggestions
      Given the user has no pending suggestions
      When the user opens Training
      Then there is no Coach Suggestions section

    Scenario: Exercise-library suggestions stay in admin
      Given the agent proposed an exercise-library change for the user
      When the user opens Training or the suggestions list
      Then that proposal is not shown
      And opening it directly is not found

    Scenario: Another user's suggestion is not found
      When the user opens another user's suggestion
      Then it is not found

  Rule: Accepting puts the suggestion into the user's library

    Scenario: Accepting a workout suggestion
      Given the user has a pending workout suggestion "Push day"
      When the user reviews it and accepts
      Then "Push day" is in My Workouts
      And the suggestion is no longer pending

    Scenario: Accepting a program suggestion and making it active
      Given the user has a pending program suggestion "3-Day Strength"
      When the user accepts it and chooses Make active
      Then "3-Day Strength" is the active program
      And they land on its detail screen

    Scenario: Accepting a program suggestion without activating it
      Given the user has a pending program suggestion "3-Day Strength"
      When the user accepts it and chooses Not now
      Then "3-Day Strength" is in My Programs and not active

    Scenario: Accepting goes past the program cap
      Given the user already has 3 programs and a pending program suggestion
      When the user accepts it
      Then the user has 4 programs

    Scenario: Accepting a training-target suggestion
      Given the user has a pending suggestion to change their quads target
      When the user reviews it
      Then the change is shown with the muscle's display name, not its key
      And accepting it updates the target

    Scenario: A suggestion that no longer applies
      Given the user has a pending suggestion to rename "Push day" and then renamed it themselves
      When the user accepts the suggestion
      Then they are told it no longer applies
      And "Push day" keeps their name

  Rule: Rejecting removes the suggestion

    Scenario: Rejecting a suggestion
      Given the user has a pending workout suggestion "Push day"
      When the user rejects it
      Then nothing is added to My Workouts
      And the suggestion is gone from Training and the list

    Scenario: A decided suggestion can't be decided again
      Given the user accepted a suggestion
      When the user opens it again
      Then it shows "Accepted" without Accept or Reject
