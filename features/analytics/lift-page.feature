Feature: Progress, per-lift page (mockup B)
  Tapping any lift row on the Progress tab's Lifts tab opens
  /progress/lift/[exerciseDefinitionId]: one lift's history as a chart with
  three tabs (e1RM, Top set, Volume), its rep records and its sessions. It
  follows S2's rules: only completed, non-archived workouts and working sets
  (not warmups) count; e1RM is the Epley estimate of a session's best set, from
  sets of 12 reps or fewer; weights are shown in the user's unit; weeks are
  local Monday to Sunday. The lib layer returns raw numbers; the UI words them.
  Mockup: initiatives/analytics/docs/discovery/ideas/b-exercise.html.

  Background:
    Given a signed-in user in timezone "America/Denver"
    And Back Squat has 19 sessions since June

  # Getting there
  Scenario: Tap a lift row
    When the user taps Back Squat on the Lifts tab, pinned or not
    Then /progress/lift/<Back Squat's id> opens with "Back Squat" as its title

  Scenario: Back returns to the same week
    Given the Progress tab was showing an earlier week
    When the user opens a lift and goes back
    Then the Progress tab shows that same week

  Scenario: Switch between pinned lifts
    Given Back Squat, Bench Press and Deadlift are pinned
    Then the lift page shows a chip per pinned lift, with the current one marked
    And tapping a chip opens that lift's page

  Scenario: A lift that isn't the user's
    When the user opens the page for an exercise that doesn't exist or is another user's private exercise
    Then they see "Lift not found" and a way back to Progress

  Scenario: A lift with no sessions
    Given Front Squat is pinned and has never been logged
    When the user opens its page
    Then it shows "No sessions yet" instead of the chart, records and sessions

  # Chart: e1RM tab (the default)
  Scenario: e1RM over time
    Then the e1RM tab plots each session's best e1RM as a line
    And a dashed line shows each session's top-set weight
    And the session that set the all-time best e1RM is marked "all-time PR"

  Scenario: e1RM tiles
    Given the best e1RM is 287 lb, set Oct 30
    And the first session in the range had 265 and the last had 287
    Then the tiles read "Best e1RM 287 lb · Oct 30", "<range> +8.3% 265 → 287" and "Sessions 19 since Jun"

  Scenario: Ranges
    Then the ranges are 3M, 6M, 1Y and All, and 6M is selected first
    When the user picks a range
    Then the chart, the change tile and the sessions tile cover only that range

  Scenario: Long ranges plot one point per week
    When the user picks 1Y or All
    Then the chart plots each week's best, not every session

  Scenario: One session in the range
    Given only one session falls in the range
    Then the chart shows a single point and the change tile shows "—"

  # Chart: Top set tab
  Scenario: Top set over time
    When the user picks the Top set tab
    Then it plots each session's heaviest working set weight, with its reps
    And its tiles read "Heaviest 275 lb × 4 · Oct 30", the change over the range, and sessions

  # Chart: Volume tab
  Scenario: Volume over time
    When the user picks the Volume tab
    Then it shows working sets of Back Squat per week as bars, weeks with none shown as empty
    And its tiles show average sets per week and total sets in the range, and sessions

  # Bodyweight lifts
  Scenario: Bodyweight lifts chart reps
    Given Pull-up is only logged at bodyweight (weight 0)
    Then its first tab is "Reps", plotting each session's best reps, with "Best 12 reps · <date>"
    And the Top set tab is not shown; the Volume tab is

  # Records
  Scenario: Rep records
    Then Records lists the heaviest working set at each rep count from 1 to 12 that the user has done, with its date
    And rep counts never done are left out

  Scenario: New record
    Given the 4-rep record was set this week
    Then the 4 reps row shows a "New" chip

  Scenario: Bodyweight records
    Given Pull-up is only logged at bodyweight
    Then Records shows the most reps in one set, with its date

  # Sessions
  Scenario: Session list
    Then Sessions shows the count (19) and the 10 newest sessions, newest first
    And each row shows the date, the working sets ("275×4 · 255×6 · 255×6"), the average RPE when sets were rated, and the session's e1RM

  Scenario: More sessions
    When the user taps "Show more"
    Then the next 10 sessions appear

  # API and agents
  Scenario: Lift history API
    When the client requests GET /api/progress/lift/<id>
    Then it returns the lift's name, unit, sessions (date, working sets, best e1RM, top set) and rep records as raw numbers
    And it is rate limited, scoped to the signed-in user, and logs errors

  # Fit
  Scenario: Phone width
    Then at 390px the page fits with no horizontal scroll, every tap target is at least 48px tall, in light and dark

  # After review 127 (Dustin, 2026-11-02)
  Scenario: Lifts trained above 12 reps open on Top set
    Given every Calf Raise set is 13 reps or more
    Then its page opens on the Top set tab
    And the e1RM tab says "No e1RM: sets over 12 reps" instead of "No sessions in this range"

  Scenario: The Progress row agrees
    Given this week's best Calf Raise set is 155 lb x 16
    Then its Lifts row reads "155×16" with no e1RM and no e1RM change

  Scenario: Records include high-rep sets
    Given Calf Raise's heaviest 15-rep set is 135 lb
    Then Records lists "15 reps 135 lb" with its date, for any rep count the user has done

  Scenario: Browser back keeps the week
    Given the user stepped back to an earlier week on Progress
    When they open a lift and use the phone or browser back
    Then Progress shows that same week

  Scenario: Volume counts only the range
    Then the Volume tiles count only sets on or after the range start, like the Sessions tile

  Scenario: Weighted lifts ignore bodyweight sessions on weight charts
    Given Pull-up has weighted sessions and bodyweight sessions
    Then the Top set chart and the top-set line leave out the weight-0 sessions

  Scenario: Chart fill
    Then the line charts have a light fill under the line in the folder's colour

  # After the phone preview (Dustin, 2026-11-02)
  Scenario: A skeleton shows at once
    When the user taps a lift row or a pinned chip
    Then the lift page's skeleton (title, chips, chart folder, records and sessions placeholders) shows immediately
    And it is replaced by the real page when the data arrives, with no layout jump
