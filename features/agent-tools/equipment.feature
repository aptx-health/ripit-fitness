Feature: Agents read the user's equipment
  An agent can see what equipment the user has, so it doesn't propose exercises they can't do.

  Scenario: The user has chosen their equipment
    Given my equipment is set to "Dumbbells" and "Resistance bands"
    When my agent calls get_equipment
    Then it gets exactly those items, using the same names as exercise definitions
    And it is told the list is my own selection

  Scenario: The user has never set their equipment
    Given I have no equipment record
    When my agent calls get_equipment
    Then it is told nothing has been set and the app assumes a full commercial gym
    And it gets the full-gym list the app uses in that case

  Scenario: The user owns almost nothing
    Given I set my equipment to nothing
    When my agent calls get_equipment
    Then it gets an empty list and is told that is my real selection

  Scenario: One user's equipment stays private
    Given another user has set their equipment
    When my agent calls get_equipment
    Then it only ever sees my equipment

  Scenario: The tool is read-only
    When an agent lists the tools
    Then get_equipment is marked read-only
