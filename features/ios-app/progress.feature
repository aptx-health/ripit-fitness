Feature: iOS slice 4 (stretch) - Progress on the phone
  Same numbers as the web Progress tab, computed on the phone from local data.
  Oracle: lib/insights/progress-records.ts, lift-history.ts, pinned-lifts.ts, progress.ts.

  Scenario: This week's report
    Given workouts logged this week and last week
    When I open Progress
    Then I see this week's workouts, sets and lifts as the web computes them for the same history

  Scenario: Records this week
    Given I beat my best weight for a rep count on a lift this week
    Then the record shows on this week's report, as the web would show it (rep PRs up to 12 reps, lbs/kg converted)

  Scenario: Trend note
    Given several weeks of history
    Then the trend note matches the web's computeTrendNote for the same history

  Scenario: Per-lift page
    When I open a lift
    Then I see its sessions, rep records and a chart for 3M, 6M, 1Y and All, matching lift-history.ts

  Scenario: Pinned lifts
    When I pin a lift
    Then it shows on Progress with its latest numbers, and stays pinned after relaunch
    And imported pinned exercises from a ripit-export file are pinned on the phone

  Scenario: Mixed units
    Given some sets in kg and some in lbs
    Then records and charts convert like the web (2.20462 lbs per kg) and show in my display unit
