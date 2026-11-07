Feature: Coaching, slice 2: send programs and workouts, and see what happened
  A coach sends one of their own programs or saved workouts to a linked
  trainee. It arrives as a proposal on the trainee's existing review screen,
  from the coach by name. Accepting gives the trainee their own copy. The coach
  sees only what they sent and its status. Builds on slice 1 (links), the
  workout library's origin/New group (#1043) and proposal supersets (#1042).
  Note: initiatives/coaching/docs/136-discovery.md.

  Background:
    Given Dustin coaches Sam

  # Sending
  Scenario: Send a program
    When Dustin opens one of his programs in Library and taps "Send to Sam"
    Then a sheet asks for an optional note and shows "Sam will get a copy to accept or decline"
    When he taps Send
    Then Sam has a pending program proposal with Dustin's program as it is now, and the note as its "Why"

  Scenario: Send a saved workout
    When Dustin sends a saved workout to Sam the same way
    Then Sam has a pending saved-workout proposal with its exercises, sets and supersets

  Scenario: Several trainees
    Given Dustin also coaches Alex
    Then "Send to…" asks which trainee first

  Scenario: No trainees
    Given Dustin coaches nobody
    Then there is no Send option

  Scenario: Custom exercises are refused
    Given the program uses "Dustin's Cable Fly", an exercise Dustin made
    When he tries to send it
    Then it is refused with "Sam doesn't have these exercises: Dustin's Cable Fly" and nothing is sent

  Scenario: A snapshot
    Given Dustin sent a program
    When he edits his program afterwards
    Then what Sam sees and gets does not change

  Scenario: Nothing goes to Dustin's channels
    Then a coach send never posts to Discord or Bark

  # Receiving
  Scenario: Sam sees who it's from
    Then on Training under "From your coach" and on the review screen it reads "From Dustin"
    And agent suggestions still read "From <agent name>"

  Scenario: Accept a workout
    When Sam accepts a saved workout from Dustin
    Then Sam has their own saved workout with origin "coach" in their New group, "From Dustin"

  Scenario: Accept a program
    When Sam accepts a program from Dustin
    Then Sam has their own program, which Dustin can't see or change

  Scenario: Decline
    When Sam declines
    Then nothing is added to Sam's account

  # What the coach sees
  Scenario: Sent list
    Then Settings → Coaching, under each trainee, lists what Dustin sent: name, kind, sent date and "Pending", "Accepted" or "Declined"
    And nothing about Sam's workouts, logs or Progress

  Scenario: After the link ends
    Given the link has ended
    Then Dustin can't send, Sam can still accept or decline pending items, and Dustin no longer sees the Sent list

  # Safety and fit
  Scenario: Scoped and rate limited
    Then only a coach on an active link can send to that trainee, only their own programs and workouts, rate limited and logged

  Scenario: Phone width
    Then the Send sheet, trainee picker and Sent list fit at 390px with 48px tap targets, in light, dark and E-INK
