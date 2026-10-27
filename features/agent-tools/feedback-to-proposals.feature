Feature: Agents turn Dustin's feedback into proposals
  Agents can read Dustin's feedback and link a proposal to the feedback it addresses.
  Approving that proposal resolves the feedback. Agents still cannot change feedback directly.
  Contract: initiatives/agent-tools/docs/spec.md ("Feedback")

  Background:
    Given Dustin has an agent token named "mac-claude"
    And the exercise library contains "Barbell Bench Press"
    And Dustin left new bug feedback "Bench press is missing the bp alias"

  Rule: Agents can read Dustin's feedback

    Scenario: Listing new feedback
      Given Dustin also has resolved feedback "Old timer bug"
      When the agent calls "list_feedback"
      Then it returns "Bench press is missing the bp alias"
      And it does not return "Old timer bug"

    Scenario: Filtering feedback by status and category
      Given Dustin also has resolved feedback "Old timer bug"
      When the agent calls "list_feedback" for resolved bug feedback
      Then it returns "Old timer bug"
      And it does not return "Bench press is missing the bp alias"

    Scenario: Other users' feedback is never returned
      Given another user left new feedback "Someone else's idea"
      When the agent calls "list_feedback"
      Then it does not return "Someone else's idea"

    Scenario: Agents have no tool that changes feedback
      When the agent lists its tools
      Then it sees "list_feedback"
      And it sees no tool that updates, resolves or deletes feedback

  Rule: A proposal can say which feedback it addresses

    Scenario: Proposing a fix for feedback
      When the agent proposes adding the alias "bp" to "Barbell Bench Press" for that feedback
      Then a pending proposal exists that is linked to that feedback
      And the feedback is still new

    Scenario: Linking unknown or someone else's feedback is refused
      Given another user left new feedback "Someone else's idea"
      When the agent proposes a change linked to "Someone else's idea"
      Then the tool returns an error naming the field "feedbackId"
      And no proposal is created

    Scenario: Approving a linked proposal resolves the feedback
      Given a pending proposal for that feedback
      When Dustin approves it
      Then the feedback is resolved
      And the feedback's admin note mentions the proposal

    Scenario: Rejecting a linked proposal leaves the feedback open
      Given a pending proposal for that feedback
      When Dustin rejects it
      Then the feedback is still new
