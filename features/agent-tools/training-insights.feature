Feature: Agents read training numbers to coach Dustin
  Agents get computed numbers from Dustin's logged training, so they can say
  things like "you seem to have stalled on preacher curls" or "most of this
  week was at RPE 9 or more; are you considering a deload?". The tools return
  raw numbers and averages only, with no verdicts or flags: the agent decides
  what counts as a stall or a hard week, and writes the words.
  Contract: initiatives/agent-tools/docs/spec.md ("Training insights")

  Background:
    Given Dustin has an agent token named "mac-claude"
    And the exercise library contains "Preacher Curl", "Back Squat" and "Barbell Bench Press"

  Rule: Stall numbers show each exercise's recent best sets

    Scenario: A flat exercise shows a small change and an old best
      Given Dustin logged "Preacher Curl" in 6 sessions over 5 weeks, with his best set staying within 2% and his best ever 4 sessions ago
      When the agent calls "get_stall_signals"
      Then "Preacher Curl" shows a change under 2%, 4 sessions since his best, and the 6-session series

    Scenario: Exercises are listed from the biggest drop to the biggest gain
      Given Dustin logged "Barbell Bench Press" dropping 5%, "Preacher Curl" flat and "Back Squat" rising 8%
      When the agent calls "get_stall_signals"
      Then they are listed bench press, preacher curl, back squat, with those change percents

    Scenario: Short history is reported as it is
      Given Dustin logged "Back Squat" in 1 session
      When the agent calls "get_stall_signals"
      Then "Back Squat" shows 1 session analysed and no change percent

    Scenario: Warmups, empty sets and units don't distort the numbers
      Given Dustin's "Preacher Curl" sessions include heavy warmup sets, sets at 0 weight, and some sessions logged in kg
      When the agent calls "get_stall_signals" for "Preacher Curl"
      Then only working sets count, and every e1RM is in lbs

    Scenario: Abandoned workouts don't count toward stall
      Given Dustin logged "Back Squat" in 5 completed sessions and 1 abandoned session with a much lighter best set
      When the agent calls "get_stall_signals"
      Then "Back Squat" shows 5 sessions analysed, none of them the abandoned one

    Scenario: Archived workouts and other users' training are ignored
      Given another user has logged "Back Squat"
      And one of Dustin's "Back Squat" workouts is archived
      When the agent calls "get_stall_signals"
      Then only Dustin's unarchived sessions are analysed

  Rule: The effort summary shows how hard each recent week was

    Scenario: A hard week shows its effort spread
      Given in the last 7 days Dustin logged 20 working sets, 14 of them at RPE 9 or 10
      When the agent calls "get_effort_summary"
      Then the latest week shows 20 working sets, 20 rated, 70% at 9 or more, the average effort, and the count at each RPE

    Scenario: Weeks are reported newest first, so a trend is visible
      Given Dustin's average effort was about 7 for three weeks and is about 8.5 this week
      When the agent calls "get_effort_summary"
      Then it returns 4 weeks, newest first, with those average efforts

    Scenario: Reps in reserve count as effort
      Given in the last 7 days Dustin logged sets with RIR 0 and no RPE
      When the agent calls "get_effort_summary"
      Then those sets count as effort 10

    Scenario: Bodyweight sets count toward effort
      Given in the last 7 days Dustin logged 6 pull-up sets at 0 weight and RPE 9, and 4 weighted sets at RPE 7
      When the agent calls "get_effort_summary"
      Then the latest week shows 10 working sets, 10 rated and 60% at 9 or more
      And an abandoned workout in that week still counts toward effort

    Scenario: Unrated sets show up as low coverage
      Given in the last 7 days Dustin logged 20 working sets but rated only 4 of them
      When the agent calls "get_effort_summary"
      Then the latest week shows 20 working sets, 4 rated and 20% coverage

    Scenario: A week with no training is empty, not zero effort
      Given Dustin logged nothing 2 weeks ago
      When the agent calls "get_effort_summary"
      Then that week shows 0 sessions and no average effort
