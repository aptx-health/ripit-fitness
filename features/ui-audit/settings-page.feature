Feature: Settings page
  Settings is grouped into folder blocks and renders on the server without errors.

  Scenario: Settings renders on the server
    Given I am signed in
    When I load "/settings" directly
    Then the server responds 200
    And no server error is logged

  Scenario: Settings is grouped into blocks
    Given I am signed in as a regular user
    When I open Settings
    Then I see the blocks "Look", "Workouts", "Training targets", "Account" and "Help" in that order
    And I do not see the "Admin" block

  Scenario: Admins and editors see the Admin block
    Given I am signed in as an editor
    When I open Settings
    Then I see the "Admin" block

  Scenario: Equipment is reachable from Settings
    Given I am signed in
    When I open Settings
    Then "Training targets" has rows for Muscle balance, Target movements, Equipment and Agent access
    And the Equipment row links to "/settings/equipment"

  Scenario: Settings still save
    Given I am signed in
    When I change my workout mode, intensity and rating type
    Then each change is saved and shown again after a reload

  Scenario: Theme and mode show their current value
    Given my theme is "Ripit" in dark mode
    When I open Settings
    Then the Theme row shows "Ripit" and the Mode row shows "Dark"
