Feature: Shared folder pieces
  Paper tabs, page titles and the PWA plumbing that the other screens will reuse.

  Scenario: Paper tabs are controlled by the page
    Given paper tabs for "Workouts" and "Programs" with "Workouts" selected by the page
    When I click "Programs"
    Then the page is told "Programs" was chosen
    And "Workouts" stays selected until the page changes its value

  Scenario: Paper tabs work from the keyboard
    Given paper tabs for "Workouts" and "Programs" with "Workouts" selected
    When I press Right Arrow on "Workouts"
    Then "Programs" is chosen and focused
    And only the selected tab is in the tab order

  Scenario: Paper tabs can end with a link tab
    Given paper tabs with a link tab "All suggestions" to "/suggestions"
    Then "All suggestions" is a link, not a tab, and is not part of the arrow-key order

  Scenario: Training's tabbed blocks behave as before
    Given the Training page's Workouts block
    When I choose "Recent"
    Then the Recent panel shows and the choice is remembered on this device

  Scenario: The service worker loads when signed out
    Given I am signed out
    When the browser requests "/sw.js" or "/site.webmanifest"
    Then it is served, not redirected to the login page

  Scenario: The installed app gets a solid status bar
    When the app's head is rendered
    Then the Apple status bar style is "default"
    And a theme colour is set for light and for dark
