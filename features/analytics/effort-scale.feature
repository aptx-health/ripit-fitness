Feature: Progress follows the user's effort scale (RPE or RIR)
  Progress shows effort in the scale the user picked in Settings
  (UserSettings.defaultIntensityRating). Sets logged in the other scale are
  converted (RIR = 10 − RPE), so switching the setting keeps all history.
  Agents (MCP, export) keep the raw numbers as logged.

  Scenario Outline: Effort numbers use the chosen scale
    Given my effort scale is <scale>
    When I open Progress and the lift page
    Then the effort tile, the weekly sets chart labels, the normal-range note and the lift page's per-session average all read "<label> <value>"
    Examples:
      | scale | label | value |
      | RPE   | RPE   | 8     |
      | RIR   | RIR   | 2     |

  Scenario: Mixed history is converted
    Given I logged some sets with RPE 8 and some with RIR 2
    Then with RPE chosen they average RPE 8, and with RIR chosen RIR 2

  Scenario: Distribution buckets in RIR
    Given my effort scale is RIR
    Then the effort buckets read RIR 4+, 3, 2, 1, 0 (the same sets as RPE ≤6, 7, 8, 9, 10)

  Scenario: Harder still reads as up
    Given my effort scale is RIR
    Then the trend and "effort has risen" note mean harder training, written in RIR ("RIR 3 → RIR 1")
    And the hard-week highlight (RPE 9+) is RIR 1 or less

  Scenario: Session rating follows the setting
    Given my effort scale is RIR and a session was rated RPE 7 at finish
    Then Progress shows it as RIR 3

  Scenario: Switching the setting
    When I change the effort scale in Settings and return to Progress
    Then every effort number shows in the new scale, with no reload needed beyond opening Progress

  Scenario: Agents get raw numbers
    Then MCP tools and the training export return rpe and rir as logged, not converted
