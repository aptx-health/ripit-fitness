Feature: Progress tab, pinned lifts (S3)
  The user pins the lifts they track. The Lifts tab on the weekly report shows
  pinned lifts first, even in weeks they weren't done, then the rest of the
  week's lifts behind a toggle. Until the user edits their pins, the pins are
  their anchor lifts (training profile targetMovements). Pins are exercise
  definitions, kept in the user's order.

  Background:
    Given a signed-in user in timezone "America/Denver"

  # Defaults
  Scenario: Anchor lifts are the starting pins
    Given the user has never edited their pins
    And their anchor lifts are Back Squat, Bench Press and Deadlift
    Then the Lifts tab pins Back Squat, Bench Press and Deadlift, in anchor order

  Scenario: Anchor duplicates appear once
    Given Back Squat is an anchor for two patterns
    Then Back Squat is pinned once

  Scenario: No anchors and no pins
    Given the user has never edited their pins and has no anchor lifts
    Then the Lifts tab shows the week's lifts as before
    And it shows a "Pin lifts to track them here" hint with the pin action

  Scenario: Once edited, anchors no longer apply
    Given the user has unpinned every lift
    Then nothing is pinned, even though they have anchor lifts
    And later anchor changes do not change the pins

  # Lifts tab
  Scenario: Pinned lifts come first
    Given Back Squat and Bench Press are pinned
    And this week they did Back Squat, Leg Press and Pull-up
    Then the Lifts tab shows a "Pinned" group: Back Squat, then Bench Press
    And an "Also this week (2)" group with Leg Press and Pull-up, collapsed

  Scenario: A pinned lift not done this week
    Given Bench Press is pinned and was not done in the shown week
    And its last session before the week end was 185 lb x 8
    Then its row reads "Not this week" and "Last: 185×8 · e1RM 234 lb"

  Scenario: A pinned lift never done
    Given Front Squat is pinned and has never been logged
    Then its row reads "No sessions yet"

  Scenario: Past weeks use history up to that week
    When the user steps back to an earlier week
    Then a pinned lift's "Last" set comes only from sessions before that week ended

  Scenario: Pinned lifts keep the S2 numbers
    Given Overhead Press is pinned and is the 3rd session in a row below its best
    Then its pinned row shows the "Flat" chip as in S2

  # Pinning
  Scenario: Pin from a row
    When the user taps the pin on Leg Press in "Also this week"
    Then Leg Press moves to the end of the Pinned group
    And the pin is saved

  Scenario: Unpin from a row
    When the user taps the pin on a pinned Bench Press row
    Then Bench Press leaves the Pinned group
    And if it was done this week it shows under "Also this week"

  Scenario: Edit tracked lifts
    When the user opens "Edit tracked lifts"
    Then they can search all exercises and add one
    And remove a pinned lift
    And move a pinned lift up or down
    And saving keeps that order

  Scenario: Pin limit
    Given the user has 12 pinned lifts
    Then adding another is refused with "You can track up to 12 lifts"

  # API and data
  Scenario: Pins are per user
    Given another user pins Hack Squat
    Then this user's pins do not include it

  Scenario: The report carries pins
    When the client requests GET /api/progress/week
    Then the response includes the pinned lifts in order, each with this week's numbers or its last session before the week end

  Scenario: Saving pins
    When the client sends PUT /api/progress/pins with exercise definition ids in order
    Then unknown ids, duplicates or more than 12 are rejected with 400
    And the pins are replaced in that order

  Scenario: Phone width
    Then at 390px the pinned rows, pin buttons (48px targets) and the editor fit with no horizontal scroll, in light and dark
