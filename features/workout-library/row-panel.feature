Feature: Saved workout rows expand like program rows; quick Send
  The Workouts list on Library looks and works like My Programs: each row is
  collapsed (name, Pinned label, summary, chevron) and tapping it opens a
  panel of large buttons under the row. One row is open at a time. The
  pin star and the ⋯ menu on the row go away. Coaches also get a Send
  button on program and workout panels.

  Background:
    Given a signed-in user with saved workouts in the Pinned, New, Recent and Older groups

  # Collapsed rows
  Scenario: Rows start collapsed
    Then every workout row shows its name, a "Pinned" label when pinned, its summary and a right chevron
    And no row shows a pin star or a ⋯ menu

  Scenario: Tap to expand
    When the user taps a workout row
    Then a panel opens under it with the chevron turned down, styled like the program panel
    And tapping the same row again closes it
    And opening another row closes the first

  # Panel buttons
  Scenario: Panel buttons
    When the user opens a saved workout's panel
    Then it shows View, Start, Pin (or Unpin when pinned), Rename, Archive and Delete
    And each button is at least 48px tall

  Scenario: Buttons do what the old controls did
    Then View opens the workout detail, Start starts it, Pin/Unpin toggles the pin
    And Rename, Archive (with its Undo toast) and Delete (with its confirm) work as before

  Scenario: New workouts
    When the user opens a row in the New group
    Then the panel also shows Dismiss, which does what it did before (Pin moves a workout out of New)

  # Send (coaches only)
  Scenario: Send on a workout
    Given the user coaches at least one trainee
    When they open a workout's panel
    Then it shows Send, which opens the same send-to-trainee flow as the workout detail

  Scenario: Send on a program
    Given the user coaches at least one trainee
    When they open a program's panel on My Programs
    Then it shows Send next to View, Activate, Edit, Duplicate and Delete, opening the same send flow as the program page

  Scenario: No trainees, no Send
    Given the user coaches no one
    Then neither panel shows Send

  # Fit
  Scenario: Phone width
    Then at 390px the rows and panels fit with no horizontal scroll, in light and dark, and the panel buttons wrap like the program panel's

  # After the phone preview (Dustin, 2026-11-07)
  Scenario: Groups are distinct sections (option F, Dustin 2026-11-07)
    Then each group (New, Pinned, Recent, Older) starts with a section header: a small filled square with the group's count, the group name in the group's colour, and a thin line in that colour running to the right edge
    And the group's rows sit in their own bordered box under the header, with space between groups, not one shared grid
    And there is no tab shape, so the headers can't be mistaken for the Workouts/Programs folder tabs
    And the colours come from the theme's tokens and read in light, dark and E-INK

  Scenario: Older stays a dropdown
    Then Older's header (count square, "Older", a chevron, the line) is one 48px button, closed until tapped, and opens its rows in a box like the others
