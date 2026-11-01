Feature: User agent tokens
  Any user can connect their own agent with a token from Settings. Their
  agent's suggestions are reviewed in the app and never reach the admin's
  notification channels.
  Contract: initiatives/training-library/docs/spec.md ("TL5b User agent tokens and scoped notifications")

  Rule: Users manage their own tokens

    Scenario: Creating a token shows it once
      When a user creates an agent token named "Hermes"
      Then the token is shown once to copy
      And "Hermes" is listed in Agent access
      And reloading the page no longer shows the token

    Scenario: A token lets the agent in
      Given a user created an agent token
      When their agent connects to the MCP server with it
      Then it can read that user's training data

    Scenario: Revoking a token
      Given a user has an agent token "Hermes"
      When they revoke "Hermes"
      Then "Hermes" is listed as revoked
      And the agent can no longer connect with it

    Scenario: At most five active tokens
      Given a user has 5 active agent tokens
      When they try to create another
      Then it is refused because of the limit

    Scenario: Another user's token can't be revoked
      When a user revokes another user's token
      Then it is not found

    Scenario: The token itself is never listed
      Given a user has agent tokens
      When their tokens are listed
      Then no token value or hash is included

  Rule: Non-admin agents stay out of the exercise library

    Scenario: Exercise-library tools are hidden and refused
      Given a regular user's agent is connected
      When it lists the tools
      Then the exercise-library propose tools are not listed
      And calling one is refused as admin-only
      And no proposal is created

    Scenario: Other suggestions work
      Given a regular user's agent is connected
      When it proposes a saved workout
      Then the user sees it as a suggestion

  Rule: Only admin proposals notify

    Scenario: A regular user's suggestion sends no notification
      Given a regular user's agent is connected
      When it proposes a saved workout
      Then no Discord or Bark notification is sent

    Scenario: An admin's proposal still notifies
      Given an admin's agent is connected
      When it proposes a saved workout
      Then a notification is sent as before
