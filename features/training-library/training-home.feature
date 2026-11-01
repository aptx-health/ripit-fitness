Feature: Training home
  Training answers "what should I do next?" with sections that appear only
  when relevant: Up Next, Recent Workouts and Current Program. It works
  without an active program.
  Contract: initiatives/training-library/docs/spec.md ("TL2 Training home")

  Rule: Up Next shows the active program's next workout

    Scenario: The next unfinished workout is up next
      Given an active program "Machine Starter" where week 1 is done and week 2 day 1 "Full Body A" has 5 exercises
      When the user opens Training
      Then Up Next shows "Machine Starter", "Week 2 · Day 1", "Full Body A" and 5 exercises
      And "Start Workout" opens week 2 of "Machine Starter" with "Full Body A" resumed

    Scenario: Skipped workouts are passed over
      Given an active program where week 2 day 1 was skipped and day 2 is unfinished
      When the user opens Training
      Then Up Next shows week 2 day 2

    Scenario: A workout already in progress says Continue
      Given the user has a draft for the next workout of the active program
      When the user opens Training
      Then Up Next's button says "Continue"

    Scenario: No Up Next without an active program or when it's all done
      Given the user has no active program
      When the user opens Training
      Then there is no Up Next section
      And there is no Current Program section

  Rule: Recent Workouts make it easy to repeat something

    Scenario: The three newest completed sessions are shown
      Given the user completed 4 sessions, has a draft, abandoned a session and has an archived session
      When the user opens Training
      Then Recent Workouts shows the 3 newest completed sessions with their names, dates and durations

    Scenario: Repeating an ad-hoc session
      Given the user completed an ad-hoc session "Upper Body" with 2 exercises and 3 logged sets each
      When the user repeats "Upper Body"
      Then a new freeform session "Upper Body" is in progress with the same 2 exercises in order
      And each exercise plans 3 sets with the logged reps, RIR and RPE but no weight

    Scenario: Repeating a program session doesn't advance the program
      Given the user completed week 1 day 1 of the active program
      When the user repeats that session
      Then a new freeform session is in progress with its exercises
      And the program's progress is unchanged

    Scenario: Repeat is refused while another session is in progress
      Given the user has a session in progress
      When the user repeats a recent session
      Then it is refused because a session is already in progress
      And no new session is created

    Scenario: Another user's session can't be repeated
      When the user repeats another user's session
      Then it is not found

  Rule: Current Program is a compact summary

    Scenario: Current Program shows progress
      Given an active program "Machine Starter" with 5 weeks and 10 workouts, 3 completed or skipped, currently in week 2
      When the user opens Training
      Then Current Program shows "Machine Starter", "Week 2 of 5", "3 of 10 workouts done" and a progress bar
      And "View Program" opens its detail page

  Rule: Training works for everyone

    Scenario: A brand-new user sees a simple start
      Given the user has no programs and no sessions
      When the user opens Training
      Then they see "Start a workout" and "Find a program"

    Scenario: The home address always opens Training
      Given the user has finished onboarding and has no active program
      When the user opens the app's home address
      Then they land on Training

    Scenario: An old resume link still works
      When the user opens Training with a workout to resume
      Then they land on the active program's detail screen with that workout resumed
