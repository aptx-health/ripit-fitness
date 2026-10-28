Feature: Agents export raw training data for their own analysis
  Agents in a sandbox can pull every logged set in a date range and analyse it
  with their own scripts: through MCP in pages, or as one CSV file over HTTP with
  the same agent token. Nothing is filtered or derived beyond the session rule.
  Contract: initiatives/agent-tools/docs/spec.md ("Training data export")

  Background:
    Given Dustin has an agent token named "sandbox"
    And the exercise library contains "Back Squat" and "Pull-up"

  Rule: The MCP tool returns raw rows in pages

    Scenario: Every set in the range, warmups included and flagged
      Given Dustin logged a "Back Squat" session with 2 warmup sets and 3 working sets in kg, and a "Pull-up" session at 0 weight
      When the agent calls "export_training_data" since the start of the month
      Then it returns 5 squat rows and the pull-up rows, in date, exercise and set order
      And the warmups have isWarmup true, and weights are as logged in kg

    Scenario: Large ranges come back in pages without gaps or repeats
      Given Dustin has 2500 logged sets this year
      When the agent pages through "export_training_data" with a limit of 1000
      Then it gets pages of 1000, 1000 and 500, and the last page has no next cursor
      And together they hold every set exactly once

    Scenario: The range and session rules are applied
      Given Dustin has sets before "since", on "since" and after "until", plus an archived workout, a draft and another user's workout
      When the agent calls "export_training_data" for that range
      Then only Dustin's completed and abandoned, unarchived sets from since up to until are returned

    Scenario: A bad range or cursor is refused
      When the agent calls "export_training_data" with "until" before "since"
      Then the tool returns an error naming the field "until"

  Rule: A script can download the same rows as CSV

    Scenario: Downloading a year as CSV
      Given Dustin logged sets this year
      When a script requests "/api/agent/export.csv" since January 1st with the sandbox token
      Then the response is a CSV attachment with the column header and one line per set, matching the MCP rows

    Scenario: No valid token, no data
      When a script requests "/api/agent/export.csv" with no token, or with a revoked token
      Then the response is 401

    Scenario: A range over 3 years is refused
      When a script requests "/api/agent/export.csv" for a 4-year range
      Then the response is 400 naming the field "since"

    Scenario: Text that looks like a formula is made safe
      Given Dustin named an ad-hoc workout "=HYPERLINK(1)"
      When a script downloads the CSV
      Then that workout name starts with a single quote
