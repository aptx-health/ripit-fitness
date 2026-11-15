Feature: Admin quick panel
  An admin-only panel reached from a small tab on the right edge of the app,
  starting with touch indicators for recording tutorials. Later options
  (theme switch, build info, bug report with screenshot) will be added here.

  Background:
    Given I am signed in

  # --- The tab and the panel ---

  Scenario: Admins see the tab; nobody else does
    Given I am an admin
    Then a small tab shows on the right edge of every app page
    But a user or editor who is not an admin never sees the tab or the panel

  Scenario: The tab opens a side drawer
    Given I am an admin
    When I tap the edge tab
    Then a drawer titled "Admin" slides in from the right over the page
    And it closes with its X, a tap on the dimmed page, or Escape
    And the page under it is unchanged

  Scenario: The tab works over the loggers and sheets
    Given I am an admin
    And a workout logger or a sheet is open
    Then the edge tab still shows above it and still opens the panel

  # --- Touch indicators ---

  Scenario: Touch indicators show where I tap
    Given I am an admin
    When I turn on "Touch indicators" in the panel
    Then each tap anywhere in the app shows a ring at that spot that fades out
    And the ring never blocks or changes what the tap does

  Scenario: Drag trail
    Given touch indicators are on with the style "Trail"
    When I drag my finger
    Then a short fading trail follows it, ending in the ring

  Scenario: The tab stays out of the recording
    Given touch indicators are on
    Then the edge tab shrinks to a faint sliver on the edge
    And tapping the sliver still opens the panel

  Scenario: My choices stick on this device
    Given I turned on touch indicators and chose a style
    When I reload the app
    Then touch indicators are still on with that style
    And other devices are not affected
