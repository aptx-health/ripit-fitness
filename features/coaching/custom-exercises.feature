Feature: Coach sends carry their custom exercises
  A coach can send a program or saved workout that uses exercises they made.
  The send carries a snapshot of those exercise definitions. When the trainee
  accepts, they choose for each one: use an exercise of their own, or add a
  copy. Exercise names are unique app-wide, so a copy is named
  "<name> (from <coach first name>)"; the trainee can rename it later.
  Replaces "Custom exercises are refused" in send.feature.

  Background:
    Given Dustin coaches Sam on an active link
    And Dustin's program uses "Cable Fly", an exercise Dustin made, and "Barbell Bench Press" from the shared library

  # Sending
  Scenario: Send is allowed
    When Dustin sends the program
    Then it is sent, and the send carries a snapshot of "Cable Fly" (name, equipment, muscles, category, aliases, instructions, notes)
    And shared library exercises are not copied

  Scenario: Snapshot of the exercise
    Given Dustin sent the program
    When he edits or deletes "Cable Fly" afterwards
    Then what Sam is offered does not change

  # Accepting
  Scenario: The review screen lists the custom exercises
    When Sam opens the suggestion
    Then it lists "Cable Fly" as "Dustin's exercise" with a choice: "Add a copy" (default) or "Use one of mine"

  Scenario: Add a copy
    When Sam accepts with "Add a copy" for "Cable Fly"
    Then Sam has a custom exercise "Cable Fly (from Dustin)" with the snapshot's details, owned by Sam
    And the accepted program uses it wherever Dustin's used "Cable Fly"

  Scenario: Use one of mine
    When Sam picks "Use one of mine" and chooses "Pec Deck" from their own exercises or the shared library
    Then the accepted program uses "Pec Deck" there, and no copy is made

  Scenario: A later send reuses the copy
    Given Sam already added "Cable Fly (from Dustin)" from an earlier send
    When Sam accepts another send using "Cable Fly"
    Then "Add a copy" offers that existing copy ("You have this from an earlier send") instead of making a second one

  Scenario: Name already taken
    Given an exercise named "Cable Fly (from Dustin)" exists that isn't Sam's copy
    When Sam adds a copy
    Then the copy gets the next free name ("Cable Fly (from Dustin) 2")

  Scenario: All or nothing
    When anything fails while accepting
    Then no copy is created and nothing is added, and Sam sees why

  Scenario: Decline makes no copies
    When Sam declines
    Then no exercise is added to Sam's account

  Scenario: Agent suggestions unchanged
    Then agent proposals still refuse exercises the user can't see, as before
