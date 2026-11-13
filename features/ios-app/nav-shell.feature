Feature: iOS slice 9a - The web's bottom bar and quick actions
  The phone's navigation matches the web: Training · Library · Workout · Progress · Settings, drawn like the web's bar.
  Oracle: components/BottomNav.tsx, lib/nav/active-tab.ts, components/QuickActionSheet.tsx, globals.css (chip, pulse);
  initiatives/ios-app/logger-nav-discovery.md §3-5, 7-8. Dustin 2026-11-10: custom bar, no History tab (History under Training › Recent).

  Scenario: The bar looks and reads like the web's
    Given the app is open
    Then the bottom bar shows Training, Library, a raised Workout button, Progress and Settings, styled like the web
    And the active tab is in the accent colour
    And its background fills the home-indicator area, with nothing scrolling beneath it

  Scenario: Each tab keeps its place
    Given I open a program in Library
    When I switch to Progress and back
    Then the program is still open
    And tapping the active tab returns it to its first screen

  Scenario: History lives under Training
    Then there is no History tab
    And Training › Recent lists finished workouts, with "See all" opening the full history list
    And the import button and the in-progress card are still reachable

  Scenario: Programs live under Library
    When I open Library
    Then it has Workouts | Programs, and Programs shows my programs as Training did before

  Scenario: Quick actions with no open workout
    Given no workout is open
    When I tap Workout
    Then a Quick Actions card shows Continue your program (Week · Day · name), Freestyle workout, and My saved workouts with its count when I have any
    And with no active program, Continue shows "No active program" and can't be tapped

  Scenario: Quick actions with an open workout
    Given a workout is open
    When I tap Workout
    Then only that workout shows, "In progress · tap to resume", with a discard button that needs a second tap within 4 seconds
    And a footer explains why the other actions are hidden

  Scenario: Quick actions start or resume
    When I choose Continue, Freestyle, Resume or My saved workouts
    Then the program's next workout, an empty freestyle workout, the open workout, or Library › Workouts opens

  Scenario: The Workout button shows an open workout
    Given a workout is open
    Then the Workout button pulses, unless reduce motion or E-ink is on
    And VoiceOver reads "Resume draft workout: {name}"

  Scenario: Largest text, VoiceOver and the keyboard
    Then at the largest text size the bar keeps its height, and a long press on a tab shows its label large
    And VoiceOver reads each tab as a button, selected or not
    And typing in a field on a tab screen doesn't push the bar up over the keyboard

  Scenario: After finishing a workout
    When I finish a workout and close the summary
    Then I land on Training, not Library
