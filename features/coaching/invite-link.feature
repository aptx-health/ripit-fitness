Feature: Coaching, slice 1: invite and link
  A coach (any signed-in user) invites a trainee with a link. The trainee
  accepts after signing in or signing up. Either side can end the link.
  Proposals can come from a coach link as well as from an agent token; this
  slice only adds that to the schema. Sending comes in slice 2.
  Note: initiatives/coaching/docs/136-discovery.md.

  Background:
    Given Dustin is signed in and his display name is "Dustin"

  # Schema
  Scenario: A proposal has exactly one sender
    Then a proposal has either an agent token or a coach link, never both and never neither
    And existing agent proposals, the admin proposal pages and /suggestions work as before

  # Invites
  Scenario: Make an invite
    When Dustin opens Settings → Coaching and taps "Invite a trainee"
    Then he gets a link /coach/invite/<token> with a Copy button and "Expires in 7 days"
    And the token is stored only as a hash, so the link can be copied only now (like agent tokens); open invites later show their expiry and Revoke, and a lost link means making a new invite

  Scenario: Revoke an invite
    When Dustin revokes an unused invite
    Then the link shows "This invite is no longer valid"

  Scenario: Invalid invites
    Then an expired, revoked, already used or unknown invite shows "This invite is no longer valid"
    And Dustin opening his own invite shows "You can't coach yourself"

  # Accepting
  Scenario: Accept while signed in
    Given Sam is signed in
    When Sam opens Dustin's invite
    Then Sam sees "Dustin wants to coach you", what Dustin will see ("only what they send you and whether you accept it"), and Accept / No thanks
    When Sam taps Accept
    Then Sam and Dustin are linked and the invite is used

  Scenario: Accept after signing up
    Given Sam has no account
    When Sam opens the invite, signs up and finishes onboarding
    Then Sam is brought back to the invite to accept it

  Scenario: Accept after signing in
    Given Sam has an account but is signed out
    When Sam opens the invite and signs in
    Then Sam is brought back to the invite to accept it

  Scenario: Already linked
    Given Sam is already linked to Dustin
    When Sam opens a new invite from Dustin
    Then it says they are already linked, and the invite stays unused

  # Coaching page
  Scenario: Coach's view
    Then Settings → Coaching (a row in the Account block) lists Dustin's open invites (expiry, Revoke) and his trainees (name, linked date, End)

  Scenario: Trainee's view
    Then Sam's Settings → Coaching lists "Your coach: Dustin" with End

  Scenario: End the link
    When either side taps End and confirms
    Then the link ends for both, and neither sees the other on Coaching
    And proposals already sent stay with Sam, pending ones included, for Sam to accept or decline

  # Safety
  Scenario: Scoped and rate limited
    Then every coaching route requires sign-in and only touches links the user is part of
    And making invites, accepting invites and ending links are rate limited and log errors

  Scenario: Phone width
    Then Coaching and the invite page fit at 390px with 48px tap targets, in light, dark and E-INK

  # After review 139 (Dustin, 2026-11-06)
  @work143
  Scenario: No display name
    Given a coach or trainee has no display name
    Then they are shown by the part of their email before "@" (e.g. "dmays wants to coach you"), never "Someone" or "Anonymous User"

  @work143
  Scenario: Waiver first
    Given a signed-in user who hasn't accepted the current waiver opens an invite
    Then they go to the waiver first and come back to the invite after agreeing
