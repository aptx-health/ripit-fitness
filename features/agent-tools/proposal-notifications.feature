Feature: Dustin hears about new proposals on Discord
  A new agent proposal posts to the #proposals channel with a link to review it.
  Agent text is untrusted and must not ping anyone or break the message.
  Contract: initiatives/agent-tools/docs/spec.md ("Notifications")

  Scenario: A new proposal posts to the proposals channel
    Given the proposals webhook is configured
    When a proposal notification is sent
    Then one message is posted to the proposals webhook
    And the message links to the proposal's review page
    And the message shows the proposal's title and summary

  Scenario: Agent text cannot ping anyone
    Given the proposals webhook is configured
    When a proposal notification is sent whose summary contains "@everyone"
    Then the posted message allows no mentions

  Scenario: Long agent text is shortened
    Given the proposals webhook is configured
    When a proposal notification is sent with a 5000-character summary
    Then the posted summary fits within Discord's limits

  Scenario: No webhook configured
    Given the proposals webhook is not configured
    When a proposal notification is sent
    Then nothing is posted to Discord

  Scenario: Discord is down
    Given the proposals webhook is configured
    And Discord rejects the message
    When a proposal notification is sent
    Then the failure is logged and not thrown
