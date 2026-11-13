Feature: iOS slice 7 - Settings and the web's look
  A Settings tab, all 13 web themes, and the iOS screens restyled to match the web closely.
  Oracle: lib/theme.ts, app/globals.css ([data-theme] tokens, display font rules, [data-display="eink"]),
  lib/display.ts, components/settings/*Block.tsx, ThemePicker.tsx, components/ui folder/tab blocks.

  Scenario: Settings tab
    When I open Settings
    Then I see blocks like the web's: Look, Workouts, Training targets, Help
    And every change saves right away and stays after relaunch

  Scenario: Themes
    When I pick any of the web's 13 themes and light or dark
    Then every screen uses that theme's colors, the same values as the web's tokens for that theme and mode
    And E-ink offers no dark mode, as on the web (a stored dark choice reads as light)
    And a new install starts on RIPIT, dark, as the web does

  Scenario: E-ink display switch
    When I turn on E-ink display (with any theme)
    Then motion is off and text is bolder, as the web does
    And iOS's own Reduce Motion setting also turns motion off

  Scenario: Workout settings
    When I set intensity tracking on or off, the default rating type (RPE or RIR), my default weight unit and my weekly target
    Then the logger follows them: no effort picker when tracking is off, the default type when on, the default unit on new sets
    And Progress uses the weekly target (it moves here from the Progress sheet)
    And the RPE/RIR switch leaves the workout header

  Scenario: Help
    When I open Help in Settings
    Then I can open Learn on ripit.fit, send feedback by email, and see the app version

  Scenario: The web's type
    Then labels, buttons, tab titles and headings use the web's display font (Rajdhani, bundled) in uppercase with the web's letter spacing
    And body text and numbers stay easy to read, as on the web

  Scenario: The web's shapes
    Then cards, buttons, inputs and chips have square corners
    And primary buttons have the web's hard offset shadow
    And bordered folder panels look like the web's

  Scenario: Folder tabs that switch
    Then Training (Up Next | Active Program, Pinned | Recent), Progress (Records | Lifts) and the exercise sheet (Info | Notes | History) use folder tabs that switch in place, as on the web, instead of stacking

  Scenario: Native where it matters
    Then sheets, alerts, the keyboard and the tab bar stay native iOS
    And touch targets stay 44pt or larger

  Scenario: Largest text size
    Then every screen reads without words breaking mid-word at the largest accessibility size, including the program title, the superset badge and the logger's info and menu buttons
