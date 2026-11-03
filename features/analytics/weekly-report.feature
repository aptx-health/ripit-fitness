Feature: Progress tab, weekly report (S1)
  The Progress tab replaces Learn. It shows one week at a time as a report
  card, compared with the user's normal (the average of up to 8 weeks before
  it, counting only weeks since the user's first workout), plus the last 8 weeks of working sets. Weeks run Monday to Sunday in
  the user's local timezone (sent by the browser). The streak counts weeks in
  a row that hit the user's weekly workout target, a setting.

  Background:
    Given a signed-in user in timezone "America/Denver"
    And their weekly workout target is 3

  # Navigation
  Scenario: Progress replaces Learn in the nav
    Then the bottom nav shows Training, Library, Workout, Progress, Settings
    And no nav item links to /learn

  Scenario: Old Learn links go to Progress
    When the user opens /learn or /learn/some-article
    Then they land on /progress

  Scenario: The beginner primer has no Learn links
    Then the beginner primer wizard links to no /learn page

  # Weeks
  Scenario: A Sunday-evening workout counts in its local week
    Given a workout completed Sunday 21:00 local (Monday 03:00 UTC)
    Then it counts in the week that started the Monday before

  Scenario: Week navigator
    When the user opens Progress
    Then it shows the current week, titled "Week of <Monday>"
    And "previous" shows the week before
    And "next" is disabled on the current week

  Scenario: Active program week in the subtitle
    Given the week falls in an active program's week 3 named "Strength Block"
    Then the subtitle reads "Week 3 of Strength Block"

  # Report card
  Scenario: Workouts against the target
    Given 3 completed workouts this week
    Then the Workouts row reads "3 of 3" and is marked done
    And it shows the normal as the average workouts of the 8 weeks before

  Scenario: Working sets against normal
    Given 66 working sets this week and an 8-week average of 58
    Then the Working sets row shows 66 and "+14%" with "normal 58"
    And warm-up sets are not counted

  Scenario: Time trained
    Given workouts totalling 3h 22m and 35 minutes of cardio this week
    Then the Time trained row shows "3h 22m" and "+ 35m cardio"
    And a workout without a duration uses completedAt minus startedAt, or counts as 0 when neither is known

  Scenario: Effort
    Given rated working sets this week averaging RPE 8.7, with 31% at 9 or more and 2 at 10
    Then the Effort row shows "RPE 8.7", "31% of sets at 9+ · 2 sets at 10" and the change from normal
    And RIR is read as RPE 10 minus RIR

  Scenario: Too few rated sets hides the effort number
    Given fewer than half of this week's working sets have RPE or RIR
    Then the Effort row says effort isn't tracked enough this week instead of a number

  Scenario: Streak
    Given the last 6 full weeks each had 3 or more workouts and the week before had 1
    Then the Streak row shows "6 weeks"
    And the current week adds to the streak only once it hits the target

  Scenario: Archived and unfinished workouts don't count
    Given an archived completed workout and a draft workout this week
    Then neither counts toward workouts, sets, time or effort

  Scenario: Normal only counts weeks since the first workout
    Given the user's first workout was 3 weeks before the selected week
    Then normal averages those 3 weeks, not 8
    And a week after a gap still counts the gap weeks as 0
    And with no week before the selected one, normal shows "–"

  Scenario: Empty week
    Given no workouts this week
    Then the report card shows 0 workouts and "–" where there is nothing to compare

  # Last 8 weeks
  Scenario: Last 8 weeks chart
    Then a bar chart shows working sets for the 8 weeks ending with the selected week
    And each bar has its average RPE beneath it, or "–" when effort isn't tracked enough
    And the selected week's bar is highlighted

  # Setting
  Scenario: Weekly target setting
    When the user sets the weekly workout target to 4 in Settings
    Then the Workouts row reads "of 4" and the streak uses 4
    And the target accepts whole numbers from 1 to 14, default 3

  # Safety
  Scenario: Only your own data
    Given another user's workouts in the same week
    Then they don't count
